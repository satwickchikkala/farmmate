// src/pages/DiseaseDetect.js
import React, { useState, useEffect } from 'react';
import { db, auth } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import axios from 'axios';
import API_URL from "../config";
const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";

function DiseaseDetect() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCrops, setActiveCrops] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const load = async () => {
      const q = query(collection(db, "timelines"), where("userId", "==", auth.currentUser.uid), where("status", "==", "active"));
      const snap = await getDocs(q);
      setActiveCrops(snap.docs.map(d => d.data().crop));
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
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFileChange(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) { setError("Please select an image first."); return; }
    const formData = new FormData();
    formData.append('file', selectedFile);
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/detect-disease`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (err) {
      setError("Could not analyze image. Make sure the backend is running and the model files are present.");
    }
    setLoading(false);
  };

  const confidenceColor = (c) => c >= 80 ? GREEN : c >= 60 ? "#e09f3e" : "#dc2626";

  return (
    <div style={{ fontFamily: FONT, width: "100%" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap');`}</style>

      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "28px", color: DARK, margin: "0 0 4px 0" }}>🔬 Disease Detection</h2>
        <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>Upload a photo of your crop leaf — our AI model will diagnose it instantly</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1fr" : "600px 1fr", gap: "24px", alignItems: "start" }}>

        {/* Upload section */}
        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "28px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
          <h3 style={{ fontFamily: "Playfair Display, serif", color: DARK, margin: "0 0 6px 0", fontSize: "20px" }}>Upload Crop Image</h3>
          <p style={{ color: "#9ca3af", fontSize: "13px", margin: "0 0 20px 0" }}>Supports JPG, PNG. Best results with clear, well-lit photos of affected leaves.</p>

          {/* Active crops hint */}
          {activeCrops.length > 0 && (
            <div style={{ background: "#f0f7f4", border: "1px solid #b7e4c7", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#374151" }}>
              🌾 Active crops: <strong>{activeCrops.join(", ")}</strong>
            </div>
          )}

          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => document.getElementById("fileInput").click()}
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
            }}>
            {preview ? (
              <img src={preview} alt="preview" style={{ maxWidth: "100%", maxHeight: "250px", borderRadius: "8px", objectFit: "contain" }} />
            ) : (
              <>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📷</div>
                <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 4px 0", fontWeight: "500" }}>Drop your image here or click to browse</p>
                <p style={{ color: "#d1d5db", fontSize: "12px", margin: 0 }}>JPG, PNG up to 10MB</p>
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
            {loading ? "🤖 Analyzing with AI..." : "🔍 Detect Disease"}
          </button>

          {loading && (
            <div style={{ marginTop: "16px", padding: "12px", background: "#f0f7f4", borderRadius: "8px", fontSize: "13px", color: GREEN, textAlign: "center" }}>
              Running ResNet50 model → Asking AI for cure details...
            </div>
          )}
        </div>

        {/* Results section */}
        {result ? (
          <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "28px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
            {/* Disease header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontFamily: "Playfair Display, serif", color: "#dc2626", fontSize: "22px", margin: "0 0 4px 0" }}>
                  🦠 {result.disease}
                </h3>
                <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>Diagnosed by ResNet50 AI Model</p>
              </div>
              <div style={{ textAlign: "center", background: "#f9fafb", borderRadius: "12px", padding: "12px 16px" }}>
                <div style={{ fontSize: "24px", fontWeight: "700", color: confidenceColor(result.confidence), fontFamily: "Playfair Display, serif" }}>{result.confidence}%</div>
                <div style={{ fontSize: "11px", color: "#9ca3af" }}>confidence</div>
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
                  { icon: "❓", label: "Cause", key: "cause", color: "#f0f8ff", border: "#bfdbfe", text: "#1e40af" },
                  { icon: "🌿", label: "Organic Remedy", key: "organic", color: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
                  { icon: "🧪", label: "Chemical Treatment", key: "chemical", color: "#fff8f0", border: "#fde8c8", text: "#92400e" },
                  { icon: "⚖️", label: "Dosage & Timing", key: "dosage", color: "#fdf4ff", border: "#e9d5ff", text: "#6b21a8" },
                  { icon: "🛡️", label: "Prevention", key: "prevention", color: "#f0f7f4", border: "#b7e4c7", text: "#1b4332" },
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
              🔄 Scan Another Image
            </button>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "28px", textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔬</div>
            <h3 style={{ fontFamily: "Playfair Display, serif", color: DARK, fontSize: "20px", margin: "0 0 8px 0" }}>How it works</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
              {[["1️⃣", "Upload a clear photo of the affected leaf or crop"], ["2️⃣", "Our ResNet50 deep learning model identifies the disease"], ["3️⃣", " AI provides detailed cure and prevention advice"], ["4️⃣", "Treat your crop early to minimize yield loss"]].map(([n, t], i) => (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "10px 14px", background: "#f9fafb", borderRadius: "8px" }}>
                  <span style={{ fontSize: "18px", flexShrink: 0 }}>{n}</span>
                  <span style={{ fontSize: "13px", color: "#374151" }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "20px", padding: "12px 16px", background: "#fff8f0", border: "1px solid #fde8c8", borderRadius: "10px", fontSize: "12px", color: "#92400e" }}>
              💡 Tip: For best results, photograph only the affected leaf in good natural lighting
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiseaseDetect;