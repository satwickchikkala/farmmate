// src/pages/WeatherOverview.js
import { useState, useEffect } from "react";
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
  const [allWeathers, setAllWeathers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadLands(); }, []);

  const loadLands = async () => {
    const q = query(collection(db, "lands"), where("userId", "==", auth.currentUser.uid));
    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setLands(results);
    if (results.length > 0) { setSelectedLand(results[0]); fetchWeather(results[0]); fetchAllWeathers(results); }
  };

  const fetchWeather = async (land) => {
    setLoading(true); setError("");
    try {
      const [wres, fres] = await Promise.all([
        axios.get(`${API_URL}/weather-coords?lat=${land.latitude}&lng=${land.longitude}`),
        axios.get(`${API_URL}/weather-forecast?lat=${land.latitude}&lng=${land.longitude}`)
      ]);
      setCurrentWeather(wres.data);
      setForecast(fres.data);
    } catch { setError("Could not fetch weather data."); }
    setLoading(false);
  };

  const fetchAllWeathers = async (landList) => {
    const results = await Promise.all(landList.map(async land => {
      try { const res = await axios.get(`${process.env.REACT_APP_API_URL}/weather-coords?lat=${land.latitude}&lng=${land.longitude}`); return { ...land, weather: res.data }; }
      catch { return { ...land, weather: null }; }
    }));
    setAllWeathers(results);
  };

  const handleSelectLand = (land) => { setSelectedLand(land); fetchWeather(land); };

  return (
    <div style={{ fontFamily: FONT, width: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap');
        .weather-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; align-items: start; }
        .lands-scroll { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-bottom: 28px; }
        
        @media (max-width: 900px) {
          .weather-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .lands-scroll { display: flex !important; overflow-x: auto; padding-bottom: 10px; }
          .lands-scroll > div { min-width: 130px; }
          .forecast-desc { display: none; }
        }
      `}</style>

            {t("weather_no_lands")}
          </div>
        )}
      </div>

      {selectedLand && (
        <>
          {/* Alerts */}
          {currentWeather && getAlerts(currentWeather).map((alert, i) => (
            <div key={i} style={{ padding: "12px 16px", borderRadius: "10px", border: `1px solid ${alert.type === "danger" ? "#fecaca" : "#fde68a"}`, background: alert.type === "danger" ? "#fff5f5" : "#fffbeb", fontSize: "13px", fontWeight: "600", color: alert.type === "danger" ? "#dc2626" : "#d97706", marginBottom: "10px" }}>
              {alert.type === "danger" ? "🚨" : "⚠️"} {alert.msg}
            </div>
          ))}

          {loading && <p style={{ color: "#6b7280" }}>⏳ {t("weather_fetching")}</p>}
          {error && <p style={{ color: "#dc2626" }}>⚠️ {error}</p>}

          {currentWeather && !loading && (
            <div className="weather-grid">
              {/* Current weather big card */}
              <div style={{ background: `linear-gradient(135deg, ${DARK}, ${GREEN})`, borderRadius: "16px", padding: "28px", color: "white", textAlign: "center" }}>
                <p style={{ margin: "0 0 4px 0", fontSize: "13px", opacity: 0.7 }}>📍 {selectedLand.landName}</p>
                <p style={{ margin: "0 0 12px 0", fontSize: "12px", opacity: 0.5 }}>{currentWeather.city}</p>
                <div style={{ fontSize: "56px", margin: "8px 0" }}>{weatherIcon(currentWeather.description)}</div>
                <div style={{ fontSize: "48px", fontWeight: "700", fontFamily: "Playfair Display, serif", margin: "4px 0" }}>{Math.round(currentWeather.temperature)}°C</div>
                <p style={{ margin: "4px 0 20px 0", fontSize: "14px", opacity: 0.8, textTransform: "capitalize" }}>{currentWeather.description}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {[[`💧 ${t("weather_humidity")}`, `${currentWeather.humidity}%`], [`🌬 ${t("weather_wind")}`, `${currentWeather.wind_speed} m/s`]].map(([l, v], i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px" }}>
                      <div style={{ fontSize: "12px", opacity: 0.7 }}>{l}</div>
                      <div style={{ fontSize: "16px", fontWeight: "700" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7-day forecast */}
              <div>
                <h3 style={{ fontFamily: "Playfair Display, serif", color: DARK, margin: "0 0 16px 0", fontSize: "20px" }}>📅 {t("weather_forecast")}</h3>
                {forecast.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {forecast.slice(0, 7).map((day, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px 16px", background: "white", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                        <div style={{ width: "80px", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                          {i === 0 ? t("weather_today") : new Date(day.date + 'T00:00:00').toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}
                        </div>
                        <div style={{ fontSize: "24px" }}>{weatherIcon(day.day_condition)}</div>
                        <div style={{ flex: 1, fontSize: "13px", color: "#6b7280", textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{day.day_condition}</div>
                        {day.precipitation_chance > 30 && (
                          <div style={{ fontSize: "10px", color: "#1a6985", background: "#f0f8ff", padding: "2px 6px", borderRadius: "6px" }}>🌧 {day.precipitation_chance}%</div>
                        )}
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <span style={{ fontSize: "13px", fontWeight: "700", color: "#dc2626" }}>{Math.round(day.max_temp)}°</span>
                          <span style={{ fontSize: "13px", color: "#93c5fd" }}>{Math.round(day.min_temp)}°</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color: "#9ca3af" }}>Forecast not available.</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default WeatherOverview;