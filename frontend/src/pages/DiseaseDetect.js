// src/pages/DiseaseDetect.js
import React, { useState, useEffect } from 'react';
import { db, auth } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import axios from 'axios';
import API_URL from "../config";
import { useGate } from "../hooks/useGate";
import UpgradePopup from "../components/UpgradePopup";
import { trackUsage } from "../utils/trackUsage";
import { useLanguage } from "../context/LanguageContext";
import { usePopup } from "../context/PopupContext";

const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";

function DiseaseDetect() {
  const { t, lang } = useLanguage();
  const { showAlert } = usePopup();
  const { plan, checkGate, showUpgrade, setShowUpgrade, blockedFeature } = useGate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCrops, setActiveCrops] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [lands, setLands] = useState([]);
  const [selectedLandId, setSelectedLandId] = useState(null);
  const [selectedLandIsPayg, setSelectedLandIsPayg] = useState(false);
  const [showLandModal, setShowLandModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Load active crops for hint
      const q = query(collection(db, "timelines"), where("userId", "==", auth.currentUser.uid), where("status", "==", "active"));
      const snap = await getDocs(q);
      setActiveCrops(snap.docs.map(d => d.data().crop));

      // Load lands for selector
      const landQ = query(collection(db, "lands"), where("userId", "==", auth.currentUser.uid));
      const landSnap = await getDocs(landQ);
      setLands(landSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    load();
  }, []);

  const handleFileChange = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    if (!selectedLandId) {
      setShowLandModal(true);
      return;
    }

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFileChange(file);
  };

  const handleUpload = async () => {
    if (!checkGate("Disease Detection")) return;

    if (!selectedLandId) {
      setShowLandModal(true);
      return;
    }

    if (!selectedFile) { setError("Please select an image first."); return; }
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('language', lang);
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/detect-disease`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await trackUsage(
        auth.currentUser.uid,
        "disease",
        selectedLandId,
        selectedLandIsPayg
      );
      setResult(res.data);
    } catch (err) {
      setError("Could not analyze image. Make sure the backend is running and the model files are present.");
    }
    setLoading(false);
  };

  const confidenceColor = (c) => c >= 80 ? GREEN : c >= 60 ? "#e09f3e" : "#dc2626";

  const handleDropzoneClick = () => {
    if (!selectedLandId) {
      setShowLandModal(true);
    } else {
      document.getElementById("fileInput").click();
    }
  };

  const handleLandSelect = (landId) => {
    const land = lands.find(l => l.id === landId);
    setSelectedLandId(landId);
    setSelectedLandIsPayg(land?.isPayg === true);
    setShowLandModal(false);
  };

  return (
    <div style={{ fontFamily: FONT, width: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap');
        .dd-grid { display: grid; grid-template-columns: ${result ? "1fr 1fr" : "minmax(300px, 600px) 1fr"}; gap: 24px; align-items: start; }
        
        @media (max-width: 900px) {
          .dd-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .dd-card { padding: 20px !important; }
        }

        .land-modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:10000; padding:20px; box-sizing:border-box; backdrop-filter: blur(4px); }
        .land-modal { background:white; padding:32px; borderRadius:20px; maxWidth:450px; width:100%; boxShadow:0 20px 50px rgba(0,0,0,0.2); textAlign:center; animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "28px", color: DARK, margin: "0 0 4px 0" }}>🔬 {t("disease_title")}</h2>
        <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>{t("disease_subtitle")}</p>
      </div>

      <div className="dd-grid">

        {/* Upload section */}
        <div className="dd-card" style={{ background: "white", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "28px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
          <h3 style={{ fontFamily: "Playfair Display, serif", color: DARK, margin: "0 0 6px 0", fontSize: "20px" }}>{t("disease_upload_title")}</h3>
          <p style={{ color: "#9ca3af", fontSize: "13px", margin: "0 0 20px 0" }}>{t("disease_upload_sub")}</p>

          {/* Land selector for billing - mandatory */}
          <div style={{ marginBottom: "20px", padding: "16px", background: "#f9fafb", borderRadius: "12px", border: selectedLandId ? "1px solid #e5e7eb" : `2px solid ${GREEN}` }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: selectedLandId ? "#6b7280" : GREEN, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              📍 Step 1: Select Your Land {selectedLandId ? "✅" : "*"}
            </label>
            <select
              value={selectedLandId || ""}
              onChange={e => handleLandSelect(e.target.value)}
              style={{ display: "block", width: "100%", padding: "12px", borderRadius: "8px", border: `1.5px solid ${selectedLandId ? "#e5e7eb" : GREEN}`, fontSize: "14px", fontFamily: FONT, background: "white", color: DARK, fontWeight: "500" }}
            >
              <option value="">Choose a land...</option>
              {lands.map(land => (
                <option key={land.id} value={land.id}>
                  {land.landName} — {land.city}
                  {land.isPayg ? " ⚡ (PAYG)" : " ✅ (Pro)"}
                </option>
              ))}
            </select>
            {!selectedLandId && <p style={{ fontSize: "11px", color: GREEN, margin: "6px 0 0 0", fontWeight: "600" }}>Please select a land before uploading image</p>}
          </div>

          {/* Active crops hint */}
          {activeCrops.length > 0 && (
            <div style={{ background: "#f0f7f4", border: "1px solid #b7e4c7", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#374151" }}>
              🌾 {t("disease_active_crops")}: <strong>{activeCrops.join(", ")}</strong>
            </div>
          )}

          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={handleDropzoneClick}
            style={{
              border: `2px dashed ${dragOver ? GREEN : "#d1d5db"}`,
              borderRadius: "12px",
              padding: "32px",
              textAlign: "center",
              cursor: "pointer",
              background: dragOver ? "#f0f7f4" : "#fafafa",
              transition: "all 0.2s",
              marginBottom: "16px",
              minHeight: "200px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              opacity: selectedLandId ? 1 : 0.7,
            }}>
            {preview ? (
              <img src={preview} alt="preview" style={{ maxWidth: "100%", maxHeight: "250px", borderRadius: "8px", objectFit: "contain" }} />
            ) : (
              <>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📷</div>
                <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 4px 0", fontWeight: "500" }}>{t("disease_drop")}</p>
                <p style={{ color: "#d1d5db", fontSize: "12px", margin: 0 }}>{t("disease_format")}</p>
                {!selectedLandId && <div style={{ marginTop: "12px", color: GREEN, fontSize: "12px", fontWeight: "600", background: "#f0f7f4", padding: "4px 12px", borderRadius: "20px" }}>Select Land First</div>}
              </>
            )}
            <input id="fileInput" type="file" accept="image/*" onChange={e => handleFileChange(e.target.files[0])} style={{ display: "none" }} />
          </div>

          {selectedFile && (
            <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#374151", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>📄 {selectedFile.name}</span>
              <span style={{ color: "#9ca3af" }}>{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
          )}

          {error && <div style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "12px" }}>⚠️ {error}</div>}

          <button onClick={handleUpload} disabled={loading || !selectedFile}
            style={{ width: "100%", padding: "14px", background: loading || !selectedFile ? "#d1d5db" : `linear-gradient(135deg, ${GREEN}, ${DARK})`, color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: loading || !selectedFile ? "not-allowed" : "pointer", fontFamily: FONT, transition: "all 0.2s" }}>
            {loading ? `🤖 ${t("disease_analyzing")}` : `🔍 ${t("disease_detect")}`}
          </button>

          {loading && (
            <div style={{ marginTop: "16px", padding: "12px", background: "#f0f7f4", borderRadius: "8px", fontSize: "13px", color: GREEN, textAlign: "center" }}>
              Running ResNet50 model → Asking AI for cure details...
            </div>
          )}
        </div>

        {/* Results section */}
        {result ? (
          <div className="dd-card" style={{ background: "white", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "28px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
            {/* Disease header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ fontFamily: "Playfair Display, serif", color: "#dc2626", fontSize: "22px", margin: "0 0 4px 0" }}>
                  🦠 {result.disease}
                </h3>
                <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>{t("disease_diagnosed")}</p>
              </div>
              <div style={{ textAlign: "center", background: "#f9fafb", borderRadius: "12px", padding: "12px 16px" }}>
                <div style={{ fontSize: "24px", fontWeight: "700", color: confidenceColor(result.confidence), fontFamily: "Playfair Display, serif" }}>{result.confidence}%</div>
                <div style={{ fontSize: "11px", color: "#9ca3af" }}>{t("disease_confidence")}</div>
              </div>
            </div>

            {/* Confidence bar */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ background: "#e5e7eb", borderRadius: "6px", height: "8px" }}>
                <div style={{ width: `${result.confidence}%`, background: confidenceColor(result.confidence), height: "8px", borderRadius: "6px", transition: "width 1s" }} />
              </div>
            </div>

            {result.treatment && typeof result.treatment === 'object' && !result.treatment.error && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { icon: "❓", label: t("disease_cause"), key: "cause", color: "#f0f8ff", border: "#bfdbfe", text: "#1e40af" },
                  { icon: "🌿", label: t("disease_organic"), key: "organic", color: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
                  { icon: "🧪", label: t("disease_chemical"), key: "chemical", color: "#fff8f0", border: "#fde8c8", text: "#92400e" },
                  { icon: "⚖️", label: t("disease_dosage"), key: "dosage", color: "#fdf4ff", border: "#e9d5ff", text: "#6b21a8" },
                  { icon: "🛡️", label: t("disease_prevention"), key: "prevention", color: "#f0f7f4", border: "#b7e4c7", text: "#1b4332" },
                ].filter(f => result.treatment[f.key]).map((f, i) => (
                  <div key={i} style={{ background: f.color, border: `1px solid ${f.border}`, borderRadius: "10px", padding: "12px 14px" }}>
                    <p style={{ margin: "0 0 4px 0", fontSize: "12px", fontWeight: "700", color: f.text, textTransform: "uppercase", letterSpacing: "0.5px" }}>{f.icon} {f.label}</p>
                    <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: "1.6" }}>{result.treatment[f.key]}</p>
                  </div>
                ))}
                {result.treatment.error && (
                  <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#92400e" }}>
                    ⚠️ Treatment details unavailable. Please consult a local agricultural expert.
                  </div>
                )}
              </div>
            )}

            <button onClick={() => { setResult(null); setSelectedFile(null); setPreview(null); }}
              style={{ width: "100%", marginTop: "16px", padding: "12px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "10px", cursor: "pointer", fontFamily: FONT, fontSize: "14px", fontWeight: "500" }}>
              🔄 {t("disease_scan_another")}
            </button>
          </div>
        ) : (
          <div className="dd-card" style={{ background: "white", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "28px", textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔬</div>
            <h3 style={{ fontFamily: "Playfair Display, serif", color: DARK, fontSize: "20px", margin: "0 0 8px 0" }}>{t("disease_how")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
              {[["1️⃣", "Upload a clear photo of the affected leaf or crop"], ["2️⃣", "Our ResNet50 deep learning model identifies the disease"], ["3️⃣", " AI provides detailed cure and prevention advice"], ["4️⃣", "Treat your crop early to minimize yield loss"]].map(([n, t], i) => (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "10px 14px", background: "#f9fafb", borderRadius: "8px" }}>
                  <span style={{ fontSize: "18px", flexShrink: 0 }}>{n}</span>
                  <span style={{ fontSize: "13px", color: "#374151" }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "20px", padding: "12px 16px", background: "#fff8f0", border: "1px solid #fde8c8", borderRadius: "10px", fontSize: "12px", color: "#92400e" }}>
              💡 {t("disease_tip")}
            </div>
          </div>
        )}
      </div>

      {/* Land Selection Modal */}
      {showLandModal && (
        <div className="land-modal-overlay">
          <div className="land-modal">
            <h3 style={{ fontFamily: "Playfair Display, serif", color: DARK, margin: "0 0 12px 0", fontSize: "24px" }}>
              📍 Select Land
            </h3>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "24px" }}>
              Please tell us which land this image belongs to for accurate billing and records.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {lands.map(land => (
                <button
                  key={land.id}
                  onClick={() => handleLandSelect(land.id)}
                  style={{
                    padding: "16px",
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: FONT,
                    transition: "all 0.2s",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = GREEN}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                >
                  <div>
                    <div style={{ fontWeight: "600", color: DARK }}>{land.landName}</div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>{land.city}</div>
                  </div>
                  <span style={{ fontSize: "11px", color: land.isPayg ? "#1a6985" : GREEN, background: land.isPayg ? "#e0f2fe" : "#f0fdf4", padding: "4px 8px", borderRadius: "6px", fontWeight: "600" }}>
                    {land.isPayg ? "⚡ PAYG" : "✅ Pro"}
                  </span>
                </button>
              ))}
              {lands.length === 0 && (
                <p style={{ color: "#9ca3af", fontSize: "13px" }}>No lands found. Please add a land first.</p>
              )}
            </div>
            <button
              onClick={() => setShowLandModal(false)}
              style={{ marginTop: "24px", background: "#f3f4f6", border: "none", padding: "12px 24px", borderRadius: "10px", color: "#4b5563", fontWeight: "600", cursor: "pointer", width: "100%" }}
            >
              Cancel
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

export default DiseaseDetect;