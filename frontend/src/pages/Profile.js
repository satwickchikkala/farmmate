// src/pages/Profile.js
import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { updateProfile, updatePassword, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { getMonthlyUsage } from "../utils/trackUsage";
import { getUserPlan } from "../utils/updatePlan";

const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";

function Profile({ user }) {
  const [tab, setTab] = useState("info");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [photoPreview, setPhotoPreview] = useState(user?.photoURL || null);
  const [landsCount, setLandsCount] = useState(0);
  const [activeCrops, setActiveCrops] = useState(0);
  const [pastCrops, setPastCrops] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [usage, setUsage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [currentPlan, setCurrentPlan] = useState("free");
  const [showPwds, setShowPwds] = useState({ current: false, new: false, confirm: false });
  const fileRef = useRef();

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    const uid = auth.currentUser.uid;
    const plan = await getUserPlan(uid);
    setCurrentPlan(plan);
    const lsnap = await getDocs(query(collection(db, "lands"), where("userId", "==", uid)));
    setLandsCount(lsnap.size);
    const tsnap = await getDocs(query(collection(db, "timelines"), where("userId", "==", uid), where("status", "==", "active")));
    setActiveCrops(tsnap.size);
    const asnap = await getDocs(query(collection(db, "timelines"), where("userId", "==", uid), where("status", "==", "archived")));
    setPastCrops(asnap.size);
    const usageData = await getMonthlyUsage(uid);
    setUsage(usageData);
    let total = 0, completed = 0;
    [...tsnap.docs, ...asnap.docs].forEach(d => {
      const tasks = d.data().tasks || [];
      total += tasks.length;
      completed += tasks.filter(t => t.completed).length;
    });
    setTotalTasks(total);
    setCompletedTasks(completed);
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 4000);
  };

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      const updates = { displayName };
      if (photoPreview && photoPreview !== user?.photoURL) updates.photoURL = photoPreview;
      await updateProfile(auth.currentUser, updates);
      showMsg("Profile updated successfully!");
    } catch (e) { showMsg(e.message, "error"); }
    setSaving(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) { showMsg("New passwords do not match", "error"); return; }
    if (newPwd.length < 8) { showMsg("Password must be at least 8 characters", "error"); return; }
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPwd);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPwd);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      showMsg("Password changed successfully!");
    } catch (e) {
      showMsg(e.code === "auth/wrong-password" ? "Current password is incorrect" : e.message, "error");
    }
    setSaving(false);
  };

  const handleResetEmail = async () => {
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      showMsg("Password reset email sent to " + auth.currentUser.email);
    } catch (e) { showMsg(e.message, "error"); }
  };

  const initials = (displayName || user?.email || "F").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const memberSince = user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", { year: "numeric", month: "long" }) : "N/A";
  const isGoogle = user?.providerData?.[0]?.providerId === "google.com";

  const TABS = [
    { id: "info", label: "Personal Info", icon: "👤" },
    { id: "security", label: "Security", icon: "🔒" },
    { id: "stats", label: "Farm Stats", icon: "📊" },
  ];

  return (
    <div style={{ fontFamily: FONT, maxWidth: "900px", width: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap');
        .profile-tab:hover { background: #f0f7f4 !important; }
        .profile-tab.active { background: ${GREEN} !important; color: white !important; }
        .edit-input:focus { border-color: ${GREEN} !important; outline: none; box-shadow: 0 0 0 3px rgba(45,106,79,0.1); }
        .save-btn:hover { background: ${DARK} !important; transform: translateY(-1px); }
        .avatar-hover:hover .avatar-overlay { opacity: 1 !important; }
      `}</style>

      {/* Header banner */}
      <div style={{ background: `linear-gradient(135deg, ${DARK} 0%, ${GREEN} 100%)`, borderRadius: "16px", padding: "32px 36px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
        {/* Avatar */}
        <div className="avatar-hover" style={{ position: "relative", cursor: "pointer" }} onClick={() => fileRef.current.click()}>
          {photoPreview
            ? <img src={photoPreview} alt="avatar" style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.3)" }} />
            : <div style={{ width: "90px", height: "90px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "700", color: "white", border: "3px solid rgba(255,255,255,0.3)", fontFamily: "Playfair Display, serif" }}>{initials}</div>
          }
          <div className="avatar-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s", fontSize: "20px" }}>📷</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
        </div>

        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "Playfair Display, serif", color: "white", margin: "0 0 4px 0", fontSize: "24px" }}>
            {user?.displayName || user?.email?.split("@")[0] || "Farmer"}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", margin: "0 0 8px 0", fontSize: "14px" }}>{user?.email}</p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ background: "rgba(255,255,255,0.15)", color: "white", padding: "4px 12px", borderRadius: "20px", fontSize: "12px" }}>
              🗓️ Member since {memberSince}
            </span>
            <span style={{ background: "rgba(255,255,255,0.15)", color: "white", padding: "4px 12px", borderRadius: "20px", fontSize: "12px" }}>
              {isGoogle ? "🔵 Google Account" : "📧 Email Account"}
            </span>
            <span style={{
              background: currentPlan === "pro" ? "rgba(255,215,0,0.2)" : "rgba(255,255,255,0.15)",
              color: "white",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              border: currentPlan === "pro" ? "1px solid gold" : "none"
            }}>
              {currentPlan === "pro" ? "⭐ Pro Plan" : "🌿 Free Plan"}
            </span>
          </div>
        </div>

        {/* Quick stats in header */}
        <div style={{ display: "flex", gap: "20px" }}>
          {[{ v: landsCount, l: "Lands" }, { v: activeCrops, l: "Active" }, { v: pastCrops, l: "Past" }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "26px", fontWeight: "700", color: "white", fontFamily: "Playfair Display, serif" }}>{s.v}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Message */}
      {msg.text && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontSize: "13px", fontWeight: "500", background: msg.type === "error" ? "#fff5f5" : "#f0fdf4", border: `1px solid ${msg.type === "error" ? "#fecaca" : "#bbf7d0"}`, color: msg.type === "error" ? "#dc2626" : "#15803d" }}>
          {msg.type === "error" ? "⚠️" : "✅"} {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", background: "white", padding: "6px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
        {TABS.map(t => (
          <button key={t.id} className={`profile-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: "13px", fontWeight: "500", transition: "all 0.2s", background: "transparent", color: tab === t.id ? "white" : "#6b7280" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Personal Info */}
      {tab === "info" && (
        <div style={S.card}>
          <h3 style={S.cardTitle}>Personal Information</h3>
          <p style={S.cardSub}>Update your name and contact details. Click the avatar above to change your photo.</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={S.label}>Full Name</label>
              <input className="edit-input" value={displayName} onChange={e => setDisplayName(e.target.value)} style={S.input} placeholder="Your full name" />
            </div>
            <div>
              <label style={S.label}>Email Address</label>
              <input value={user?.email || ""} disabled style={{ ...S.input, background: "#f9f9f9", color: "#9ca3af", cursor: "not-allowed" }} />
            </div>
            <div>
              <label style={S.label}>Phone Number</label>
              <input className="edit-input" value={phone} onChange={e => setPhone(e.target.value)} style={S.input} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label style={S.label}>State</label>
              <input className="edit-input" value={state} onChange={e => setState(e.target.value)} style={S.input} placeholder="Tamil Nadu" />
            </div>
            <div>
              <label style={S.label}>District</label>
              <input className="edit-input" value={district} onChange={e => setDistrict(e.target.value)} style={S.input} placeholder="Virudhunagar" />
            </div>
            <div>
              <label style={S.label}>Member Since</label>
              <input value={memberSince} disabled style={{ ...S.input, background: "#f9f9f9", color: "#9ca3af", cursor: "not-allowed" }} />
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
            <button className="save-btn" onClick={handleSaveInfo} disabled={saving}
              style={{ padding: "12px 28px", background: GREEN, color: "white", border: "none", borderRadius: "10px", fontFamily: FONT, fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}>
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* TAB: Security */}
      {tab === "security" && (
        <div style={S.card}>
          <h3 style={S.cardTitle}>Security Settings</h3>
          <p style={S.cardSub}>Manage your password and account security.</p>

          {isGoogle ? (
            <div style={{ padding: "20px", background: "#f0f7f4", borderRadius: "10px", border: "1px solid #b7e4c7" }}>
              <p style={{ color: GREEN, fontWeight: "600", margin: "0 0 8px 0" }}>🔵 Google Account</p>
              <p style={{ color: "#555", fontSize: "14px", margin: 0 }}>Your account uses Google Sign-In. Password management is handled by Google.</p>
            </div>
          ) : (
            <>
              <div style={{ background: "#fafafa", borderRadius: "10px", padding: "20px", border: "1px solid #e5e7eb", marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 16px 0", color: DARK, fontSize: "15px" }}>Change Password</h4>
                <div style={{ display: "grid", gap: "14px" }}>
                  {[
                    { label: "Current Password", val: currentPwd, set: setCurrentPwd, key: "current" },
                    { label: "New Password", val: newPwd, set: setNewPwd, key: "new" },
                    { label: "Confirm New Password", val: confirmPwd, set: setConfirmPwd, key: "confirm" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={S.label}>{f.label}</label>
                      <div style={{ position: "relative" }}>
                        <input
                          className="edit-input"
                          type={showPwds[f.key] ? "text" : "password"}
                          value={f.val}
                          onChange={e => f.set(e.target.value)}
                          style={{ ...S.input, paddingRight: "44px" }}
                          placeholder="••••••••"
                        />
                        <span onClick={() => setShowPwds(p => ({ ...p, [f.key]: !p[f.key] }))} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: "16px" }}>
                          {showPwds[f.key] ? "🙈" : "👁️"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="save-btn" onClick={handleChangePassword} disabled={saving}
                  style={{ marginTop: "16px", padding: "12px 24px", background: GREEN, color: "white", border: "none", borderRadius: "10px", fontFamily: FONT, fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}>
                  {saving ? "Updating..." : "🔒 Update Password"}
                </button>
              </div>

              <div style={{ background: "#fff8f0", borderRadius: "10px", padding: "16px", border: "1px solid #fde8c8" }}>
                <p style={{ margin: "0 0 8px 0", fontWeight: "600", color: "#92400e", fontSize: "14px" }}>📧 Forgot your password?</p>
                <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#78350f" }}>Send a password reset link to <strong>{user?.email}</strong></p>
                <button onClick={handleResetEmail} style={{ padding: "8px 18px", background: "#f59e0b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: FONT, fontSize: "13px", fontWeight: "600" }}>
                  Send Reset Email
                </button>
              </div>
            </>
          )}

          {/* Account info */}
          <div style={{ marginTop: "20px", background: "#fafafa", borderRadius: "10px", padding: "16px", border: "1px solid #e5e7eb" }}>
            <h4 style={{ margin: "0 0 12px 0", color: DARK, fontSize: "15px" }}>Account Information</h4>
            <div style={{ display: "grid", gap: "8px" }}>
              {[
                { label: "User ID", value: user?.uid?.slice(0, 16) + "..." },
                { label: "Auth Provider", value: isGoogle ? "Google" : "Email/Password" },
                { label: "Last Sign In", value: user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString("en-IN") : "N/A" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e5e7eb", fontSize: "13px" }}>
                  <span style={{ color: "#6b7280" }}>{item.label}</span>
                  <span style={{ color: "#374151", fontWeight: "500" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Farm Stats */}
      {tab === "stats" && (
        <div style={S.card}>
          <h3 style={S.cardTitle}>Your Farming Journey</h3>
          <p style={S.cardSub}>A summary of your activity on FarmMate.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            {[
              { icon: "🗺️", label: "Total Lands", value: landsCount, color: "#2d6a4f" },
              { icon: "🌾", label: "Active Crops", value: activeCrops, color: "#1a6985" },
              { icon: "📦", label: "Past Crops", value: pastCrops, color: "#e09f3e" },
              { icon: "📋", label: "Total Tasks", value: totalTasks, color: "#8e44ad" },
              { icon: "✅", label: "Tasks Done", value: completedTasks, color: "#27ae60" },
              { icon: "📊", label: "Completion %", value: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) + "%" : "0%", color: "#e67e22" },
            ].map((s, i) => (
              <div key={i} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>{s.icon}</div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: s.color, fontFamily: "Playfair Display, serif" }}>{s.value}</div>
                <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {totalTasks > 0 && (
            <div style={{ background: "#f9f9f9", borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "#555" }}>
                <span>Overall Task Completion</span>
                <span style={{ fontWeight: "600", color: GREEN }}>{Math.round((completedTasks / totalTasks) * 100)}%</span>
              </div>
              <div style={{ background: "#e5e7eb", borderRadius: "10px", height: "12px" }}>
                <div style={{ width: `${(completedTasks / totalTasks) * 100}%`, background: `linear-gradient(90deg, ${GREEN}, #52b788)`, height: "12px", borderRadius: "10px", transition: "width 1s" }} />
              </div>
            </div>
          )}

          {usage && (
            <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "16px", marginTop: "16px" }}>
              <h4 style={{ margin: "0 0 12px 0", color: DARK, fontSize: "15px" }}>
                📊 This Month's Usage
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { label: "Crop Recommendations", value: usage.cropRecCount || 0 },
                  { label: "Timelines Generated", value: usage.timelineCount || 0 },
                  { label: "Disease Scans", value: usage.diseaseCount || 0 },
                  { label: "Estimated Cost", value: `₹${(usage.totalCost || 0).toFixed(2)}` },
                ].map((item, i) => (
                  <div key={i} style={{ background: "white", borderRadius: "8px", padding: "10px 12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "11px", color: "#9ca3af" }}>{item.label}</div>
                    <div style={{ fontSize: "18px", fontWeight: "700", color: GREEN }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  card: { background: "white", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" },
  cardTitle: { fontFamily: "Playfair Display, serif", fontSize: "20px", fontWeight: "700", color: "#1b4332", margin: "0 0 6px 0" },
  cardSub: { color: "#9ca3af", fontSize: "13px", margin: "0 0 24px 0" },
  label: { display: "block", fontSize: "12px", fontWeight: "600", color: "#6b7280", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" },
  input: { width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "14px", fontFamily: "DM Sans, sans-serif", boxSizing: "border-box", transition: "all 0.2s", background: "white" },
};

export default Profile;