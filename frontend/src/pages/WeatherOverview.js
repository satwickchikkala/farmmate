// src/pages/WeatherOverview.js
import { useState, useEffect } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { db, auth } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import axios from "axios";
import API_URL from "../config";
import { useLanguage } from "../context/LanguageContext";

const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";

const weatherIcon = (desc = "") => {
  const d = desc.toLowerCase();
  if (d.includes("rain") || d.includes("drizzle")) return "🌧";
  if (d.includes("cloud")) return "⛅";
  if (d.includes("clear") || d.includes("sunny")) return "☀️";
  if (d.includes("storm") || d.includes("thunder")) return "⛈";
  if (d.includes("snow")) return "❄️";
  if (d.includes("mist") || d.includes("fog")) return "🌫";
  return "🌤";
};

const getAlerts = (weather) => {
  if (!weather) return [];
  const alerts = [];
  if (weather.temperature > 38) alerts.push({ msg: "Extreme heat! Avoid outdoor work 11am–3pm", type: "danger" });
  if (weather.temperature < 10) alerts.push({ msg: "Cold weather! Protect sensitive crops from frost", type: "warning" });
  if (weather.humidity > 90) alerts.push({ msg: "Very high humidity — watch for fungal diseases", type: "warning" });
  if (weather.wind_speed > 10) alerts.push({ msg: "Strong winds! Secure young plants and saplings", type: "danger" });
  return alerts;
};

