// src/pages/MyLands.js
import { useState, useCallback, useEffect, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
} from "@react-google-maps/api";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import axios from "axios";
import API_URL from "../config";
import { useGate } from "../hooks/useGate";
import UpgradePopup from "../components/UpgradePopup";
import { incrementLandCount } from "../utils/updatePlan";
import { useLanguage } from "../context/LanguageContext";
import { usePopup } from "../context/PopupContext";
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY; // your key here
const LIBRARIES = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "380px",
  borderRadius: "10px",
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 };

const SOIL_TYPES = [
  "Black Soil",
  "Red Soil",
  "Alluvial Soil",
  "Sandy Soil",
  "Clayey Soil",
  "Laterite Soil",
  "Loamy Soil",
  "Silty Soil",
  "Peaty Soil",
  "Chalky Soil",
];

const LAND_STATUSES = ["Active", "Fallow", "In Use"];

function MyLands({ user }) {
  const { t, lang } = useLanguage();
  const { checkLandGate, showUpgrade, setShowUpgrade, blockedFeature } = useGate();
  const { showAlert, showConfirm } = usePopup();
  const [markerPos, setMarkerPos] = useState(defaultCenter);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [soilType, setSoilType] = useState("Black Soil");
  const [landSize, setLandSize] = useState("");
  const [landUnit, setLandUnit] = useState("cents");
  const [landName, setLandName] = useState("");
  const [landStatus, setLandStatus] = useState("Active");
  const [notes, setNotes] = useState("");
  const [weather, setWeather] = useState(null);
  const [lands, setLands] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [weatherFetched, setWeatherFetched] = useState(false);
  const [editingLand, setEditingLand] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const autocompleteService = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // Load lands on page open
  useEffect(() => {
    loadLands();
  }, []);

  // Initialize autocomplete service once maps loaded
  useEffect(() => {
    if (isLoaded) {
      autocompleteService.current =
        new window.google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  // Handle search input — fetch suggestions from Google Places
  const handleSearchInput = (value) => {
    setSearchInput(value);
    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }
    autocompleteService.current.getPlacePredictions(
      { input: value },
      (predictions, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          predictions
        ) {
          setSuggestions(predictions);
        } else {
          setSuggestions([]);
        }
      }
    );
  };

  // When user clicks a suggestion — geocode it and move the pin
  const handleSuggestionClick = (placeId, description) => {
    setSearchInput(description);
    setSuggestions([]);

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ placeId }, (results, status) => {
      if (status === "OK" && results[0]) {
        const location = results[0].geometry.location;
        const newPos = { lat: location.lat(), lng: location.lng() };
        setMarkerPos(newPos);
        setMapCenter(newPos);
        setWeather(null);
        setWeatherFetched(false);
      }
    });
  };

  // Map click moves pin
  const handleMapClick = useCallback((e) => {
    setMarkerPos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    setWeather(null);
    setWeatherFetched(false);
  }, []);

  // GPS detect location
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setMarkerPos(pos);
        setMapCenter(pos);
        setWeather(null);
        setWeatherFetched(false);
        setError("");
      },
      () => setError("Could not detect location. Allow location access.")
    );
  };

  // Fetch weather by coordinates
  const fetchWeather = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/weather-coords?lat=${markerPos.lat}&lng=${markerPos.lng}`
      );
      setWeather(res.data);
      setWeatherFetched(true);
    } catch (err) {
      setError("Could not fetch weather. Check your connection.");
    }
    setLoading(false);
  };

  // Refresh weather on a saved land card
  const refreshWeather = async (land) => {
    try {
      const res = await axios.get(
        `${API_URL}/weather-coords?lat=${land.latitude}&lng=${land.longitude}`
      );
      const updated = res.data;
      await updateDoc(doc(db, "lands", land.id), {
        temperature: updated.temperature,
        humidity: updated.humidity,
        description: updated.description,
        windSpeed: updated.wind_speed,
      });
      loadLands();
    } catch (err) {
      showAlert("Could not refresh weather.");
    }
  };

  // Save new land to Firestore
  const handleSaveLand = async () => {
    // Lifetime gate check — blocks spam workaround
    const allowed = await checkLandGate();
    if (!allowed) return;

    if (!landName) { setError("Please enter a land name."); return; }
    if (!landSize) { setError("Please enter land size."); return; }
    if (!weatherFetched) { setError("Please fetch weather first."); return; }

    setLoading(true);
    try {
      await addDoc(collection(db, "lands"), {
        userId: auth.currentUser.uid,
        landName,
        city: weather.city,
        soilType,
        landSize: parseFloat(landSize),
        landUnit,
        landStatus,
        notes,
        latitude: markerPos.lat,
        longitude: markerPos.lng,
        temperature: weather.temperature,
        humidity: weather.humidity,
        description: weather.description,
        windSpeed: weather.wind_speed,
        createdAt: new Date(),
      });

      // Increment lifetime counter AFTER successful save
      await incrementLandCount(auth.currentUser.uid);

      showAlert("Land saved successfully!");
      resetForm();
      loadLands();
      setShowAddForm(false);
    } catch (err) {
      setError("Could not save land. Try again.");
    }
    setLoading(false);
  };

  // Delete land
  const handleDelete = (landId) => {
    showConfirm("Are you sure you want to delete this land?", async () => {
      await deleteDoc(doc(db, "lands", landId));
      loadLands();
    });
  };

  // Start editing a land
  const handleEdit = (land) => {
    setEditingLand({ ...land });
  };

  // Save edited land
  const handleSaveEdit = async () => {
    if (!editingLand.landName) { showAlert("Land name is required."); return; }
    try {
      await updateDoc(doc(db, "lands", editingLand.id), {
        landName: editingLand.landName,
        soilType: editingLand.soilType,
        landSize: parseFloat(editingLand.landSize),
        landUnit: editingLand.landUnit,
        landStatus: editingLand.landStatus,
        notes: editingLand.notes,
      });
      setEditingLand(null);
      loadLands();
    } catch (err) {
      showAlert("Could not update land.");
    }
  };

  // Load all lands for this user
  const loadLands = async () => {
    const q = query(
      collection(db, "lands"),
      where("userId", "==", auth.currentUser.uid)
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setLands(results);
  };

  // Reset add form
  const resetForm = () => {
    setSearchInput("");
    setSuggestions([]);
    setLandName("");
    setSoilType("Black Soil");
    setLandSize("");
    setLandUnit("cents");
    setLandStatus("Active");
    setNotes("");
    setWeather(null);
    setWeatherFetched(false);
    setMarkerPos(defaultCenter);
    setMapCenter(defaultCenter);
    setError("");
  };

  // Mini map thumbnail URL for saved land cards
  const getMiniMapUrl = (lat, lng) => {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=300x150&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
  };

  // Status badge color
  const statusColor = (status) => {
    if (status === "Active") return "#2d6a4f";
    if (status === "Fallow") return "#e09f3e";
    if (status === "In Use") return "#1a6985";
    return "#888";
  };

  if (!isLoaded) return <p>Loading map...</p>;

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "800px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0 }}>🗺️ {t("lands_title")}</h2>
        <button onClick={() => { setShowAddForm(!showAddForm); resetForm(); }} style={styles.greenBtn}>
          {showAddForm ? `✖ ${t("lands_cancel")}` : `➕ ${t("lands_add_new")}`}
        </button>
      </div>

      {/* ── SAVED LANDS ── */}
      {lands.length === 0 && !showAddForm && (
        <div style={styles.emptyState}>
          <p>🌱 {t("lands_no_lands")}</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px", marginBottom: "30px" }}>
        {lands.map((land) => (
          <div key={land.id} style={styles.landCard}>
            {/* Edit Modal */}
            {editingLand?.id === land.id ? (
              <div>
                <h4 style={{ marginTop: 0 }}>✏️ {t("common_edit")}</h4>
                <input value={editingLand.landName} onChange={(e) => setEditingLand({ ...editingLand, landName: e.target.value })} placeholder={t("lands_land_name")} style={styles.input} />
                <select value={editingLand.soilType} onChange={(e) => setEditingLand({ ...editingLand, soilType: e.target.value })} style={styles.input}>
                  {SOIL_TYPES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input type="number" value={editingLand.landSize} onChange={(e) => setEditingLand({ ...editingLand, landSize: e.target.value })} placeholder={t("lands_land_size")} style={{ ...styles.input, flex: 1 }} />
                  <select value={editingLand.landUnit} onChange={(e) => setEditingLand({ ...editingLand, landUnit: e.target.value })} style={{ ...styles.input, flex: 1 }}>
                    <option value="cents">Cents</option>
                    <option value="acres">Acres</option>
                  </select>
                </div>
                <select value={editingLand.landStatus} onChange={(e) => setEditingLand({ ...editingLand, landStatus: e.target.value })} style={styles.input}>
                  {LAND_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <textarea value={editingLand.notes} onChange={(e) => setEditingLand({ ...editingLand, notes: e.target.value })} placeholder={t("lands_notes")} style={{ ...styles.input, height: "60px", resize: "vertical" }} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={handleSaveEdit} style={styles.greenBtn}>💾 {t("common_save")}</button>
                  <button onClick={() => setEditingLand(null)} style={styles.outlineBtn}>{t("common_cancel")}</button>
                </div>
              </div>
            ) : (
              <>
                {/* Mini map thumbnail */}
                <img
                  src={getMiniMapUrl(land.latitude, land.longitude)}
                  alt="land location"
                  style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "8px", marginBottom: "10px" }}
                />
                {/* Status badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "16px" }}>🏷️ {land.landName}</strong>
                  <span style={{ background: statusColor(land.landStatus), color: "white", padding: "2px 10px", borderRadius: "20px", fontSize: "12px" }}>
                    {land.landStatus}
                  </span>
                </div>
                <p style={styles.cardText}>📍 {land.city}</p>
                <p style={styles.cardText}>🪨 {land.soilType} | 📐 {land.landSize} {land.landUnit}</p>
                <p style={styles.cardText}>🌡 {land.temperature}°C | 💧 {land.humidity}% | ☁ {land.description}</p>
                {land.notes && <p style={{ ...styles.cardText, color: "#888", fontStyle: "italic" }}>📝 {land.notes}</p>}
                <p style={{ fontSize: "11px", color: "#aaa" }}>Lat: {land.latitude?.toFixed(4)}, Lng: {land.longitude?.toFixed(4)}</p>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                  <button onClick={() => refreshWeather(land)} style={styles.smallBtn}>🔄 {t("lands_refresh_weather")}</button>
                  <button onClick={() => handleEdit(land)} style={styles.smallBtn}>✏️ {t("common_edit")}</button>
                  <button onClick={() => handleDelete(land.id)} style={styles.dangerBtn}>🗑️ {t("common_delete")}</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── ADD NEW LAND FORM ── */}
      {showAddForm && (
        <div style={styles.formSection}>
          <h3 style={{ marginTop: 0 }}>➕ {t("lands_add_new")}</h3>

          {/* Step 1 — Location */}
          <div style={styles.stepBox}>
            <h4 style={styles.stepTitle}>{t("lands_step1")}</h4>

            <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
              <button onClick={detectLocation} style={styles.greenBtn}>📍 {t("lands_detect")}</button>
            </div>

            {/* Search with autocomplete */}
            <div style={{ position: "relative", marginBottom: "12px" }}>
              <input
                type="text"
                placeholder={t("lands_search")}
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                style={styles.input}
              />
              {suggestions.length > 0 && (
                <div style={styles.suggestionBox}>
                  {suggestions.map((s) => (
                    <div
                      key={s.place_id}
                      onClick={() => handleSuggestionClick(s.place_id, s.description)}
                      style={styles.suggestionItem}
                      onMouseEnter={(e) => e.target.style.background = "#f0f7f4"}
                      onMouseLeave={(e) => e.target.style.background = "white"}
                    >
                      📍 {s.description}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Google Map */}
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={12}
              onClick={handleMapClick}
            >
              <Marker position={markerPos} />
            </GoogleMap>

            <p style={{ fontSize: "13px", color: "#666", marginTop: "6px" }}>
              📌 {t("lands_pinned")}: {markerPos.lat.toFixed(5)}, {markerPos.lng.toFixed(5)}
            </p>
          </div>

          {/* Step 2 — Land Details */}
          <div style={styles.stepBox}>
            <h4 style={styles.stepTitle}>{t("lands_step2")}</h4>

            <label style={styles.label}>{t("lands_land_name")} *</label>
            <input
              type="text"
              placeholder={t("lands_land_name_ph")}
              value={landName}
              onChange={(e) => setLandName(e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>{t("lands_soil_type")} *</label>
            <select value={soilType} onChange={(e) => setSoilType(e.target.value)} style={styles.input}>
              {SOIL_TYPES.map((s) => <option key={s}>{s}</option>)}
            </select>

            <label style={styles.label}>{t("lands_land_size")} *</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="number"
                placeholder="e.g. 30"
                value={landSize}
                onChange={(e) => setLandSize(e.target.value)}
                style={{ ...styles.input, flex: 2 }}
                min="0"
              />
              <select value={landUnit} onChange={(e) => setLandUnit(e.target.value)} style={{ ...styles.input, flex: 1 }}>
                <option value="cents">Cents</option>
                <option value="acres">Acres</option>
              </select>
            </div>

            <label style={styles.label}>{t("lands_land_status")}</label>
            <select value={landStatus} onChange={(e) => setLandStatus(e.target.value)} style={styles.input}>
              {LAND_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>

            <label style={styles.label}>{t("lands_notes")}</label>
            <textarea
              placeholder={t("lands_notes_ph")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...styles.input, height: "70px", resize: "vertical" }}
            />
          </div>

          {/* Step 3 — Fetch Weather */}
          <div style={styles.stepBox}>
            <h4 style={styles.stepTitle}>{t("lands_step3")}</h4>
            {error && <p style={{ color: "red", marginBottom: "10px" }}>{error}</p>}

            <button onClick={fetchWeather} disabled={loading} style={styles.greenBtn}>
              {loading ? t("lands_fetching") : `🌤 ${t("lands_fetch_weather")}`}
            </button>

            {weather && (
              <div style={styles.weatherCard}>
                <p style={{ fontWeight: "bold", marginBottom: "8px" }}>✅ Weather fetched for {weather.city}</p>
                <p style={styles.cardText}>🌡 Temperature: {weather.temperature}°C</p>
                <p style={styles.cardText}>💧 Humidity: {weather.humidity}%</p>
                <p style={styles.cardText}>🌬 Wind Speed: {weather.wind_speed} m/s</p>
                <p style={styles.cardText}>☁ Condition: {weather.description}</p>
              </div>
            )}
          </div>

          {/* Step 4 — Save */}
          <div style={styles.stepBox}>
            <h4 style={styles.stepTitle}>{t("lands_step4")}</h4>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "10px" }}>
              {t("lands_save_note")}
            </p>
            <button
              onClick={handleSaveLand}
              disabled={loading || !weatherFetched}
              style={{
                ...styles.greenBtn,
                opacity: weatherFetched ? 1 : 0.5,
                cursor: weatherFetched ? "pointer" : "not-allowed",
              }}
            >
              💾 {t("lands_save")}
            </button>
          </div>
        </div>
      )}

      {showUpgrade && (
        <UpgradePopup
          feature={blockedFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}

const styles = {
  input: {
    display: "block",
    width: "100%",
    marginBottom: "10px",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "14px",
    boxSizing: "border-box",
    fontFamily: "sans-serif",
  },
  label: {
    display: "block",
    fontWeight: "bold",
    marginBottom: "4px",
    fontSize: "13px",
    color: "#444",
  },
  greenBtn: {
    background: "#2d6a4f",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    marginBottom: "10px",
  },
  outlineBtn: {
    background: "white",
    color: "#2d6a4f",
    border: "1px solid #2d6a4f",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  smallBtn: {
    background: "#f0f7f4",
    color: "#2d6a4f",
    border: "1px solid #b7e4c7",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },
  dangerBtn: {
    background: "#fff5f5",
    color: "#c0392b",
    border: "1px solid #f5c6cb",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },
  landCard: {
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "14px",
    background: "white",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  cardText: {
    margin: "4px 0",
    fontSize: "13px",
    color: "#444",
  },
  weatherCard: {
    marginTop: "12px",
    padding: "14px",
    background: "#f0f8ff",
    borderRadius: "8px",
    border: "1px solid #b8d8f0",
  },
  formSection: {
    background: "#fafafa",
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    padding: "24px",
  },
  stepBox: {
    marginBottom: "20px",
    padding: "16px",
    background: "white",
    borderRadius: "8px",
    border: "1px solid #eee",
  },
  stepTitle: {
    margin: "0 0 14px 0",
    color: "#2d6a4f",
    fontSize: "15px",
  },
  suggestionBox: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "white",
    border: "1px solid #ddd",
    borderRadius: "6px",
    zIndex: 1000,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    maxHeight: "200px",
    overflowY: "auto",
  },
  suggestionItem: {
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "13px",
    borderBottom: "1px solid #f0f0f0",
    background: "white",
    transition: "background 0.15s",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px",
    background: "#f9f9f9",
    borderRadius: "10px",
    color: "#888",
    marginBottom: "20px",
  },
};

export default MyLands;
