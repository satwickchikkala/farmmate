// src/pages/Subscription.js
import { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../config";
import { auth } from "../firebase";
import { getUserPlan } from "../utils/updatePlan";
import { updateUserPlan } from "../utils/updatePlan";
import { useLanguage } from "../context/LanguageContext";

const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";

const PAYG_FEATURES = [
  { id: "crop_rec", label: "Crop Recommendation", icon: "🌾", unit: "per request", price: 2 },
  { id: "timeline", label: "Timeline Generation", icon: "📅", unit: "per timeline", price: 5 },
  { id: "disease", label: "Disease Detection", icon: "🔬", unit: "per scan", price: 3 },
  { id: "weather", label: "Weather Forecast (7-day)", icon: "🌤️", unit: "per land/month", price: 1 },
  { id: "lands", label: "Additional Lands (beyond 2)", icon: "🗺️", unit: "per land/month", price: 10 },
  { id: "ai_chat", label: "AI Farming Assistant Chat", icon: "🤖", unit: "per 10 messages", price: 1 },
  { id: "export", label: "Export Reports (PDF)", icon: "📄", unit: "per report", price: 4 },
  { id: "alerts", label: "Weather Alert Notifications", icon: "🔔", unit: "per land/month", price: 2 },
];

function Subscription() {
  const { t, lang } = useLanguage();
  const [userPlan, setUserPlan] = useState("free");
  const [paygQty, setPaygQty] = useState({});
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (auth.currentUser) {
        const plan = await getUserPlan(auth.currentUser.uid);
        setUserPlan(plan);
      }
    };
    load();
  }, []);

  const getPlans = (userPlan) => [
    {
      id: "free",
      name: "Free",
      price: "₹0",
      period: "forever",
      color: "#6b7280",
      bgColor: "#f9fafb",
      borderColor: "#e5e7eb",
      badge: null,
      current: userPlan === "free",
      features: [
        "Up to 2 lands",
        "5 crop recommendations/month",
        "Basic weather overview",
        "3 disease detections/month",
        "Basic farming timeline",
        "Community support",
      ],
      notIncluded: [
        "7-day weather forecast",
        "Unlimited AI recommendations",
        "Export reports",
        "Priority support",
      ],
    },
    {
      id: "pro",
      name: "Farmer Pro",
      price: "₹999",
      period: "per year",
      subPrice: "₹83/month",
      color: GREEN,
      bgColor: "#f0fdf4",
      borderColor: GREEN,
      badge: "Most Popular",
      current: userPlan === "pro",
      features: [
        "Up to 10 lands",
        "Unlimited crop recommendations",
        "Full AI timeline generation",
        "Unlimited disease detection",
        "7-day weather forecast",
        "Weather alert notifications",
        "Export reports (PDF)",
        "Priority email support",
        "Task completion analytics",
      ],
      notIncluded: [
        "Multiple farm managers",
        "Custom AI model training",
      ],
    },
    {
      id: "payg",
      name: "Pay As You Go",
      price: "Custom",
      period: "pay per use",
      subPrice: "No monthly fee",
      color: "#1a6985",
      bgColor: "#f0f8ff",
      borderColor: "#1a6985",
      badge: "Flexible",
      current: false,
      features: [
        "Unlimited lands",
        "Pay only for what you use",
        "All premium features available",
        "No monthly commitment",
        "Multiple farm managers",
        "Export reports (PDF)",
        "API access",
        "Dedicated account manager",
        "Custom AI model training",
      ],
      notIncluded: [],
    },
  ];

  const paygTotal = PAYG_FEATURES.reduce((sum, f) => sum + (parseInt(paygQty[f.id] || 0) * f.price), 0);

  const handleUpgrade = async (plan) => {
    try {
      const orderRes = await axios.post(`${API_URL}/create-order`, { plan });
      const { orderId, amount, keyId } = orderRes.data;

      const options = {
        key: keyId,
        amount: amount,
        currency: "INR",
        name: "FarmMate",
        description: "FarmMate Pro Plan - 1 Year",
        image: "https://farmmate-three.vercel.app/logo192.png",
        order_id: orderId,
        handler: async (response) => {
          const verifyRes = await axios.post(`${API_URL}/verify-payment`, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            userId: auth.currentUser.uid,
            plan: "pro"
          });

          if (verifyRes.data.success) {
            await updateUserPlan(
              auth.currentUser.uid,
              "pro",
              response.razorpay_payment_id
            );
            alert("Payment successful! You are now on FarmMate Pro!");
            window.location.reload();
          } else {
            alert("Payment verification failed. Contact support.");
          }
        },
        prefill: {
          email: auth.currentUser?.email,
          name: auth.currentUser?.displayName || "",
        },
        theme: {
          color: "#2d6a4f"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Could not initiate payment. Try again.");
    }
  };

  return (
    <div style={{ fontFamily: FONT, maxWidth: "1000px", width: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap');
        .plan-card { transition: transform 0.2s, box-shadow 0.2s; }
        .plan-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.1) !important; }
        .upgrade-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .payg-input:focus { border-color: #1a6985 !important; outline: none; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "32px", fontWeight: "700", color: DARK, margin: "0 0 8px 0" }}>
          {t("sub_title")}
        </h2>
        <p style={{ color: "#6b7280", fontSize: "15px", margin: 0 }}>
          {t("sub_subtitle")}
        </p>
      </div>

      {/* Plans grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        {getPlans(userPlan).map(plan => (
          <div key={plan.id} className="plan-card" style={{
            background: plan.bgColor,
            border: `2px solid ${plan.borderColor}`,
            borderRadius: "16px",
            padding: "28px",
            position: "relative",
            boxShadow: plan.badge === "Most Popular" ? `0 8px 32px rgba(45,106,79,0.15)` : "0 2px 12px rgba(0,0,0,0.04)",
          }}>
            {/* Badge */}
            {plan.badge && (
              <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: plan.color, color: "white", padding: "4px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" }}>
                {plan.badge === "Most Popular" ? "⭐ " : "🔄 "}{plan.badge}
              </div>
            )}
            {plan.current && (
              <div style={{ position: "absolute", top: "16px", right: "16px", background: "#e5e7eb", color: "#6b7280", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600" }}>
                {t("sub_current")}
              </div>
            )}

            <h3 style={{ fontFamily: "Playfair Display, serif", color: plan.color, fontSize: "22px", margin: "0 0 8px 0" }}>{plan.name}</h3>

            <div style={{ marginBottom: "4px" }}>
              <span style={{ fontSize: "36px", fontWeight: "700", color: "#111", fontFamily: "Playfair Display, serif" }}>{plan.price}</span>
            </div>
            <p style={{ color: "#9ca3af", fontSize: "13px", margin: "0 0 4px 0" }}>{plan.period}</p>
            {plan.subPrice && <p style={{ color: plan.color, fontSize: "13px", fontWeight: "600", margin: "0 0 20px 0" }}>{plan.subPrice}</p>}

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px", marginBottom: "16px" }}>
              {plan.features.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "5px 0", fontSize: "13px", color: "#374151" }}>
                  <span style={{ color: plan.color, fontWeight: "700", flexShrink: 0 }}>✓</span> {f}
                </div>
              ))}
              {plan.notIncluded.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "5px 0", fontSize: "13px", color: "#d1d5db" }}>
                  <span style={{ flexShrink: 0 }}>✗</span> {f}
                </div>
              ))}
            </div>

            <button
              className="upgrade-btn"
              disabled={plan.current}
              onClick={() => {
                if (plan.id === "payg") setShowCalculator(true);
                if (!plan.current && plan.id === "pro") handleUpgrade("pro");
              }}
              style={{
                width: "100%",
                padding: "13px",
                background: plan.current ? "#e5e7eb" : plan.id === "payg" ? `linear-gradient(135deg, #1a6985, #0d4a6b)` : `linear-gradient(135deg, ${GREEN}, ${DARK})`,
                color: plan.current ? "#9ca3af" : "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: plan.current ? "default" : "pointer",
                fontFamily: FONT,
                transition: "all 0.2s",
              }}
            >
              {plan.current ? `✓ ${t("sub_current")} Plan`
                : plan.id === "pro" ? `🚀 ${t("sub_upgrade_pro")}`
                : plan.id === "payg" ? `🧮 ${t("sub_calculate")}`
                : t("sub_get_started")}
            </button>
          </div>
        ))}
      </div>

      {/* Pay As You Go Calculator */}
      {showCalculator && (
        <div style={{ background: "white", border: "2px solid #1a6985", borderRadius: "16px", padding: "28px", marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontFamily: "Playfair Display, serif", color: "#1a6985", margin: "0 0 4px 0", fontSize: "22px" }}>
                💰 Pay As You Go Calculator
              </h3>
              <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>Enter your estimated monthly usage to see your cost.</p>
            </div>
            <button onClick={() => setShowCalculator(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#9ca3af" }}>✕</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            {PAYG_FEATURES.map(f => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                <span style={{ fontSize: "22px" }}>{f.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>{f.label}</div>
                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>₹{f.price} {f.unit}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    className="payg-input"
                    type="number"
                    min="0"
                    value={paygQty[f.id] || ""}
                    onChange={e => setPaygQty(p => ({ ...p, [f.id]: e.target.value }))}
                    placeholder="0"
                    style={{ width: "60px", padding: "6px 8px", borderRadius: "6px", border: "1.5px solid #e5e7eb", fontSize: "14px", fontFamily: FONT, textAlign: "center" }}
                  />
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>= ₹{(parseInt(paygQty[f.id] || 0) * f.price)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{ background: paygTotal > 999 ? "#fff8f0" : "#f0fdf4", borderRadius: "12px", padding: "20px", border: `2px solid ${paygTotal > 999 ? "#fde8c8" : "#bbf7d0"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "14px", color: "#6b7280" }}>{t("sub_monthly_total")}</div>
              <div style={{ fontSize: "36px", fontWeight: "700", color: paygTotal > 999 ? "#e09f3e" : "#15803d", fontFamily: "Playfair Display, serif" }}>₹{paygTotal}</div>
              {paygTotal > 999 && (
                <div style={{ fontSize: "13px", color: "#e09f3e", marginTop: "4px" }}>
                  💡 {t("sub_save_tip")}
                </div>
              )}
              {paygTotal <= 999 && paygTotal > 0 && (
                <div style={{ fontSize: "13px", color: "#15803d", marginTop: "4px" }}>
                  ✅ {t("sub_payg_cheaper")}
                </div>
              )}
            </div>
            {paygTotal > 999 && (
              <button style={{ padding: "12px 20px", background: `linear-gradient(135deg, ${GREEN}, ${DARK})`, color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: FONT }}>
                {t("sub_switch_pro")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Feature comparison table */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "28px", overflow: "auto" }}>
        <h3 style={{ fontFamily: "Playfair Display, serif", color: DARK, margin: "0 0 20px 0", fontSize: "20px" }}>
          {t("sub_comparison")}
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", color: "#6b7280", fontWeight: "600", borderBottom: "1px solid #e5e7eb" }}>Feature</th>
              {getPlans(userPlan).map(p => (
                <th key={p.id} style={{ padding: "12px 16px", textAlign: "center", color: p.color, fontWeight: "700", borderBottom: "1px solid #e5e7eb" }}>{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["Max Lands", "2", "10", "Unlimited"],
              ["Crop Recommendations", "5/month", "Unlimited", "Pay per use"],
              ["Disease Detection", "3/month", "Unlimited", "Pay per use"],
              ["AI Timeline Generation", "1/month", "Unlimited", "Pay per use"],
              ["7-Day Weather Forecast", "❌", "✅", "Pay per use"],
              ["Weather Alerts", "❌", "✅", "Pay per use"],
              ["Export Reports", "❌", "✅", "Pay per use"],
              ["Multiple Managers", "❌", "❌", "✅"],
              ["API Access", "❌", "❌", "✅"],
              ["Support", "Community", "Priority Email", "Dedicated Manager"],
            ].map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafafa" }}>
                <td style={{ padding: "12px 16px", color: "#374151", fontWeight: "500", borderBottom: "1px solid #f3f4f6" }}>{row[0]}</td>
                {row.slice(1).map((cell, j) => (
                  <td key={j} style={{ padding: "12px 16px", textAlign: "center", color: cell === "❌" ? "#d1d5db" : cell === "✅" ? GREEN : "#374151", fontWeight: cell === "✅" || cell === "❌" ? "700" : "400", borderBottom: "1px solid #f3f4f6" }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "12px", marginTop: "20px" }}>
        🔒 {t("sub_footer")}
      </p>
    </div>
  );
}

export default Subscription;
