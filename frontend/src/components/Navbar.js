// src/components/Navbar.js
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useLanguage, LANGUAGES } from "../context/LanguageContext";
import { useGate } from "../hooks/useGate";
import { getUnpaidBill } from "../utils/billManager";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";

const NAV_LINKS = [
  { to: "/home", labelKey: "nav_home", icon: "🏠" },
  { to: "/my-lands", labelKey: "nav_mylands", icon: "🗺️" },
  { to: "/crop-recommendation", labelKey: "nav_croprec", icon: "🌾" },
  { to: "/disease-detection", labelKey: "nav_disease", icon: "🔬" },
  { to: "/weather", labelKey: "nav_weather", icon: "🌤️" },
  { to: "/profile", labelKey: "nav_profile", icon: "👤" },
  { to: "/subscription", labelKey: "nav_plans", icon: "💳" },
];

function Navbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, changeLang, t } = useLanguage();
  const { plan, planExpiry } = useGate();
  const [todayTasks, setTodayTasks] = useState(0);
  const [unpaidBill, setUnpaidBill] = useState(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  useEffect(() => { 
    loadTodayTasks();
    loadUnpaidBill();
  }, []);


  const loadTodayTasks = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const q = query(collection(db, "timelines"), where("userId", "==", auth.currentUser.uid), where("status", "==", "active"));
      const snap = await getDocs(q);
      let count = 0;
      snap.docs.forEach(d => {
        const tasks = d.data().tasks || [];
        count += tasks.filter(t => t.date === today && !t.completed).length;
      });
      setTodayTasks(count);
    } catch {}
  };

  const loadUnpaidBill = async () => {
    try {
      const bill = await getUnpaidBill(auth.currentUser.uid);
      setUnpaidBill(bill);
    } catch {}
  };

  const handleLogout = async () => { await signOut(auth); navigate("/"); };

  const initials = (user?.displayName || user?.email || "F").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap');
        .nav-link { transition: all 0.2s; }
        .nav-link:hover { background: rgba(255,255,255,0.12) !important; }
        .nav-link.active { background: rgba(255,255,255,0.18) !important; font-weight: 600 !important; }
        .logout-btn:hover { background: #dc2626 !important; color: white !important; }
        @media (max-width: 768px) { .nav-links-desktop { display: none !important; } }
      `}</style>

      <nav style={{ background: `linear-gradient(90deg, ${DARK} 0%, ${GREEN} 100%)`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.15)", fontFamily: "DM Sans, sans-serif" }}>

        {/* Brand */}
        <Link to="/home" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
<img src="/logo.png" alt="FarmMate" style={{ width: "22px", height: "22px", objectFit: "contain" }} />
          <span style={{ fontFamily: "Playfair Display, serif", fontSize: "20px", fontWeight: "700", color: "white", letterSpacing: "-0.5px" }}>FarmMate</span>
        </Link>

        {/* Desktop nav links */}
        <div className="nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, justifyContent: "center", margin: "0 20px" }}>
          {NAV_LINKS.map(link => {
            const isActive = location.pathname === link.to;
            const isHome = link.to === "/home";
            return (
              <Link key={link.to} to={link.to}
                className={`nav-link${isActive ? " active" : ""}`}
                style={{ color: "white", textDecoration: "none", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: isActive ? "600" : "400", display: "flex", alignItems: "center", gap: "5px", position: "relative", opacity: isActive ? 1 : 0.85 }}>
                <span style={{ fontSize: "13px" }}>{link.icon}</span>
                {t(link.labelKey)}
                {isHome && todayTasks > 0 && (
                  <span style={{ position: "absolute", top: "0px", right: "0px", background: "#ef4444", color: "white", borderRadius: "10px", fontSize: "10px", fontWeight: "700", padding: "1px 5px", minWidth: "16px", textAlign: "center" }}>
                    {todayTasks}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User section */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)" }} />
          ) : (
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color: "white", border: "2px solid rgba(255,255,255,0.3)" }}>
              {initials}
            </div>
          )}
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.displayName || user?.email?.split("@")[0]}
          </span>
          
          {/* Notification Center */}
          <div style={{ position: "relative" }}>
            <button 
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "6px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              🔔
              {(todayTasks > 0 || unpaidBill || (plan === "pro" && planExpiry && Math.ceil((new Date(planExpiry) - new Date()) / (1000 * 60 * 60 * 24)) <= 15)) && (
                <span style={{ position: "absolute", top: "-5px", right: "-5px", background: "#ef4444", border: "2px solid #2d6a4f", width: "10px", height: "10px", borderRadius: "50%" }} />
              )}
            </button>

            {showNotifMenu && (
              <div style={{ position: "absolute", top: "110%", right: 0, background: "white", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", zIndex: 200, minWidth: "280px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <div style={{ padding: "12px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: "700", color: DARK, fontSize: "14px" }}>Notifications</span>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>{todayTasks > 0 ? "Pending Tasks" : "All Clear"}</span>
                </div>
                
                <div style={{ maxHeight: "350px", overflowY: "auto" }}>
                  {/* Bill Notification */}
                  {unpaidBill && (
                    <div onClick={() => { navigate("/subscription"); setShowNotifMenu(false); }} style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: "#fff5f5" }}>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <span style={{ fontSize: "18px" }}>🧾</span>
                        <div>
                          <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#dc2626" }}>Unpaid Bill: ₹{unpaidBill.totalAmount}</p>
                          <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#991b1b" }}>Due by {new Date(unpaidBill.dueDate).toLocaleDateString("en-IN")}. Pay now to avoid service stop.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pro Renewal Notification */}
                  {plan === "pro" && planExpiry && (() => {
                    const daysLeft = Math.ceil((new Date(planExpiry) - new Date()) / (1000 * 60 * 60 * 24));
                    if (daysLeft <= 15 && daysLeft > 0) {
                      return (
                        <div onClick={() => { navigate("/subscription"); setShowNotifMenu(false); }} style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: "#fffbeb" }}>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <span style={{ fontSize: "18px" }}>⭐</span>
                            <div>
                              <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#854d0e" }}>Pro Plan Expires in {daysLeft}d</p>
                              <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#a16207" }}>Renew your subscription to keep premium benefits.</p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Today's Tasks Notification */}
                  {todayTasks > 0 ? (
                    <div onClick={() => { navigate("/home"); setShowNotifMenu(false); }} style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <span style={{ fontSize: "18px" }}>📋</span>
                        <div>
                          <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: DARK }}>{todayTasks} Pending Tasks Today</p>
                          <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#6b7280" }}>Don't forget to complete your farm activities today!</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    (!unpaidBill && !(plan === "pro" && planExpiry && Math.ceil((new Date(planExpiry) - new Date()) / (1000 * 60 * 60 * 24)) <= 15)) && (
                      <div style={{ padding: "30px 20px", textAlign: "center", color: "#9ca3af" }}>
                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>🍃</div>
                        <p style={{ margin: 0, fontSize: "13px" }}>All caught up! No new notifications.</p>
                      </div>
                    )
                  )}
                </div>
                
                <div style={{ padding: "8px", background: "#f9fafb", textAlign: "center" }}>
                  <button onClick={() => { navigate("/subscription"); setShowNotifMenu(false); }} style={{ background: "transparent", border: "none", color: GREEN, fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Manage Plans & Billing</button>
                </div>
              </div>
            )}
          </div>
          

          

          {/* Language Selector */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontFamily: "DM Sans, sans-serif" }}
            >
              🌐 {LANGUAGES.find(l => l.code === lang)?.label}
            </button>

            {showLangMenu && (
              <div style={{ position: "absolute", top: "110%", right: 0, background: "white", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 200, minWidth: "160px", overflow: "hidden" }}>
                {LANGUAGES.map(language => (
                  <div
                    key={language.code}
                    onClick={() => { changeLang(language.code); setShowLangMenu(false); }}
                    style={{ padding: "10px 16px", cursor: "pointer", fontSize: "13px", color: lang === language.code ? "#2d6a4f" : "#374151", fontWeight: lang === language.code ? "700" : "400", background: lang === language.code ? "#f0f7f4" : "white", display: "flex", alignItems: "center", gap: "8px", transition: "background 0.15s" }}
                  >
                    {language.flag} {language.label}
                    {lang === language.code && <span style={{ marginLeft: "auto" }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="logout-btn" onClick={handleLogout}
            style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontSize: "12px", fontWeight: "500", transition: "all 0.2s" }}>
            {t("nav_signout")}
          </button>
        </div>
      </nav>
    </>
  );
}

export default Navbar;