// src/pages/Home.js
import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { getUserPlanInfo } from "../utils/updatePlan";
import { useGate } from "../hooks/useGate";
import axios from "axios";
import API_URL from "../config";
import { db, auth } from "../firebase";
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from "firebase/firestore";
import { getUnpaidBill, generateMonthlyBill, isServiceStopped } from "../utils/billManager";
import BillPopup from "../components/BillPopup";
import BillBanner from "../components/BillBanner";
const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";

const TYPE_COLORS = {
  sowing: "#2d6a4f", watering: "#1a6985", fertilizing: "#e09f3e",
  weeding: "#6b4f2a", pest_control: "#c0392b", monitoring: "#8e44ad", harvesting: "#e67e22",
};

const TYPE_ICONS = {
  sowing: "🌱", watering: "💧", fertilizing: "🧪",
  weeding: "🌿", pest_control: "🐛", monitoring: "👁️", harvesting: "🌾",
};

function Home({ user }) {
  const { t, lang } = useLanguage();
  const { plan, planExpiry, refreshPlan } = useGate();
  const [paying, setPaying] = useState(false);
  const [unpaidBill, setUnpaidBill] = useState(null);
  const [showBillPopup, setShowBillPopup] = useState(false);
  const [userDoc, setUserDoc] = useState(null);
  const [timelines, setTimelines] = useState([]);
  const [calView, setCalView] = useState("today");
  const [selectedTimeline, setSelectedTimeline] = useState("all");
  const [noteInput, setNoteInput] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedTask, setExpandedTask] = useState(null);

  useEffect(() => {
    loadTimelines();
    checkBill();
  }, []);

  const checkBill = async () => {
    const uid = auth.currentUser.uid;

    // Load user doc
    const userSnap = await getDoc(doc(db, "users", uid));
    const userData = userSnap.exists() ? userSnap.data() : null;
    setUserDoc(userData);

    // 1. Always check for unpaid bills (even if user downgraded to Pro)
    const bill = await getUnpaidBill(uid);
    if (bill) {
      setUnpaidBill(bill);
      setShowBillPopup(true);
    }

    // 2. On the 1st of the month, generate previous month's bill
    const today = new Date();
    if (today.getDate() === 1) {
      await generateMonthlyBill(uid);
    }
  };

  const loadTimelines = async () => {
    const q = query(collection(db, "timelines"), where("userId", "==", auth.currentUser.uid), where("status", "==", "active"));
    const snap = await getDocs(q);
    setTimelines(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const handleRenewPro = async () => {
    setPaying(true);
    try {
      const res = await axios.post(`${API_URL}/create-order`, { amount: 999, plan: "pro" });
      const { orderId, keyId } = res.data;
      const options = {
        key: keyId, amount: 99900, currency: "INR", name: "FarmMate", description: "Pro Plan Renewal", order_id: orderId,
        handler: async (response) => {
          const { updateUserPlan } = await import("../utils/updatePlan");
          await updateUserPlan(auth.currentUser.uid, "pro", response.razorpay_payment_id);
          await refreshPlan();
          alert("✅ Subscription renewed successfully! Your Pro plan is active for another year.");
        },
        prefill: { email: auth.currentUser.email, name: auth.currentUser.displayName || "" },
        theme: { color: GREEN },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch { alert("Could not initiate payment. Try again."); }
    setPaying(false);
  };

  const handlePayBill = async () => {
    if (!unpaidBill) return;
    setPaying(true);
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
        },
        prefill: { email: auth.currentUser.email, name: auth.currentUser.displayName || "" },
        theme: { color: GREEN },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      alert("Could not initiate payment. Try again.");
    }
    setPaying(false);
  };

  const today = new Date().toISOString().split("T")[0];

  const getAllTasks = () => {
    const tls = selectedTimeline === "all" ? timelines : timelines.filter(t => t.id === selectedTimeline);
    return tls.flatMap(tl => (tl.tasks || []).map(task => ({ ...task, timelineId: tl.id, crop: tl.crop, landName: tl.landName })));
  };

  const getFilteredTasks = () => {
    const allTasks = getAllTasks();
    const now = new Date();
    if (calView === "today") return allTasks.filter(t => t.date === today);
    if (calView === "weekly") { const e = new Date(now); e.setDate(now.getDate() + 7); return allTasks.filter(t => { const d = new Date(t.date); return d >= now && d <= e; }); }
    if (calView === "monthly") { const e = new Date(now); e.setDate(now.getDate() + 30); return allTasks.filter(t => { const d = new Date(t.date); return d >= now && d <= e; }); }
    return allTasks;
  };

  const handleComplete = async (timelineId, taskId, notes) => {
    const tl = timelines.find(t => t.id === timelineId);
    if (!tl) return;
    const updatedTasks = tl.tasks.map(task =>
      task.id === taskId ? { ...task, completed: true, notes, completedAt: new Date().toISOString() } : task
    );
    await updateDoc(doc(db, "timelines", timelineId), { tasks: updatedTasks });
    loadTimelines();
    setNoteInput(prev => ({ ...prev, [taskId]: "" }));
    setExpandedTask(null);
  };

  const handleUndo = async (timelineId, taskId) => {
    const tl = timelines.find(t => t.id === timelineId);
    if (!tl) return;
    const updatedTasks = tl.tasks.map(task =>
      task.id === taskId ? { ...task, completed: false, notes: "", completedAt: null } : task
    );
    await updateDoc(doc(db, "timelines", timelineId), { tasks: updatedTasks });
    loadTimelines();
  };

  const todayTasks = getAllTasks().filter(t => t.date === today);
  const pendingToday = todayTasks.filter(t => !t.completed).length;
  const filteredTasks = getFilteredTasks();

  const groupByDate = (tasks) => {
    const groups = {};
    tasks.forEach(task => { if (!groups[task.date]) groups[task.date] = []; groups[task.date].push(task); });
    return Object.entries(groups).sort(([a], [b]) => new Date(a) - new Date(b));
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("home_good_morning") : hour < 17 ? t("home_good_afternoon") : t("home_good_evening");

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", fontFamily: FONT }}>
      <div style={{ color: GREEN, fontSize: "16px" }}>🌱 {t("common_loading")}</div>
    </div>
  );

  return (
    <div style={{ fontFamily: FONT, width: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap');
        .view-btn.active { background: ${GREEN} !important; color: white !important; }
        .view-btn:hover { background: #f0f7f4 !important; }
        .task-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; }
        .complete-btn:hover { background: #1b4332 !important; }
        .undo-btn:hover { background: #f3f4f6 !important; }
        
        @media (max-width: 768px) {
          .welcome-banner { padding: 20px !important; flex-direction: column !important; align-items: flex-start !important; }
          .welcome-stats { width: 100% !important; justify-content: space-between !important; margin-top: 10px !important; }
          .welcome-stats > div { flex: 1 !important; padding: 12px !important; }
          .cal-controls { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .cal-controls > div { width: 100% !important; overflow-x: auto !important; padding-bottom: 5px !important; }
          .cal-controls select { width: 100% !important; }
          .task-grid { grid-template-columns: 1fr !important; }
          .crop-summary-grid { grid-template-columns: 1fr !important; }
          .welcome-title { fontSize: 22px !important; }
        }
      `}</style>

      {/* Welcome Banner */}
      <div className="welcome-banner" style={{ background: `linear-gradient(135deg, ${DARK} 0%, ${GREEN} 100%)`, borderRadius: "0", padding: "40px 60px", marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "24px", boxShadow: "0 12px 40px rgba(45,106,79,0.2)", width: "100%", boxSizing: "border-box" }}>
        <div>
          <p style={{ color: "rgba(255,255,255,0.6)", margin: "0 0 4px 0", fontSize: "13px" }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h2 className="welcome-title" style={{ fontFamily: "Playfair Display, serif", color: "white", margin: "0 0 6px 0", fontSize: "26px" }}>
            {greeting}, {user?.displayName?.split(" ")[0] || "Farmer"}! 🌱
          </h2>
          <p style={{ color: "rgba(255,255,255,0.75)", margin: 0, fontSize: "14px" }}>
            {timelines.length > 0 ? `${timelines.length} ${t("home_active_crops")}` : t("home_no_crops")}
          </p>
        </div>
        <div className="welcome-stats" style={{ display: "flex", gap: "16px" }}>
          <div style={{ textAlign: "center", background: "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "16px 24px" }}>
            <div style={{ fontSize: "32px", fontWeight: "700", color: pendingToday > 0 ? "#fbbf24" : "#6ee7b7", fontFamily: "Playfair Display, serif" }}>{pendingToday}</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{t("home_tasks_today")}</div>
          </div>
          <div style={{ textAlign: "center", background: "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "16px 24px" }}>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#6ee7b7", fontFamily: "Playfair Display, serif" }}>{timelines.length}</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{t("home_active_crops")}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 40px 40px 40px" }}>
        {unpaidBill && !showBillPopup && (
          <div onClick={() => setShowBillPopup(true)} style={{ cursor: "pointer" }}>
            <BillBanner
              bill={unpaidBill}
              onPayNow={(e) => {
                e.stopPropagation();
                handlePayBill();
              }}
            />
          </div>
        )}

        {/* Pro Plan Renewal Reminder */}
        {plan === "pro" && planExpiry && (() => {
          const daysLeft = Math.ceil((new Date(planExpiry) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 15 && daysLeft > 0) {
            return (
              <div style={{ background: "#fffbeb", border: "1px solid #fef08a", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ fontSize: "13px", color: "#854d0e" }}>
                  ⭐ <strong>Farmer Pro</strong> expires in <strong>{daysLeft} days</strong>. Renew now to keep your benefits!
                </div>
                <button
                  onClick={handleRenewPro}
                  disabled={paying}
                  style={{ background: "#f59e0b", color: "white", border: "none", padding: "6px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: FONT }}
                >
                  {paying ? "..." : "💳 Renew Now ₹999"}
                </button>
              </div>
            );
          }
          return null;
        })()}

        {/* Bill Popup */}
        {showBillPopup && unpaidBill && (
          <BillPopup
            bill={unpaidBill}
            onPaid={() => {
              setUnpaidBill(null);
              setShowBillPopup(false);
            }}
          />
        )}

        {timelines.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 40px", background: "white", borderRadius: "16px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>🌾</div>
            <h3 style={{ fontFamily: "Playfair Display, serif", color: DARK, fontSize: "24px", margin: "0 0 8px 0" }}>{t("home_no_crops")}</h3>
            <p style={{ color: "#6b7280", margin: 0 }}>{t("home_no_crops_sub")}</p>
          </div>
        ) : (
          <>
            {/* Crop summary cards */}
            <div className="crop-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px", marginBottom: "40px" }}>
              {timelines.map(tl => {
                const completed = tl.tasks?.filter(t => t.completed).length || 0;
                const totalTasks = tl.tasks?.length || 0;
                const progress = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
                const daysLeft = Math.max(0, Math.ceil((new Date(tl.harvestDate) - new Date()) / (1000 * 60 * 60 * 24)));
                const todayCount = tl.tasks?.filter(t => t.date === today && !t.completed).length || 0;

                return (
                  <div key={tl.id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div>
                        <h4 style={{ fontFamily: "Playfair Display, serif", color: DARK, margin: "0 0 4px 0", fontSize: "18px" }}>🌾 {tl.crop}</h4>
                        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>🗺️ {tl.landName}</p>
                      </div>
                      {todayCount > 0 && (
                        <span style={{ background: "#fef3c7", color: "#d97706", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: "700" }}>
                          {todayCount} {t("home_tasks_today")}
                        </span>
                      )}
                    </div>
                    <div style={{ marginBottom: "8px" }}>
                      <div style={{ background: "#e5e7eb", borderRadius: "6px", height: "8px" }}>
                        <div style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${GREEN}, #52b788)`, height: "8px", borderRadius: "6px" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9ca3af" }}>
                      <span>{progress}% done</span><span>{daysLeft}d left</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calendar controls */}
            <div className="cal-controls" style={{ display: "flex", gap: "16px", marginBottom: "24px", alignItems: "center", flexWrap: "wrap", background: "white", padding: "16px 24px", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                {[["today", t("home_today")], ["weekly", t("home_7days")], ["monthly", t("home_30days")], ["full", t("home_full")]].map(([v, l]) => (
                  <button key={v} className={`view-btn${calView === v ? " active" : ""}`}
                    onClick={() => setCalView(v)}
                    style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid #e5e7eb", background: "white", color: "#6b7280", cursor: "pointer", fontFamily: FONT, fontSize: "14px", fontWeight: "500", transition: "all 0.2s", whiteSpace: "nowrap" }}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: "auto" }}>
                <select value={selectedTimeline} onChange={e => setSelectedTimeline(e.target.value)}
                  style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #e5e7eb", fontFamily: FONT, fontSize: "14px", color: "#374151", background: "white", outline: "none" }}>
                  <option value="all">{t("home_all_crops")}</option>
                  {timelines.map(tl => <option key={tl.id} value={tl.id}>{tl.crop} — {tl.landName}</option>)}
                </select>
              </div>
            </div>

            {/* Task list */}
            {filteredTasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "20px", border: "1px solid #e5e7eb", color: "#9ca3af" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
                <p style={{ margin: 0, fontSize: "16px" }}>No tasks for this period!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {groupByDate(filteredTasks).map(([date, tasks]) => (
                  <div key={date}>
                    {/* Date header */}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                      <div style={{ background: date === today ? GREEN : "#f3f4f6", color: date === today ? "white" : "#6b7280", borderRadius: "10px", padding: "8px 20px", fontSize: "14px", fontWeight: "600", boxShadow: date === today ? "0 4px 12px rgba(45,106,79,0.2)" : "none" }}>
                        {date === today ? `📅 ${t("home_today")}` : new Date(date + 'T00:00:00').toLocaleDateString(lang === "en" ? "en-IN" : lang === "hi" ? "hi-IN" : lang === "te" ? "te-IN" : "ta-IN", { weekday: "short", day: "numeric", month: "short" })}
                      </div>
                      <div style={{ flex: 1, height: "1.5px", background: "#e5e7eb" }} />
                      <span style={{ fontSize: "13px", color: "#9ca3af", fontWeight: "500" }}>{tasks.filter(t => t.completed).length}/{tasks.length} {t("common_save").toLowerCase().includes("save") ? "done" : ""}</span>
                    </div>

                    <div className="task-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "16px" }}>
                      {tasks.map((task, i) => (
                        <div key={i} className="task-card" style={{
                          background: task.completed ? "#fafafa" : "white",
                          border: "1px solid #e5e7eb",
                          borderLeft: `4px solid ${task.completed ? "#d1d5db" : (TYPE_COLORS[task.type] || "#888")}`,
                          borderRadius: "10px", padding: "14px 16px",
                          opacity: task.completed ? 0.75 : 1,
                          transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                <span style={{ fontSize: "16px" }}>{TYPE_ICONS[task.type] || "📋"}</span>
                                <strong style={{ fontSize: "14px", color: task.completed ? "#9ca3af" : "#374151", textDecoration: task.completed ? "line-through" : "none" }}>
                                  {task.title}
                                </strong>
                                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "8px", background: (TYPE_COLORS[task.type] || "#888") + "22", color: TYPE_COLORS[task.type] || "#888", fontWeight: "600" }}>
                                  {task.type}
                                </span>
                                {task.priority === "high" && !task.completed && <span style={{ fontSize: "10px", color: "#dc2626", fontWeight: "600" }}>⚠️ {t("home_high_priority")}</span>}
                                {task.weatherSensitive && !task.completed && <span style={{ fontSize: "10px", color: "#1a6985" }}>🌧 {t("home_weather_sensitive")}</span>}
                              </div>
                              <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#6b7280" }}>{task.description}</p>
                              <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>🌾 {task.crop} • 🗺️ {task.landName}</p>
                              {task.completed && task.notes && (
                                <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: GREEN, fontStyle: "italic", background: "#f0f7f4", padding: "6px 10px", borderRadius: "6px" }}>
                                  📝 {task.notes}
                                </p>
                              )}
                              {task.completed && task.completedAt && (
                                <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#d1d5db" }}>
                                  ✅ {new Date(task.completedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              )}
                            </div>
                            <div>
                              {task.completed ? (
                                <button className="undo-btn" onClick={() => handleUndo(task.timelineId, task.id)}
                                  style={{ padding: "6px 12px", background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontFamily: FONT, fontSize: "12px", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                                  ↩️ {t("home_undo")}
                                </button>
                              ) : (
                                <button className="complete-btn"
                                  onClick={() => setExpandedTask(expandedTask === `${task.timelineId}-${task.id}` ? null : `${task.timelineId}-${task.id}`)}
                                  style={{ padding: "6px 12px", background: GREEN, color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: FONT, fontSize: "12px", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                                  ✅ {t("home_mark_done")}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expand note input */}
                          {!task.completed && expandedTask === `${task.timelineId}-${task.id}` && (
                            <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                              <input
                                type="text"
                                placeholder={t("home_add_note")}
                                value={noteInput[task.id] || ""}
                                onChange={e => setNoteInput(prev => ({ ...prev, [task.id]: e.target.value }))}
                                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #e5e7eb", fontSize: "13px", fontFamily: FONT }}
                                onKeyDown={e => e.key === "Enter" && handleComplete(task.timelineId, task.id, noteInput[task.id] || "")}
                              />
                              <button onClick={() => handleComplete(task.timelineId, task.id, noteInput[task.id] || "")}
                                style={{ padding: "8px 16px", background: GREEN, color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: FONT, fontSize: "13px", fontWeight: "600" }}>
                                {t("common_save")}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
                    {tasks.map((task, i) => (
                      <div key={i} className="task-card" style={{
                        background: task.completed ? "#fafafa" : "white",
                        border: "1px solid #e5e7eb",
                        borderLeft: `4px solid ${task.completed ? "#d1d5db" : (TYPE_COLORS[task.type] || "#888")}`,
                        borderRadius: "10px", padding: "14px 16px",
                        opacity: task.completed ? 0.75 : 1,
                        transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                              <span style={{ fontSize: "16px" }}>{TYPE_ICONS[task.type] || "📋"}</span>
                              <strong style={{ fontSize: "14px", color: task.completed ? "#9ca3af" : "#374151", textDecoration: task.completed ? "line-through" : "none" }}>
                                {task.title}
                              </strong>
                              <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "8px", background: (TYPE_COLORS[task.type] || "#888") + "22", color: TYPE_COLORS[task.type] || "#888", fontWeight: "600" }}>
                                {task.type}
                              </span>
                              {task.priority === "high" && !task.completed && <span style={{ fontSize: "10px", color: "#dc2626", fontWeight: "600" }}>⚠️ {t("home_high_priority")}</span>}
                              {task.weatherSensitive && !task.completed && <span style={{ fontSize: "10px", color: "#1a6985" }}>🌧 {t("home_weather_sensitive")}</span>}
                            </div>
                            <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#6b7280" }}>{task.description}</p>
                            <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>🌾 {task.crop} • 🗺️ {task.landName}</p>
                            {task.completed && task.notes && (
                              <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: GREEN, fontStyle: "italic", background: "#f0f7f4", padding: "6px 10px", borderRadius: "6px" }}>
                                📝 {task.notes}
                              </p>
                            )}
                            {task.completed && task.completedAt && (
                              <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#d1d5db" }}>
                                ✅ {new Date(task.completedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            )}
                          </div>
                          <div>
                            {task.completed ? (
                              <button className="undo-btn" onClick={() => handleUndo(task.timelineId, task.id)}
                                style={{ padding: "6px 12px", background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontFamily: FONT, fontSize: "12px", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                                ↩️ {t("home_undo")}
                              </button>
                            ) : (
                              <button className="complete-btn"
                                onClick={() => setExpandedTask(expandedTask === `${task.timelineId}-${task.id}` ? null : `${task.timelineId}-${task.id}`)}
                                style={{ padding: "6px 12px", background: GREEN, color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: FONT, fontSize: "12px", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                                ✅ {t("home_mark_done")}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expand note input */}
                        {!task.completed && expandedTask === `${task.timelineId}-${task.id}` && (
                          <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                            <input
                              type="text"
                              placeholder={t("home_add_note")}
                              value={noteInput[task.id] || ""}
                              onChange={e => setNoteInput(prev => ({ ...prev, [task.id]: e.target.value }))}
                              style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #e5e7eb", fontSize: "13px", fontFamily: FONT }}
                              onKeyDown={e => e.key === "Enter" && handleComplete(task.timelineId, task.id, noteInput[task.id] || "")}
                            />
                            <button onClick={() => handleComplete(task.timelineId, task.id, noteInput[task.id] || "")}
                              style={{ padding: "8px 16px", background: GREEN, color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: FONT, fontSize: "13px", fontWeight: "600" }}>
                              {t("common_save")}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Home;