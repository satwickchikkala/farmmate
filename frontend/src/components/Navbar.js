// src/components/Navbar.js
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";

const GREEN = "#2d6a4f";
const DARK = "#1b4332";

const NAV_LINKS = [
  { to: "/home", label: "Home", icon: "🏠" },
  { to: "/my-lands", label: "My Lands", icon: "🗺️" },
  { to: "/crop-recommendation", label: "Crop Rec", icon: "🌾" },
  { to: "/disease-detection", label: "Disease", icon: "🔬" },
  { to: "/weather", label: "Weather", icon: "🌤️" },
  { to: "/profile", label: "Profile", icon: "👤" },
  { to: "/subscription", label: "Plans", icon: "💳" },
];

function Navbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [todayTasks, setTodayTasks] = useState(0);
  // const [menuOpen, setMenuOpen] = useState(false); // unused

  useEffect(() => { loadTodayTasks(); }, []);

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
                {link.label}
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
          <button className="logout-btn" onClick={handleLogout}
            style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontSize: "12px", fontWeight: "500", transition: "all 0.2s" }}>
            Sign Out
          </button>
        </div>
      </nav>
    </>
  );
}

export default Navbar;