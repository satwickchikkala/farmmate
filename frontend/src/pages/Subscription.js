// src/pages/Subscription.js
import { useState, useEffect } from "react";
import { getUserPlan } from "../utils/updatePlan";
import { getMonthlyUsage } from "../utils/trackUsage";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import axios from "axios";
import API_URL from "../config";
import { PAYG_PRICES } from "../utils/paygPricing";
import { usePopup } from "../context/PopupContext";

const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";

function Subscription({ user }) {
  const { showAlert, showConfirm } = usePopup();
  const [userPlan, setUserPlan] = useState("free");
  const [landCount, setLandCount] = useState(0);
  const [monthlyUsage, setMonthlyUsage] = useState(null);
  const [showLiveBilling, setShowLiveBilling] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const uid = auth.currentUser.uid;
    const plan = await getUserPlan(uid);
    setUserPlan(plan);

    const landsQuery = query(collection(db, "lands"), where("userId", "==", uid));
    const landsSnap = await getDocs(landsQuery);
    setLandCount(landsSnap.size);

    const usage = await getMonthlyUsage(uid);
    setMonthlyUsage(usage);
    setLoading(false);
  };

  const handleUpgradePro = async () => {
    try {
      const orderRes = await axios.post(`${API_URL}/create-order`, {
        plan: "pro",
        amount: 999,
      });
      const { orderId, keyId } = orderRes.data;

      const options = {
        key: keyId,
        amount: 99900,
        currency: "INR",
        name: "FarmMate",
        description: "FarmMate Pro Plan - 1 Year",
        order_id: orderId,
        handler: async (response) => {
          const verifyRes = await axios.post(`${API_URL}/verify-payment`, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            userId: auth.currentUser.uid,
            plan: "pro",
          });
          if (verifyRes.data.success) {
            const expiry = new Date();
            expiry.setFullYear(expiry.getFullYear() + 1);
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
              plan: "pro",
              planExpiry: expiry.toISOString(),
              paymentId: response.razorpay_payment_id,
            });
            showAlert("🎉 Welcome to FarmMate Pro!");
            loadData();
          }
        },
        prefill: {
          email: auth.currentUser.email,
          name: auth.currentUser.displayName || "",
        },
        theme: { color: GREEN },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      showAlert("Could not initiate payment. Try again.");
    }
  };

  const handleUpgradePayg = () => {
    if (landCount < 10) {
      showAlert("⚠️ Pay As You Go plan is only available when you have reached 10 lands. You currently have " + landCount + " land(s). Add more lands to unlock this plan.");
      return;
    }
    setShowLiveBilling(true);
  };

  const confirmUpgradePayg = () => {
    showConfirm(
      "⚠️ Switching to Pay As You Go means:\n\n" +
      "• You LOSE your Pro plan features\n" +
      "• You pay per use for every feature\n" +
      "• You get a monthly bill on the 1st of each month\n" +
      "• Services stop if bill unpaid by 8th\n\n" +
      "Are you sure you want to switch?",
      async () => {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          plan: "payg",
          paygStartDate: new Date().toISOString(),
        });
        showAlert("✅ Switched to Pay As You Go plan!");
        loadData();
      }
    );
  };

  if (loading) return (
    <div style={{ padding: "40px", fontFamily: FONT, color: "#6b7280" }}>
      Loading...
    </div>
  );

  return (
    <div style={{ fontFamily: FONT, maxWidth: "900px", width: "100%" }}>
      <style>{`
        .plan-card { transition: transform 0.2s, box-shadow 0.2s; }
        .plan-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.1) !important; }
      `}</style>

      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "32px", color: DARK, margin: "0 0 8px 0" }}>
          Subscription Plans
        </h2>
        <p style={{ color: "#6b7280", margin: 0 }}>
          Current plan: <strong style={{ color: userPlan === "payg" ? "#1a6985" : userPlan === "pro" ? GREEN : "#6b7280" }}>
            {userPlan === "payg" ? "⚡ Pay As You Go" : userPlan === "pro" ? "⭐ Farmer Pro" : "🌿 Free"}
          </strong>
        </p>
      </div>

      {/* FREE PLAN USER — show only Pro plan */}
      {userPlan === "free" && (
        <div style={{ maxWidth: "400px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "24px", padding: "16px", background: "#f9fafb", borderRadius: "10px" }}>
            <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
              You are on the <strong>Free Plan</strong> — 1 land, basic features only.
            </p>
          </div>

          <div className="plan-card" style={{
            background: "#f0fdf4", border: `2px solid ${GREEN}`,
            borderRadius: "16px", padding: "32px",
            boxShadow: "0 8px 32px rgba(45,106,79,0.15)",
            position: "relative",
          }}>
            <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: GREEN, color: "white", padding: "4px 20px", borderRadius: "20px", fontSize: "12px", fontWeight: "700" }}>
              ⭐ Recommended
            </div>

            <h3 style={{ fontFamily: "Playfair Display, serif", color: GREEN, fontSize: "26px", margin: "0 0 8px 0" }}>
              Farmer Pro
            </h3>
            <div style={{ fontSize: "42px", fontWeight: "700", color: DARK, fontFamily: "Playfair Display, serif" }}>
              ₹999
            </div>
            <p style={{ color: "#9ca3af", margin: "4px 0 4px 0" }}>per year</p>
            <p style={{ color: GREEN, fontWeight: "600", margin: "0 0 24px 0" }}>Just ₹83/month</p>

            <div style={{ marginBottom: "24px" }}>
              {[
                "Up to 10 lands",
                "Unlimited crop recommendations",
                "Full AI timeline generation",
                "Unlimited disease detection",
                "7-day weather forecast",
                "Weather alert notifications",
                "Priority email support",
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", padding: "6px 0", fontSize: "14px", color: "#374151" }}>
                  <span style={{ color: GREEN, fontWeight: "700" }}>✓</span> {f}
                </div>
              ))}
            </div>

            <button
              onClick={handleUpgradePro}
              style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${GREEN}, ${DARK})`, color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer", fontFamily: FONT }}
            >
              🚀 Upgrade to Pro — ₹999/year
            </button>
          </div>
        </div>
      )}

      {/* PRO PLAN USER — show PAYG option */}
      {userPlan === "pro" && (
        <div>
          {/* Current Pro status */}
          <div style={{ background: "#f0fdf4", border: `1px solid ${GREEN}`, borderRadius: "12px", padding: "20px 24px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <p style={{ margin: "0 0 4px 0", fontWeight: "700", color: GREEN, fontSize: "16px" }}>⭐ You are on Farmer Pro</p>
              <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                {landCount}/10 lands used •
                All features unlocked
              </p>
            </div>
            <div style={{ background: GREEN, color: "white", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600" }}>
              Active Plan
            </div>
          </div>

          {/* PAYG upgrade option */}
          <div className="plan-card" style={{
            background: "#f0f8ff", border: "2px solid #1a6985",
            borderRadius: "16px", padding: "28px",
            boxShadow: "0 4px 20px rgba(26,105,133,0.1)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h3 style={{ fontFamily: "Playfair Display, serif", color: "#1a6985", fontSize: "22px", margin: "0 0 6px 0" }}>
                  ⚡ Pay As You Go
                </h3>
                <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>
                  For power users needing more than 10 lands
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "22px", fontWeight: "700", color: "#1a6985", fontFamily: "Playfair Display, serif" }}>
                  Custom
                </div>
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>pay per use</div>
              </div>
            </div>

            {/* Pricing table */}
            <div style={{ background: "white", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
              <p style={{ margin: "0 0 12px 0", fontWeight: "600", color: DARK, fontSize: "13px" }}>
                📊 Pricing per use
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {Object.entries(PAYG_PRICES).map(([key, { label, price }]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#f8fafc", borderRadius: "6px", fontSize: "13px" }}>
                    <span style={{ color: "#374151" }}>{label}</span>
                    <span style={{ fontWeight: "700", color: "#1a6985" }}>₹{price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live billing toggle */}
            <button
              onClick={() => setShowLiveBilling(!showLiveBilling)}
              style={{ background: showLiveBilling ? "#1a6985" : "white", color: showLiveBilling ? "white" : "#1a6985", border: "1.5px solid #1a6985", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: FONT, marginBottom: "12px" }}
            >
              📊 {showLiveBilling ? "Hide" : "View"} This Month's Running Total
            </button>

            {/* Live billing table */}
            {showLiveBilling && (
              <div style={{ background: "#f0f8ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
                <p style={{ margin: "0 0 10px 0", fontWeight: "600", color: "#1a6985", fontSize: "13px" }}>
                  📈 Running Total —
                  {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </p>
                {monthlyUsage ? (
                  <>
                    {Object.entries(PAYG_PRICES).map(([key, { label }]) => {
                      const count = monthlyUsage[`${key}Count`] || 0;
                      const cost = monthlyUsage[`${key}Cost`] || 0;
                      if (count === 0) return null;
                      return (
                        <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "13px", borderBottom: "1px solid #e0f2fe" }}>
                          <span style={{ color: "#374151" }}>{label} × {count}</span>
                          <span style={{ fontWeight: "600", color: "#1a6985" }}>₹{cost}</span>
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0 0", fontWeight: "700", fontSize: "15px" }}>
                      <span style={{ color: DARK }}>Total so far</span>
                      <span style={{ color: "#1a6985" }}>₹{monthlyUsage.totalCost || 0}</span>
                    </div>
                  </>
                ) : (
                  <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>
                    No usage recorded this month yet.
                  </p>
                )}
              </div>
            )}

            {/* Upgrade button */}
            {landCount < 10 ? (
              <div>
                <button
                  onClick={handleUpgradePayg}
                  style={{ width: "100%", padding: "13px", background: "#e5e7eb", color: "#9ca3af", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "not-allowed", fontFamily: FONT }}
                >
                  🔒 Upgrade to Pay As You Go
                </button>
                <p style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af", margin: "8px 0 0 0" }}>
                  Available when you reach 10 lands ({landCount}/10 used)
                </p>
              </div>
            ) : (
              <button
                onClick={confirmUpgradePayg}
                style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg, #1a6985, #0d4a6b)", color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: FONT }}
              >
                ⚡ Upgrade to Pay As You Go
              </button>
            )}
          </div>
        </div>
      )}

      {/* PAYG USER — show current plan status */}
      {userPlan === "payg" && (
        <div>
          <div style={{ background: "#f0f8ff", border: "2px solid #1a6985", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
            <p style={{ margin: "0 0 4px 0", fontWeight: "700", color: "#1a6985", fontSize: "18px" }}>
              ⚡ You are on Pay As You Go
            </p>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#6b7280" }}>
              You are billed monthly based on your usage.
              Bill generates on the 1st, due by 5th (grace till 8th).
            </p>

            {/* Live billing */}
            <div style={{ background: "white", borderRadius: "10px", padding: "16px" }}>
              <p style={{ margin: "0 0 12px 0", fontWeight: "600", color: DARK, fontSize: "14px" }}>
                📈 This Month's Usage —
                {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </p>
              {monthlyUsage ? (
                <>
                  {Object.entries(PAYG_PRICES).map(([key, { label }]) => {
                    const count = monthlyUsage[`${key}Count`] || 0;
                    const cost = monthlyUsage[`${key}Cost`] || 0;
                    if (count === 0) return null;
                    return (
                      <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", borderBottom: "1px solid #f3f4f6" }}>
                        <span>{label} × {count}</span>
                        <span style={{ fontWeight: "600", color: "#1a6985" }}>₹{cost}</span>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0 0", fontWeight: "700", fontSize: "16px" }}>
                    <span>Estimated Bill</span>
                    <span style={{ color: "#1a6985" }}>₹{monthlyUsage.totalCost || 0}</span>
                  </div>
                </>
              ) : (
                <p style={{ color: "#9ca3af", fontSize: "13px" }}>No usage this month yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "12px", marginTop: "24px" }}>
        🔒 Secure payments via Razorpay • All prices in INR • GST applicable
      </p>
    </div>
  );
}

export default Subscription;
