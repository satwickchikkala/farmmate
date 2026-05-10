import API_URL from "../config";
// src/pages/CropRec.js
import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection, getDocs, query, where,
  addDoc, deleteDoc, updateDoc, doc
} from "firebase/firestore";
import axios from "axios";

import UpgradePopup from "../components/UpgradePopup";
import { trackUsage } from "../utils/trackUsage";
import { useLanguage } from "../context/LanguageContext";
import { usePopup } from "../context/PopupContext";
import { useGate } from "../hooks/useGate";

const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";

const SOIL_DEFAULTS = {
  "Black Soil":    { N: 80, P: 48, K: 40, ph: 7.2 },
  "Red Soil":      { N: 50, P: 30, K: 35, ph: 6.2 },
  "Alluvial Soil": { N: 90, P: 55, K: 50, ph: 7.0 },
  "Sandy Soil":    { N: 30, P: 20, K: 25, ph: 6.0 },
  "Clayey Soil":   { N: 70, P: 45, K: 60, ph: 6.8 },
  "Laterite Soil": { N: 40, P: 25, K: 30, ph: 5.5 },
  "Loamy Soil":    { N: 85, P: 50, K: 45, ph: 6.8 },
  "Silty Soil":    { N: 75, P: 42, K: 40, ph: 6.5 },
  "Peaty Soil":    { N: 95, P: 35, K: 30, ph: 5.0 },
  "Chalky Soil":   { N: 45, P: 28, K: 35, ph: 8.0 },
};

const TYPE_COLORS = {
  sowing: "#2d6a4f", watering: "#1a6985", fertilizing: "#e09f3e",
  weeding: "#6b4f2a", pest_control: "#c0392b", monitoring: "#8e44ad", harvesting: "#e67e22",
};

const TABS = [
  { id: "new", label: "New Crop", icon: "➕" },
  { id: "active", label: "Active", icon: "🌱" },
  { id: "archived", label: "Archives", icon: "📦" },
];