function WeatherOverview() {
  const { t, lang } = useLanguage();
  const [lands, setLands] = useState([]);
  const [selectedLand, setSelectedLand] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [historicalWeather, setHistoricalWeather] = useState(null);
  const [allWeathers, setAllWeathers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadLands(); }, []);

  const loadLands = async () => {
    try {
      const q = query(collection(db, "lands"), where("userId", "==", auth.currentUser.uid));
      const snap = await getDocs(q);
      const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLands(results);
      if (results.length > 0) {
        setSelectedLand(results[0]);
        fetchWeather(results[0]);
        fetchAllWeathers(results);
      }
    } catch (err) {
      console.error("Error loading lands:", err);
    }
  };

  const fetchWeather = async (land) => {
    setLoading(true); setError("");
    try {
      const [wres, fres, hres] = await Promise.all([
        axios.get(`${API_URL}/weather-coords?lat=${land.latitude}&lng=${land.longitude}`),
        axios.get(`${API_URL}/weather-forecast?lat=${land.latitude}&lng=${land.longitude}`),
        axios.get(`${API_URL}/weather-historical?lat=${land.latitude}&lng=${land.longitude}`).catch(() => ({ data: null }))
      ]);
      setCurrentWeather(wres.data);
      setForecast(fres.data);
      setHistoricalWeather(hres.data);
    } catch (err) {
      console.error("Error fetching weather:", err);
      setError("Could not fetch weather data.");
    }
    setLoading(false);
  };

  const fetchAllWeathers = async (landList) => {
    const results = await Promise.all(landList.map(async land => {
      try {
        const res = await axios.get(`${API_URL}/weather-coords?lat=${land.latitude}&lng=${land.longitude}`);
        return { ...land, weather: res.data };
      } catch {
        return { ...land, weather: null };
      }
    }));
    setAllWeathers(results);
  };

  const handleSelectLand = (land) => {
    setSelectedLand(land);
    fetchWeather(land);
  };

  return (
    <div style={{ fontFamily: FONT, width: "100%", background: "#f7faf8", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap');
        .weather-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 32px; align-items: start; }
        .lands-scroll { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-bottom: 28px; }
        
        @media (max-width: 900px) {
          .weather-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .lands-scroll { display: flex !important; overflow-x: auto; padding-bottom: 10px; }
          .lands-scroll > div { min-width: 130px; }
          .forecast-desc-text { display: none; }
        }
      `}</style>

      <div style={{ padding: "32px var(--page-px)" }}>
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "32px", color: DARK, margin: "0 0 4px 0" }}>🌤 {t("weather_title")}</h2>
          <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>{t("weather_subtitle")}</p>
        </div>

        {/* All lands quick cards */}
        {lands.length > 0 ? (
          <div className="lands-scroll">
            {allWeathers.map(land => (
              <div key={land.id} onClick={() => handleSelectLand(land)}
                style={{ padding: "16px", borderRadius: "12px", border: `2px solid ${selectedLand?.id === land.id ? GREEN : "#e5e7eb"}`, background: selectedLand?.id === land.id ? "#f0f7f4" : "white", cursor: "pointer", textAlign: "center", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <strong style={{ fontSize: "13px", color: DARK, display: "block", marginBottom: "4px" }}>{land.landName}</strong>
                {land.weather ? (
                  <>
                    <div style={{ fontSize: "28px", margin: "4px 0" }}>{weatherIcon(land.weather.description)}</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: GREEN }}>{land.weather.temperature}°C</div>
                  </>
                ) : <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "10px" }}>{t("weather_loading")}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "16px", border: "1px solid #e5e7eb", color: "#9ca3af", marginBottom: "32px" }}>
            {t("weather_no_lands")}
          </div>
        )}

        {loading && !currentWeather && <LoadingSpinner fullPage={false} message={t("lands_fetching")} />}
        {error && <div style={{ padding: "20px", background: "#fee2e2", color: "#dc2626", borderRadius: "12px", marginBottom: "20px" }}>⚠️ {error}</div>}

        {!loading && selectedLand && currentWeather && (
          <div className="weather-grid">
            {/* Left: Current Weather */}
            <div style={{ background: "white", borderRadius: "20px", padding: "32px", border: "1px solid #e5e7eb", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "24px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "20px", color: DARK, fontFamily: "Playfair Display, serif" }}>{selectedLand.landName}</h3>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>{currentWeather.city}</p>
                </div>
                <div style={{ fontSize: "56px" }}>{weatherIcon(currentWeather.description)}</div>
              </div>

              <div style={{ fontSize: "64px", fontWeight: "700", color: GREEN, marginBottom: "8px", fontFamily: "Playfair Display, serif" }}>
                {currentWeather.temperature}°C
              </div>
              <p style={{ margin: "0 0 24px 0", color: "#374151", fontSize: "16px", fontWeight: "500", textTransform: "capitalize" }}>
                {currentWeather.description}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "12px" }}>
                  <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>💧 {t("weather_humidity")}</div>
                  <div style={{ fontWeight: "600", color: DARK }}>{currentWeather.humidity}%</div>
                </div>
                <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "12px" }}>
                  <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>🌬 {t("weather_wind")}</div>
                  <div style={{ fontWeight: "600", color: DARK }}>{currentWeather.wind_speed} m/s</div>
                </div>
              </div>

              {/* Alerts */}
              {getAlerts(currentWeather).length > 0 && (
                <div style={{ marginTop: "24px" }}>
                  {getAlerts(currentWeather).map((a, i) => (
                    <div key={i} style={{ background: a.type === "danger" ? "#fee2e2" : "#fef3c7", color: a.type === "danger" ? "#b91c1c" : "#92400e", padding: "12px 16px", borderRadius: "10px", fontSize: "13px", marginBottom: "8px", border: `1px solid ${a.type === "danger" ? "#fecaca" : "#fde68a"}` }}>
                      ⚠️ {a.msg}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Forecast & Historical */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ background: "white", borderRadius: "20px", padding: "32px", border: "1px solid #e5e7eb", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                <h3 style={{ margin: "0 0 24px 0", fontSize: "20px", color: DARK, fontFamily: "Playfair Display, serif" }}>📅 {t("weather_forecast")}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {forecast.slice(0, 7).map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderRadius: "14px", background: i === 0 ? "#f0f7f4" : "transparent", border: i === 0 ? `1px solid ${GREEN}` : "1px solid #f3f4f6" }}>
                      <div style={{ width: "110px", fontSize: "14px", fontWeight: "600", color: DARK }}>
                        {i === 0 ? t("weather_today") : new Date(f.date + 'T00:00:00').toLocaleDateString(lang === "en" ? "en-IN" : "hi-IN", { weekday: "short", day: "numeric" })}
                      </div>
                      <div style={{ fontSize: "28px" }}>{weatherIcon(f.day_condition || f.description)}</div>
                      <div style={{ width: "80px", textAlign: "right", fontWeight: "700", color: GREEN }}>{Math.round(f.max_temp)}°C</div>
                      <div style={{ width: "130px", fontSize: "13px", color: "#6b7280", textAlign: "right", textTransform: "capitalize" }} className="forecast-desc-text">
                        {f.day_condition || f.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historical Weather */}
              {historicalWeather && !historicalWeather.error && (
                <div style={{ background: "white", borderRadius: "20px", padding: "32px", border: "1px solid #e5e7eb", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                  <h3 style={{ margin: "0 0 24px 0", fontSize: "20px", color: DARK, fontFamily: "Playfair Display, serif" }}>📊 {t("weather_historical_title")}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "12px", textAlign: "center" }}>
                      <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>🌡️ {t("weather_avg_max_temp")}</div>
                      <div style={{ fontWeight: "700", color: "#ef4444", fontSize: "20px" }}>{historicalWeather.avg_max_temp}°C</div>
                    </div>
                    <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "12px", textAlign: "center" }}>
                      <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>❄️ {t("weather_avg_min_temp")}</div>
                      <div style={{ fontWeight: "700", color: "#3b82f6", fontSize: "20px" }}>{historicalWeather.avg_min_temp}°C</div>
                    </div>
                    <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "12px", textAlign: "center", gridColumn: "span 2" }}>
                      <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>🌧️ {t("weather_total_rainfall")}</div>
                      <div style={{ fontWeight: "700", color: "#0ea5e9", fontSize: "24px" }}>{historicalWeather.total_precipitation} mm</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WeatherOverview;