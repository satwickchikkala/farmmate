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
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => { 
    loadTodayTasks();
    loadUnpaidBill();
  }, []);

  // Close menus when location changes
  useEffect(() => {
    setShowMobileMenu(false);
    setShowNotifMenu(false);
    setShowLangMenu(false);
  }, [location.pathname]);

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
        
        @media (max-width: 900px) { 
          .nav-links-desktop { display: none !important; }
          .hamburger-btn { display: flex !important; }
          .user-name-desktop { display: none !important; }
        }
        @media (min-width: 901px) {
          .hamburger-btn { display: none !important; }
          .mobile-menu-overlay { display: none !important; }
        }
      `}</style>

      <nav style={{ background: `linear-gradient(90deg, ${DARK} 0%, ${GREEN} 100%)`, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px", position: "sticky", top: 0, zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontFamily: "DM Sans, sans-serif" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Hamburger Menu Icon */}
          <button 
            className="hamburger-btn"
            onClick={() => setShowMobileMenu(true)}
            style={{ background: "none", border: "none", color: "white", fontSize: "24px", cursor: "pointer", display: "none", padding: 0 }}
          >
            ☰
          </button>

          {/* Brand */}
          <Link to="/home" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <img src="/logo.png" alt="FarmMate" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
            <span style={{ fontFamily: "Playfair Display, serif", fontSize: "22px", fontWeight: "700", color: "white", letterSpacing: "-0.5px" }}>FarmMate</span>
          </Link>
        </div>

        {/* Desktop nav links */}
        <div className="nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, justifyContent: "center", margin: "0 20px" }}>
          {NAV_LINKS.map(link => {
            const isActive = location.pathname === link.to;
            const isHome = link.to === "/home";
            return (
              <Link key={link.to} to={link.to}
                className={`nav-link${isActive ? " active" : ""}`}
                style={{ color: "white", textDecoration: "none", padding: "8px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: isActive ? "600" : "400", display: "flex", alignItems: "center", gap: "6px", position: "relative", opacity: isActive ? 1 : 0.9 }}>
                <span style={{ fontSize: "16px" }}>{link.icon}</span>
                {t(link.labelKey)}
                {isHome && todayTasks > 0 && (
                  <span style={{ position: "absolute", top: "2px", right: "2px", background: "#ef4444", color: "white", borderRadius: "10px", fontSize: "10px", fontWeight: "700", padding: "1px 5px", minWidth: "16px", textAlign: "center", border: "1.5px solid #2d6a4f" }}>
                    {todayTasks}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User section */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          
          {/* Notification Center */}
          <div style={{ position: "relative" }}>
            <button 
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "8px", borderRadius: "10px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
            >
              🔔
              {(todayTasks > 0 || unpaidBill || (plan === "pro" && planExpiry && Math.ceil((new Date(planExpiry) - new Date()) / (1000 * 60 * 60 * 24)) <= 15)) && (
                <span style={{ position: "absolute", top: "-2px", right: "-2px", background: "#ef4444", border: "2px solid #2d6a4f", width: "12px", height: "12px", borderRadius: "50%" }} />
              )}
            </button>

            {showNotifMenu && (
              <div style={{ position: "absolute", top: "120%", right: 0, background: "white", borderRadius: "14px", boxShadow: "0 12px 40px rgba(0,0,0,0.25)", zIndex: 1001, minWidth: "300px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <div style={{ padding: "14px 18px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: "700", color: DARK, fontSize: "15px" }}>Notifications</span>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>{todayTasks > 0 ? "Pending Tasks" : "All Clear"}</span>
                </div>
                
                <div style={{ maxHeight: "380px", overflowY: "auto" }}>
                  {unpaidBill && (
                    <div onClick={() => navigate("/subscription")} style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: "#fff5f5" }}>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <span style={{ fontSize: "20px" }}>🧾</span>
                        <div>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#dc2626" }}>Unpaid Bill: ₹{unpaidBill.totalAmount}</p>
                          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#991b1b" }}>Due by {new Date(unpaidBill.dueDate).toLocaleDateString("en-IN")}. Pay now to avoid service stop.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {plan === "pro" && planExpiry && (() => {
                    const daysLeft = Math.ceil((new Date(planExpiry) - new Date()) / (1000 * 60 * 60 * 24));
                    if (daysLeft <= 15 && daysLeft > 0) {
                      return (
                        <div onClick={() => navigate("/subscription")} style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: "#fffbeb" }}>
                          <div style={{ display: "flex", gap: "12px" }}>
                            <span style={{ fontSize: "20px" }}>⭐</span>
                            <div>
                              <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#854d0e" }}>Pro Plan Expires in {daysLeft}d</p>
                              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#a16207" }}>Renew your subscription to keep premium benefits.</p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {todayTasks > 0 ? (
                    <div onClick={() => navigate("/home")} style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <span style={{ fontSize: "20px" }}>📋</span>
                        <div>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: DARK }}>{todayTasks} Pending Tasks Today</p>
                          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280" }}>Don't forget to complete your farm activities today!</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    (!unpaidBill && !(plan === "pro" && planExpiry && Math.ceil((new Date(planExpiry) - new Date()) / (1000 * 60 * 60 * 24)) <= 15)) && (
                      <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>
                        <div style={{ fontSize: "28px", marginBottom: "10px" }}>🍃</div>
                        <p style={{ margin: 0, fontSize: "14px" }}>All caught up! No new notifications.</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" style={{ width: "34px", height: "34px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)" }} />
            ) : (
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: "white", border: "2px solid rgba(255,255,255,0.3)" }}>
                {initials}
              </div>
            )}
            <span className="user-name-desktop" style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px", fontWeight: "500", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.displayName?.split(" ")[0] || user?.email?.split("@")[0]}
            </span>
          </div>

          <button className="logout-btn user-name-desktop" onClick={handleLogout}
            style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "8px 16px", borderRadius: "10px", cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontSize: "13px", fontWeight: "500", transition: "all 0.2s" }}>
            {t("nav_signout")}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="mobile-menu-overlay" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", justifyContent: "flex-start" }} onClick={() => setShowMobileMenu(false)}>
          <div style={{ width: "280px", height: "100%", background: "white", padding: "24px", boxShadow: "4px 0 20px rgba(0,0,0,0.2)", position: "relative" }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowMobileMenu(false)}
              style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#6b7280" }}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px", paddingBottom: "20px", borderBottom: "1px solid #f3f4f6" }}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" style={{ width: "48px", height: "48px", borderRadius: "50%", border: "2px solid #2d6a4f" }} />
              ) : (
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#f0fdf4", color: "#2d6a4f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "700", border: "2px solid #2d6a4f" }}>
                  {initials}
                </div>
              )}
              <div>
                <p style={{ margin: 0, fontWeight: "700", color: DARK, fontSize: "16px" }}>{user?.displayName || "Farmer"}</p>
                <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>{user?.email}</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {NAV_LINKS.map(link => {
                const isActive = location.pathname === link.to;
                return (
                  <Link key={link.to} to={link.to}
                    style={{ 
                      textDecoration: "none", 
                      padding: "12px 16px", 
                      borderRadius: "10px", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "12px", 
                      color: isActive ? "#2d6a4f" : "#4b5563", 
                      background: isActive ? "#f0fdf4" : "transparent",
                      fontWeight: isActive ? "600" : "500",
                      fontSize: "15px",
                      transition: "all 0.2s"
                    }}>
                    <span style={{ fontSize: "18px" }}>{link.icon}</span>
                    {t(link.labelKey)}
                  </Link>
                );
              })}
            </div>

            <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
                {LANGUAGES.map(language => (
                  <button
                    key={language.code}
                    onClick={() => changeLang(language.code)}
                    style={{ 
                      flex: "1 1 40%",
                      padding: "8px 12px", 
                      borderRadius: "8px", 
                      border: "1px solid", 
                      borderColor: lang === language.code ? "#2d6a4f" : "#e5e7eb",
                      background: lang === language.code ? "#f0f7f4" : "white",
                      color: lang === language.code ? "#2d6a4f" : "#6b7280",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    {language.flag} {language.label}
                  </button>
                ))}
              </div>

              <button onClick={handleLogout}
                style={{ width: "100%", background: "#fee2e2", color: "#dc2626", border: "none", padding: "12px", borderRadius: "10px", cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontSize: "14px", fontWeight: "600" }}>
                🚪 {t("nav_signout")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;