function CropRec() {

  const { t, lang } = useLanguage();
  const { showAlert, showConfirm } = usePopup();
  const { plan, checkGate, showUpgrade, setShowUpgrade, blockedFeature } = useGate();

  const [tab, setTab] = useState("new");
  const [lands, setLands] = useState([]);
  const [activeLandIds, setActiveLandIds] = useState([]);
  const [activeTimelines, setActiveTimelines] = useState([]);
  const [archivedTimelines, setArchivedTimelines] = useState([]);
  const [selectedLand, setSelectedLand] = useState(null);
  const [soilValues, setSoilValues] = useState({ N: "", P: "", K: "", ph: "" });
  const [rainfall, setRainfall] = useState("");
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [timeline, setTimeline] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [recLocked, setRecLocked] = useState(false);
  const [timelineLocked, setTimelineLocked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const uid = auth.currentUser.uid;
    const lsnap = await getDocs(query(collection(db, "lands"), where("userId", "==", uid)));
    const landResults = lsnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setLands(landResults);

    const tsnap = await getDocs(query(collection(db, "timelines"), where("userId", "==", uid), where("status", "==", "active")));
    const activeResults = tsnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setActiveTimelines(activeResults);

    const asnap = await getDocs(query(collection(db, "timelines"), where("userId", "==", uid), where("status", "==", "archived")));
    const archivedResults = asnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setArchivedTimelines(archivedResults);

    const lockedIds = activeResults.map(t => t.landId);
    setActiveLandIds(lockedIds);

    const firstUnlocked = landResults.find(l => !lockedIds.includes(l.id));
    if (firstUnlocked) selectLand(firstUnlocked, lockedIds);
  };

  const selectLand = (land, lockedIds = activeLandIds) => {
    if (lockedIds.includes(land.id)) return;
    setSelectedLand(land);
    setSoilValues(SOIL_DEFAULTS[land.soilType] || SOIL_DEFAULTS["Loamy Soil"]);
    setCrops([]); setSelectedCrop(null); setTimeline(null); setStep(1); setError("");
  };

  const getDaysRemaining = (landId) => {
    const t = activeTimelines.find(t => t.landId === landId);
    if (!t) return 0;
    return Math.max(0, Math.ceil((new Date(t.harvestDate) - new Date()) / (1000 * 60 * 60 * 24)));
  };

  const getActiveTimeline = (landId) => activeTimelines.find(t => t.landId === landId);

  const handleGetRecommendations = async () => {
    if (recLocked) return;
    setError("");
    if (!rainfall) { setError("Please enter estimated rainfall."); return; }
    setLoading(true);
    setLoadingText("Analysing the data...");
    await new Promise(r => setTimeout(r, 2000));
    setLoadingText("Getting the predictions...");
    await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await axios.post(`${API_URL}/recommend-crops`, {
        landName: selectedLand.landName, soilType: selectedLand.soilType,
        temperature: selectedLand.temperature, humidity: selectedLand.humidity,
        rainfall: parseFloat(rainfall), N: parseFloat(soilValues.N),
        P: parseFloat(soilValues.P), K: parseFloat(soilValues.K),
        ph: parseFloat(soilValues.ph), city: selectedLand.city,
        language: lang,
      });
      await trackUsage(
        auth.currentUser.uid,
        "cropRec",
        selectedLand.id,
        selectedLand.isPayg === true
      );
      setCrops(res.data.crops); setStep(2);
      setRecLocked(true);
      setTimeout(() => setRecLocked(false), 5 * 60 * 1000);
    } catch { setError("Could not get recommendations. Try again."); }
    setLoading(false);
  };

  const handleGenerateTimeline = async () => {
    if (timelineLocked) return;
    setError("");
    if (!startDate) { setError("Please select a start date."); return; }
    
    setLoading(true);
    setLoadingText("Analysing the data...");
    await new Promise(r => setTimeout(r, 2000));
    setLoadingText("Getting the predictions...");
    await new Promise(r => setTimeout(r, 2000));

    try {
      const res = await axios.post(`${API_URL}/generate-timeline`, {
        crop: selectedCrop.name, startDate, soilType: selectedLand.soilType,
        temperature: selectedLand.temperature, humidity: selectedLand.humidity,
        city: selectedLand.city, landName: selectedLand.landName,
        landSize: selectedLand.landSize, landUnit: selectedLand.landUnit,
        language: lang,
      });
      await trackUsage(
        auth.currentUser.uid,
        "timeline",
        selectedLand.id,
        selectedLand.isPayg === true
      );
      setTimeline(res.data); setStep(3);
      setTimelineLocked(true);
      setTimeout(() => setTimelineLocked(false), 2 * 60 * 1000);
    } catch { setError("Could not generate timeline. Try again."); }
    setLoading(false);
  };

  const handleSaveTimeline = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "timelines"), {
        userId: auth.currentUser.uid, landId: selectedLand.id,
        landName: selectedLand.landName, crop: timeline.crop, startDate,
        harvestDate: timeline.harvestDate, totalDays: timeline.totalDays,
        summary: timeline.summary, expectedYield: timeline.expectedYield,
        tasks: timeline.tasks.map(t => ({ ...t, completed: false, notes: "" })),
        status: "active", createdAt: new Date(),
      });
      showAlert(`✅ ${timeline.crop} timeline saved!`);
      setCrops([]); setSelectedCrop(null); setTimeline(null); setStep(1); setRainfall("");
      loadData();
    } catch { setError("Could not save timeline."); }
    setLoading(false);
  };

  const handleDeleteTimeline = (timelineId, cropName) => {
    showConfirm(
      `Do you want to archive "${cropName}"?`,
      async () => {
        await updateDoc(doc(db, "timelines", timelineId), { status: "archived" });
        showAlert("Timeline archived successfully.");
        loadData();
      },
      () => {
        showConfirm(
          "⚠️ Permanently delete this timeline? This cannot be undone.",
          async () => {
            await deleteDoc(doc(db, "timelines", timelineId));
            showAlert("Timeline deleted.");
            loadData();
          },
          null,
          "Delete Timeline",
          "Delete",
          "Cancel"
        );
      },
      "Archive or Delete",
      "Archive",
      "Delete"
    );
  };

  const handleRestoreTimeline = async (timelineId) => {
    await updateDoc(doc(db, "timelines", timelineId), { status: "active" });
    showAlert("Timeline restored to active!");
    loadData();
  };

  const handlePermanentDelete = (timelineId, cropName) => {
    showConfirm(`Permanently delete "${cropName}" from archives? This cannot be undone.`, async () => {
      await deleteDoc(doc(db, "timelines", timelineId));
      loadData();
    });
  };

  const TimelineCard = ({ tl, showArchiveActions = false }) => {
    const completed = tl.tasks?.filter(tk => tk.completed).length || 0;
    const totalTasks = tl.tasks?.length || 0;
    const progress = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
    const daysLeft = Math.max(0, Math.ceil((new Date(tl.harvestDate) - new Date()) / (1000 * 60 * 60 * 24)));

    return (
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", opacity: showArchiveActions ? 0.9 : 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <h3 style={{ margin: 0, color: DARK, fontSize: "18px", fontFamily: "Playfair Display, serif" }}>🌾 {tl.crop}</h3>
              {showArchiveActions && <span style={{ background: "#f3f4f6", color: "#6b7280", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600" }}>{t("crop_archived")}</span>}
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>🗺️ {tl.landName} • 📅 {tl.startDate} → {tl.harvestDate}</p>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {showArchiveActions ? (
              <>
                <button onClick={() => handleRestoreTimeline(tl.id)} style={{ ...S.smallBtn, background: "#f0f7f4", color: GREEN, borderColor: "#b7e4c7" }}>↩️ {t("crop_restore")}</button>
                <button onClick={() => handlePermanentDelete(tl.id, tl.crop)} style={{ ...S.smallBtn, background: "#fff5f5", color: "#dc2626", borderColor: "#fecaca" }}>🗑️ {t("common_delete")}</button>
              </>
            ) : (
              <button onClick={() => handleDeleteTimeline(tl.id, tl.crop)} style={{ ...S.smallBtn, background: "#fff5f5", color: "#dc2626", borderColor: "#fecaca" }}>🗑️ {t("crop_remove")}</button>
            )}
          </div>
        </div>

        {!showArchiveActions && (
          <>
            <div style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginBottom: "5px" }}>
                <span>{t("crop_progress")}: {progress}%</span><span>{daysLeft} {t("crop_days_remaining")}</span>
              </div>
              <div style={{ background: "#e5e7eb", borderRadius: "8px", height: "8px" }}>
                <div style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${GREEN}, #52b788)`, height: "8px", borderRadius: "8px", transition: "width 1s" }} />
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "6px 0 0 0" }}>✅ {completed}/{tl.tasks?.length || 0} {t("crop_tasks_completed")}</p>
          </>
        )}

        {showArchiveActions && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#6b7280", background: "#f9f9f9", borderRadius: "8px", padding: "10px 12px" }}>
            <span>📋 {tl.tasks?.length || 0} tasks</span>
            <span>✅ {tl.tasks?.filter(tk => tk.completed).length || 0} completed</span>
            <span>📅 {tl.totalDays} days</span>
          </div>
        )}

        {tl.expectedYield && (
          <div style={{ background: "#fff8f0", border: "1px solid #fde8c8", borderRadius: "8px", padding: "10px 14px", marginTop: "10px" }}>
            <span style={{ fontWeight: "600", color: "#e67e22", fontSize: "13px" }}>🌾 Expected: </span>
            <span style={{ color: GREEN, fontWeight: "700" }}>{tl.expectedYield.min}–{tl.expectedYield.max} {tl.expectedYield.unit}</span>
            <span style={{ color: "#9ca3af", fontSize: "12px" }}> • {tl.expectedYield.notes}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: FONT, width: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap');
        .cr-tab.active { background: ${GREEN} !important; color: white !important; }
        .cr-tab:hover { background: #f0f7f4 !important; }
        .land-card:hover { border-color: ${GREEN} !important; }
        .crop-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; }
        
        @media (min-width: 901px) {
          .cr-new-container { grid-template-columns: 350px 1fr !important; gap: 40px !important; }
          .cr-grid { grid-template-columns: repeat(auto-fill, minmax(min(400px, 100%), 1fr)) !important; gap: 24px !important; }
        }
        
        @media (max-width: 900px) {
          .cr-new-container { grid-template-columns: 1fr !important; }
          .cr-sidebar { flex-direction: row !important; overflow-x: auto; padding-bottom: 10px; }
          .cr-sidebar > div { min-width: 160px; padding: 10px !important; }
          .cr-sidebar > div > div > div { font-size: 11px !important; }
          .cr-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Page header */}
      <div style={{ padding: "32px var(--page-px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "28px", color: DARK, margin: "0 0 4px 0" }}>🌾 {t("crop_title")}</h2>
            <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>{t("crop_subtitle")}</p>
          </div>
        {/* Tab pills */}
        <div style={{ display: "flex", gap: "6px", background: "white", padding: "6px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
          {TABS.map(t_tab => (
            <button key={t_tab.id} className={`cr-tab${tab === t_tab.id ? " active" : ""}`}
              onClick={() => setTab(t_tab.id)}
              style={{ padding: "8px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: "13px", fontWeight: "500", transition: "all 0.2s", background: "transparent", color: tab === t_tab.id ? "white" : "#6b7280" }}>
              {t_tab.icon} {t_tab.id === "new" ? t("crop_new") : t_tab.id === "active" ? t("crop_active") : t("crop_archived")}
              {t_tab.id === "active" && activeTimelines.length > 0 && (
                <span style={{ marginLeft: "6px", background: tab === "active" ? "rgba(255,255,255,0.3)" : GREEN, color: "white", borderRadius: "10px", padding: "1px 7px", fontSize: "11px" }}>
                  {activeTimelines.length}
                </span>
              )}
              {t_tab.id === "archived" && archivedTimelines.length > 0 && (
                <span style={{ marginLeft: "6px", background: tab === "archived" ? "rgba(255,255,255,0.3)" : "#6b7280", color: "white", borderRadius: "10px", padding: "1px 7px", fontSize: "11px" }}>
                  {archivedTimelines.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ACTIVE TAB */}
      {tab === "active" && (
        <div>
          {activeTimelines.length === 0 ? (
            <div style={S.emptyState}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🌱</div>
              <h3 style={{ color: GREEN, margin: "0 0 8px 0", fontFamily: "Playfair Display, serif" }}>{t("crop_no_active")}</h3>
            </div>
          ) : (
            <div className="cr-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "16px" }}>
              {activeTimelines.map(t => <TimelineCard key={t.id} tl={t} />)}
            </div>
          )}
        </div>
      )}

      {/* ARCHIVED TAB */}
      {tab === "archived" && (
        <div>
          <div style={{ background: "#fff8f0", border: "1px solid #fde8c8", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#92400e" }}>
            📦 {t("crop_archived_note")}
          </div>
          {archivedTimelines.length === 0 ? (
            <div style={S.emptyState}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📦</div>
              <h3 style={{ color: "#6b7280", margin: "0 0 8px 0", fontFamily: "Playfair Display, serif" }}>{t("crop_no_archived")}</h3>
            </div>
          ) : (
            <div className="cr-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "16px" }}>
              {archivedTimelines.map(t => <TimelineCard key={t.id} tl={t} showArchiveActions />)}
            </div>
          )}
        </div>
      )}

      {/* NEW CROP TAB */}
      {tab === "new" && (
        <div className="cr-new-container" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px", alignItems: "start" }}>

          {/* Left sidebar — steps */}
          <div className="cr-sidebar" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { n: 1, label: "Select Land", icon: "🗺️" },
              { n: 2, label: "Soil Details", icon: "🧪" },
              { n: 3, label: t("crop_step2"), icon: "🌾" },
              { n: 4, label: t("crop_step3"), icon: "📅" },
            ].map(s => (
              <div key={s.n} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", background: step === s.n ? "#f0f7f4" : step > s.n ? "#f9f9f9" : "white", border: `1px solid ${step === s.n ? GREEN : "#e5e7eb"}` }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: step > s.n ? GREEN : step === s.n ? GREEN : "#e5e7eb", color: step >= s.n ? "white" : "#9ca3af", fontSize: "13px", fontWeight: "700", flexShrink: 0 }}>
                  {step > s.n ? "✓" : s.n}
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: step === s.n ? GREEN : step > s.n ? "#374151" : "#9ca3af" }}>{s.icon} {s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Right main area */}
          <div>
            {error && <div style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: "10px", fontSize: "13px", marginBottom: "16px" }}>⚠️ {error}</div>}

            {/* STEP 1 — Land Selection */}
            {step === 1 && (
              <div style={S.card}>
                <h3 style={S.cardTitle}>{t("crop_select_land")}</h3>
                {lands.length === 0 ? (
                  <p style={{ color: "#dc2626" }}>{t("crop_no_lands")}</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
                    {lands.map(land => {
                      const locked = activeLandIds.includes(land.id);
                      const daysLeft = locked ? getDaysRemaining(land.id) : 0;
                      const activeTl = locked ? getActiveTimeline(land.id) : null;
                      return (
                        <div key={land.id} className={locked ? "" : "land-card"}
                          onClick={() => !locked && selectLand(land)}
                          style={{ padding: "14px 16px", borderRadius: "10px", border: `2px solid ${selectedLand?.id === land.id ? GREEN : "#e5e7eb"}`, background: locked ? "#f9f9f9" : selectedLand?.id === land.id ? "#f0f7f4" : "white", cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.7 : 1, transition: "all 0.2s" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <strong style={{ color: DARK, fontSize: "14px" }}>{land.landName}</strong>
                            {locked ? <span style={{ fontSize: "18px" }}>🔒</span> : selectedLand?.id === land.id && <span style={{ color: GREEN, fontWeight: "700" }}>✓</span>}
                          </div>
                          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280" }}>{land.city} • {land.soilType}</p>
                          {locked && <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#e09f3e", fontWeight: "600" }}>{activeTl?.crop} — {daysLeft}d left</p>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedLand && (
                  <>
                    <div style={{ background: "#f0f7f4", border: "1px solid #b7e4c7", borderRadius: "10px", padding: "14px", marginTop: "16px" }}>
                      <p style={{ margin: "0 0 8px 0", fontWeight: "600", color: GREEN, fontSize: "13px" }}>✅ {t("crop_autofilled")}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                        {[["🌡", `${selectedLand.temperature}°C`], ["💧", `${selectedLand.humidity}%`], ["🪨", selectedLand.soilType], ["📐", `${selectedLand.landSize} ${selectedLand.landUnit}`]].map(([ic, v], i) => (
                          <div key={i} style={{ textAlign: "center", background: "white", borderRadius: "8px", padding: "8px" }}>
                            <div style={{ fontSize: "18px" }}>{ic}</div>
                            <div style={{ fontSize: "11px", color: "#374151", fontWeight: "500" }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setStep(2)} style={{ ...S.greenBtn, marginTop: "16px" }}>{t("crop_continue")}</button>
                  </>
                )}
              </div>
            )}

            {/* STEP 2 — Soil Details */}
            {step === 2 && (
              <div style={S.card}>
                <h3 style={S.cardTitle}>🧪 {t("crop_soil_nutrients")}</h3>
                <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 20px 0" }}>{t("crop_soil_hint")}</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                  {[{ key: "N", label: "Nitrogen (N)" }, { key: "P", label: "Phosphorus (P)" }, { key: "K", label: "Potassium (K)" }, { key: "ph", label: "Soil pH" }].map(f => (
                    <div key={f.key}>
                      <label style={S.label}>{f.label}</label>
                      <input type="number" value={soilValues[f.key]} onChange={e => setSoilValues({ ...soilValues, [f.key]: e.target.value })} style={S.input} step="0.1" />
                    </div>
                  ))}
                </div>

                <label style={S.label}>{t("crop_rainfall")}</label>
                <input type="number" placeholder="e.g. 150" value={rainfall} onChange={e => setRainfall(e.target.value)} style={S.input} />

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button onClick={() => setStep(1)} style={S.outlineBtn}>← {t("crop_back")}</button>
                  <button onClick={handleGetRecommendations} disabled={loading || recLocked} style={{ ...S.greenBtn, flex: 1 }}>
                    {loading ? loadingText : recLocked ? "Select recommendations from below" : `🌱 ${t("crop_get_rec")}`}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Pick Crop */}
            {step === 2 && crops.length > 0 && (
              <div style={{ ...S.card, marginTop: "16px" }}>
                <h3 style={S.cardTitle}>🌾 {t("crop_pick")}</h3>
                <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 16px 0" }}>Gemini AI suggests these crops for <strong>{selectedLand?.landName}</strong></p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                  {crops.map((crop, i) => (
                    <div key={i} className="crop-card"
                      onClick={() => setSelectedCrop(crop)}
                      style={{ padding: "14px 16px", borderRadius: "10px", border: `2px solid ${selectedCrop?.name === crop.name ? GREEN : "#e5e7eb"}`, background: selectedCrop?.name === crop.name ? "#f0f7f4" : "white", cursor: "pointer", transition: "all 0.2s", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: "15px", color: DARK }}>{i === 0 ? "⭐ " : ""}{crop.name}</strong>
                        <p style={{ margin: "3px 0", fontSize: "12px", color: "#6b7280" }}>{crop.reason}</p>
                        <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>💡 {crop.tip}</p>
                      </div>
                      <div style={{ textAlign: "center", minWidth: "80px", paddingLeft: "12px" }}>
                        <div style={{ fontSize: "22px", fontWeight: "700", color: crop.match >= 80 ? GREEN : crop.match >= 60 ? "#e09f3e" : "#9ca3af", fontFamily: "Playfair Display, serif" }}>{crop.match}%</div>
                        <div style={{ fontSize: "11px", color: "#9ca3af" }}>{t("crop_match")}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>📅 {crop.days}{t("crop_days")}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedCrop && (
                  <div style={{ background: "#f9f9f9", borderRadius: "10px", padding: "16px" }}>
                    <label style={S.label}>{t("crop_sowing_date")}</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={new Date().toISOString().split("T")[0]} style={{ ...S.input, marginBottom: "12px" }} />
                    <button onClick={handleGenerateTimeline} disabled={loading || timelineLocked} style={S.greenBtn}>
                      {loading ? loadingText : timelineLocked ? "Timeline generated successfully!" : `📅 ${t("crop_generate")}`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 — Timeline Preview */}
            {step === 3 && timeline && (
              <div style={S.card}>
                <h3 style={S.cardTitle}>📅 {timeline.crop} {t("crop_step3")} Preview</h3>

                <div style={{ background: "#f0f7f4", border: "1px solid #b7e4c7", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
                  <p style={{ margin: "0 0 10px 0", fontWeight: "600", color: GREEN, fontSize: "14px" }}>📋 {t("crop_overview")}</p>
                  <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#555" }}>{timeline.summary}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                    {[[`🌱 ${t("crop_start")}`, startDate], [`🌾 ${t("crop_harvest")}`, timeline.harvestDate], [`📅 ${t("crop_duration")}`, `${timeline.totalDays}d`], [`🗺️ ${t("crop_land")}`, selectedLand?.landName]].map(([l, v], i) => (
                      <div key={i} style={{ background: "white", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>{l}</div>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: DARK }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {timeline.expectedYield && (
                  <div style={{ background: "#fff8f0", border: "1px solid #fde8c8", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
                    <p style={{ margin: "0 0 4px 0", fontWeight: "700", color: "#e67e22", fontSize: "13px" }}>🌾 {t("crop_expected_yield")}</p>
                    <p style={{ margin: "0 0 4px 0", fontSize: "22px", fontWeight: "700", color: GREEN, fontFamily: "Playfair Display, serif" }}>
                      {timeline.expectedYield.min}–{timeline.expectedYield.max} {timeline.expectedYield.unit}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>{timeline.expectedYield.notes}</p>
                  </div>
                )}

                <h4 style={{ color: GREEN, margin: "0 0 10px 0", fontSize: "14px" }}>📋 {t("crop_all_tasks")} ({timeline.tasks?.length})</h4>
                <div style={{ maxHeight: "380px", overflowY: "auto", marginBottom: "16px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                  {timeline.tasks?.map((task, i) => (
                    <div key={i} style={{ display: "flex", gap: "12px", padding: "12px 16px", borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: TYPE_COLORS[task.type] || "#888", flexShrink: 0, marginTop: "5px" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: "13px", color: "#374151" }}>{task.title}</strong>
                          <span style={{ fontSize: "11px", color: "#9ca3af" }}>Day {task.day} • {task.date}</span>
                        </div>
                        <p style={{ margin: "3px 0 4px 0", fontSize: "12px", color: "#6b7280" }}>{task.description}</p>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "8px", background: (TYPE_COLORS[task.type] || "#888") + "22", color: TYPE_COLORS[task.type] || "#888", fontWeight: "600" }}>{task.type}</span>
                          {task.priority === "high" && <span style={{ fontSize: "10px", color: "#dc2626" }}>⚠️ High</span>}
                          {task.weatherSensitive && <span style={{ fontSize: "10px", color: "#1a6985" }}>🌧 Weather sensitive</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => { setStep(2); setTimeline(null); }} style={S.outlineBtn}>← {t("crop_back")}</button>
                  <button onClick={handleSaveTimeline} disabled={loading} style={{ ...S.greenBtn, flex: 1 }}>
                    {loading ? t("crop_saving") : `💾 ${t("crop_save_timeline")}`}
                  </button>
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

const S = {
  card: { background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" },
  cardTitle: { fontFamily: "Playfair Display, serif", fontSize: "20px", fontWeight: "700", color: DARK, margin: "0 0 6px 0" },
  input: { display: "block", width: "100%", marginBottom: "12px", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "14px", boxSizing: "border-box", fontFamily: FONT, transition: "all 0.2s" },
  label: { display: "block", fontSize: "12px", fontWeight: "600", color: "#6b7280", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" },
  greenBtn: { width: "100%", background: `linear-gradient(135deg, ${GREEN}, ${DARK})`, color: "white", border: "none", padding: "13px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600", fontFamily: FONT, marginBottom: "6px" },
  outlineBtn: { padding: "12px 20px", background: "white", color: GREEN, border: `1.5px solid ${GREEN}`, borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600", fontFamily: FONT },
  smallBtn: { padding: "6px 12px", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontFamily: FONT, fontWeight: "500" },
  emptyState: { textAlign: "center", padding: "60px 40px", background: "#f9fafb", borderRadius: "14px", color: "#9ca3af" },
};

export default CropRec;