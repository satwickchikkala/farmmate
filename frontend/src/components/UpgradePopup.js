// src/components/UpgradePopup.js
import { useNavigate } from "react-router-dom";

const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";

function UpgradePopup({ feature, onClose }) {
  const navigate = useNavigate();

  return (
    <div style={S.overlay}>
      <div style={S.popup}>
        <button onClick={onClose} style={S.closeBtn}>✕</button>

        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔒</div>

        <h2 style={S.title}>Pro Feature</h2>
        <p style={S.subtitle}>
          <strong>{feature}</strong> is available on FarmMate Pro plan.
        </p>

        <div style={S.featureList}>
          {[
            "Up to 5 lands",
            "Unlimited crop recommendations",
            "Full AI timeline generation",
            "Unlimited disease detection",
            "7-day weather forecast",
            "Smart weather alerts",
          ].map((f, i) => (
            <div key={i} style={S.featureItem}>
              <span style={{ color: GREEN }}>✓</span> {f}
            </div>
          ))}
        </div>

        <div style={S.priceBox}>
          <span style={S.price}>₹999</span>
          <span style={S.period}>/year</span>
          <p style={S.perMonth}>Just ₹83/month</p>
        </div>

        <button
          onClick={() => { navigate("/subscription"); onClose(); }}
          style={S.upgradeBtn}
        >
          🚀 Upgrade to Pro
        </button>

        <button onClick={onClose} style={S.cancelBtn}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

const S = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, fontFamily: FONT
  },
  popup: {
    background: "white", borderRadius: "20px", padding: "40px 36px",
    maxWidth: "400px", width: "90%", textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)", position: "relative"
  },
  closeBtn: {
    position: "absolute", top: "16px", right: "16px",
    background: "none", border: "none", fontSize: "18px",
    cursor: "pointer", color: "#9ca3af"
  },
  title: {
    fontFamily: "Playfair Display, serif", fontSize: "24px",
    color: DARK, margin: "0 0 8px 0"
  },
  subtitle: { color: "#6b7280", fontSize: "14px", margin: "0 0 20px 0" },
  featureList: {
    background: "#f0f7f4", borderRadius: "10px",
    padding: "14px 20px", marginBottom: "20px", textAlign: "left"
  },
  featureItem: {
    fontSize: "13px", color: "#374151",
    padding: "4px 0", display: "flex", gap: "8px"
  },
  priceBox: {
    marginBottom: "20px", padding: "16px",
    background: "#f9fafb", borderRadius: "10px"
  },
  price: {
    fontSize: "36px", fontWeight: "700", color: DARK,
    fontFamily: "Playfair Display, serif"
  },
  period: { fontSize: "16px", color: "#9ca3af" },
  perMonth: { color: GREEN, fontSize: "13px", fontWeight: "600", margin: "4px 0 0 0" },
  upgradeBtn: {
    width: "100%", padding: "14px",
    background: `linear-gradient(135deg, ${GREEN}, ${DARK})`,
    color: "white", border: "none", borderRadius: "10px",
    fontSize: "15px", fontWeight: "600", cursor: "pointer",
    fontFamily: FONT, marginBottom: "10px"
  },
  cancelBtn: {
    width: "100%", padding: "10px", background: "none",
    border: "none", color: "#9ca3af", cursor: "pointer",
    fontSize: "13px", fontFamily: FONT
  },
};

export default UpgradePopup;