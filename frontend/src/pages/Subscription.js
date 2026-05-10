// src/pages/Subscription.js
import { useState, useEffect } from "react";
import { getUserPlanInfo } from "../utils/updatePlan";
import { getMonthlyUsage } from "../utils/trackUsage";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import axios from "axios";
import API_URL from "../config";
import { PAYG_PRICES } from "../utils/paygPricing";
import { usePopup } from "../context/PopupContext";
import { getUnpaidBill, generateMonthlyBill } from "../utils/billManager";
import BillBanner from "../components/BillBanner";
import BillPopup from "../components/BillPopup";

const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";

function Subscription({ user }) {
  const { showAlert, showConfirm } = usePopup();
  const [userPlan, setUserPlan] = useState("free");
  const [landCount, setLandCount] = useState(0);
  const [monthlyUsage, setMonthlyUsage] = useState(null);
  const [unpaidBill, setUnpaidBill] = useState(null);
  const [showBillPopup, setShowBillPopup] = useState(false);
  const [paygLandCount, setPaygLandCount] = useState(0);
  const [planExpiry, setPlanExpiry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const uid = auth.currentUser.uid;
    const { plan, planExpiry: expiry } = await getUserPlanInfo(uid);
    setUserPlan(plan);
    setPlanExpiry(expiry);

    const landsQuery = query(collection(db, "lands"), where("userId", "==", uid));
    const landsSnap = await getDocs(landsQuery);
    setLandCount(landsSnap.size);

    const usage = await getMonthlyUsage(uid);
    setMonthlyUsage(usage);

    const bill = await getUnpaidBill(uid);
    setUnpaidBill(bill);

    // Count PAYG lands
    const landsQ = query(
      collection(db, "lands"),
      where("userId", "==", uid),
      where("isPayg", "==", true)
    );
    const landsSnap = await getDocs(landsQ);
    setPaygLandCount(landsSnap.size);

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

  const handlePayBill = async () => {
    if (!unpaidBill) return;
    try {
      const orderRes = await axios.post(`${API_URL}/create-order`, {
        amount: unpaidBill.totalAmount,
        plan: "payg_bill",
        billId: unpaidBill.id,
      });

      const { orderId, keyId } = orderRes.data;

      const options = {
        key: keyId,
        amount: unpaidBill.totalAmount * 100,
        currency: "INR",
        name: "FarmMate",
        description: `Bill for ${unpaidBill.month}`,
        order_id: orderId,
        handler: async (response) => {
          const { markBillPaid } = await import("../utils/billManager");
          await markBillPaid(auth.currentUser.uid, unpaidBill.id, response.razorpay_payment_id);
          setUnpaidBill(null);
          alert("✅ Payment successful! Services restored.");
          loadData();
        },
        prefill: { email: auth.currentUser.email, name: auth.currentUser.displayName || "" },
        theme: { color: GREEN },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      alert("Could not initiate payment. Try again.");
    }
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
          {userPlan === "pro" && planExpiry && (
            <span style={{ fontSize: "13px", marginLeft: "12px", color: "#6b7280" }}>
              (Expires {new Date(planExpiry).toLocaleDateString("en-IN")})
            </span>
          )}
        </p>
      </div>

      {userPlan === "pro" && planExpiry && (() => {
        const daysLeft = Math.ceil((new Date(planExpiry) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 15 && daysLeft > 0) {
          return (
            <div style={{ background: "#fffbeb", border: "1px solid #fef08a", borderRadius: "12px", padding: "16px 20px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "24px" }}>⏰</span>
                <div>
                  <p style={{ margin: 0, fontWeight: "700", color: "#854d0e" }}>Pro Plan expires in {daysLeft} days</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#a16207" }}>Renew now to keep your unlimited land access and premium features.</p>
                </div>
              </div>
              <button
                onClick={() => handlePay(999, "pro")}
                style={{ background: "#f59e0b", color: "white", border: "none", padding: "8px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontFamily: FONT }}
              >
                Renew Now ₹999
              </button>
            </div>
          );
        }
        return null;
      })()}

      {unpaidBill && (
        <div onClick={() => setShowBillPopup(true)} style={{ marginBottom: "24px", cursor: "pointer" }}>
          <BillBanner
            bill={unpaidBill}
            onPayNow={(e) => {
              e.stopPropagation();
              handlePayBill();
            }}
          />
        </div>
      )}

      {showBillPopup && unpaidBill && (
        <BillPopup
          bill={unpaidBill}
          onPaid={() => {
            setUnpaidBill(null);
            setShowBillPopup(false);
            loadData();
          }}
        />
      )}

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
                {landCount}/10 lands used • All features unlocked
              </p>
            </div>
            <div style={{ background: GREEN, color: "white", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600" }}>
              Active Plan
            </div>
          </div>

          {/* PAYG upgrade card — clean, no prices */}
          <div className="plan-card" style={{
            background: "#f0f8ff",
            border: `2px solid ${landCount >= 10 ? "#1a6985" : "#e5e7eb"}`,
            borderRadius: "16px", padding: "28px",
            boxShadow: "0 4px 20px rgba(26,105,133,0.08)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h3 style={{ fontFamily: "Playfair Display, serif", color: "#1a6985", fontSize: "22px", margin: "0 0 6px 0" }}>
                  ⚡ Pay As You Go
                </h3>
                <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>
                  For power users needing more than 10 lands
                </p>
              </div>
              <span style={{ background: "#e0f2fe", color: "#1a6985", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
                Extension Plan
              </span>
            </div>

            {/* Features list only — no prices */}
            <div style={{ background: "white", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
              <p style={{ margin: "0 0 12px 0", fontWeight: "600", color: DARK, fontSize: "13px" }}>
                What's included
              </p>
              {[
                "Unlimited lands (beyond 10)",
                "Pay only for what you use",
                "All premium features available",
                "Monthly bill on 1st of each month",
                "3-day grace period for payment",
                "Multiple farm managers",
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", padding: "5px 0", fontSize: "13px", color: "#374151", borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{ color: "#1a6985", fontWeight: "700" }}>✓</span> {f}
                </div>
              ))}
            </div>

            {/* Upgrade button — locked or unlocked based on land count */}
            {landCount < 10 ? (
              <div>
                <button
                  disabled
                  style={{ width: "100%", padding: "13px", background: "#f3f4f6", color: "#9ca3af", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "not-allowed", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  🔒 Upgrade to Pay As You Go
                </button>
                <p style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af", margin: "10px 0 0 0" }}>
                  Available only when you reach 10 lands ({landCount}/10 used)
                </p>
              </div>
            ) : (
              <div>
                <button
                  onClick={confirmUpgradePayg}
                  style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg, #1a6985, #0d4a6b)", color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: FONT }}
                >
                  ⚡ Upgrade to Pay As You Go
                </button>
                <p style={{ textAlign: "center", fontSize: "12px", color: "#6b7280", margin: "10px 0 0 0" }}>
                  You have reached 10 lands — eligible to upgrade!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAYG USER — show running total only, no prices */}
      {userPlan === "payg" && (
        <div>
          {/* PAYG status banner */}
          <div style={{ background: "#f0f8ff", border: "2px solid #1a6985", borderRadius: "12px", padding: "20px 24px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <p style={{ margin: "0 0 4px 0", fontWeight: "700", color: "#1a6985", fontSize: "16px" }}>⚡ You are on Pay As You Go</p>
              <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                Billed monthly • Bill on 1st • Due by 5th • Grace till 8th
              </p>
            </div>
            <div style={{ background: "#1a6985", color: "white", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600" }}>
              Active Plan
            </div>
          </div>

          {/* This month's running total */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontFamily: "Playfair Display, serif", color: DARK, margin: "0 0 6px 0", fontSize: "20px" }}>
              📈 This Month's Usage
            </h3>
            <p style={{ color: "#9ca3af", fontSize: "13px", margin: "0 0 20px 0" }}>
              {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </p>

            {(monthlyUsage?.totalCost || 0) + (paygLandCount * 30) > 0 ? (
              <>
                {/* Grocery style bill */}
                <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                    <span>Service</span>
                    <span style={{ textAlign: "center" }}>Qty</span>
                    <span style={{ textAlign: "right" }}>Rate</span>
                    <span style={{ textAlign: "right" }}>Total</span>
                  </div>

                  <div style={{ height: "1px", background: "#e5e7eb", marginBottom: "10px" }} />

                  {/* Extra land base charge */}
                  {paygLandCount > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "7px 0", borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}>
                      <span style={{ color: "#374151" }}>Extra Lands (Base)</span>
                      <span style={{ textAlign: "center", color: "#6b7280" }}>{paygLandCount}</span>
                      <span style={{ textAlign: "right", color: "#6b7280" }}>₹30</span>
                      <span style={{ textAlign: "right", fontWeight: "600", color: "#1a6985" }}>₹{paygLandCount * 30}</span>
                    </div>
                  )}

                  {Object.entries(PAYG_PRICES).map(([key, { label, price }]) => {
                    const count = monthlyUsage[`${key}Count`] || 0;
                    const cost = monthlyUsage[`${key}Cost`] || 0;
                    if (count === 0) return null;
                    return (
                      <div key={key} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "7px 0", borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}>
                        <span style={{ color: "#374151" }}>{label}</span>
                        <span style={{ textAlign: "center", color: "#6b7280" }}>{count}</span>
                        <span style={{ textAlign: "right", color: "#6b7280" }}>₹{price}</span>
                        <span style={{ textAlign: "right", fontWeight: "600", color: "#374151" }}>₹{cost}</span>
                      </div>
                    );
                  })}

                  <div style={{ height: "2px", background: "#e5e7eb", margin: "12px 0" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "16px" }}>
                    <span style={{ color: DARK }}>Estimated Bill</span>
                    <span style={{ color: "#1a6985", fontSize: "20px", fontFamily: "Playfair Display, serif" }}>
                      ₹{monthlyUsage.totalCost + (paygLandCount * 30)}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: "20px", background: "#f0f8ff", borderRadius: "10px", padding: "14px", border: "1px solid #d1e9ff" }}>
                  <p style={{ fontSize: "12px", color: "#1a6985", margin: 0, lineHeight: "1.5" }}>
                    ⚡ <strong>Tiered Billing Policy:</strong> You are only charged for features used on lands <strong>beyond your first 10 lands</strong>. 
                    Usage on your first 10 lands remains free under your Farmer Pro plan coverage. Base charge of ₹30/month applies per extra land.
                  </p>
                </div>

                <p style={{ fontSize: "12px", color: "#9ca3af", margin: "12px 0 0 0", textAlign: "center" }}>
                  ⚠️ Bill is generated on the 1st of next month. Due by 5th, grace period till 8th.
                </p>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "30px", background: "#f9fafb", borderRadius: "10px" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
                <p style={{ color: "#6b7280", margin: 0 }}>No usage recorded this month yet.</p>
                <p style={{ color: "#9ca3af", fontSize: "12px", margin: "4px 0 0 0" }}>Your bill will be ₹0 if no services are used.</p>
              </div>
            )}
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
