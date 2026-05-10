// src/App.js
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth, googleProvider } from "./firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { LanguageProvider } from "./context/LanguageContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import MyLands from "./pages/MyLands";
import CropRec from "./pages/CropRec";
import DiseaseDetect from "./pages/DiseaseDetect";
import WeatherOverview from "./pages/WeatherOverview";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import { PlanProvider } from "./context/PlanContext";
import { PopupProvider } from "./context/PopupContext";

// Google Fonts
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&*!])[A-Za-z\d@#$%^&*!]{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return unsub;
  }, []);

  const validate = () => {
    if (!EMAIL_REGEX.test(email)) { setError("Please enter a valid email address."); return false; }
    if (mode === "register") {
      if (!PASSWORD_REGEX.test(password)) {
        setError("Password must be 8+ chars with uppercase, lowercase, number & special char (@#$%^&*!).");
        return false;
      }
      if (password !== confirmPassword) { setError("Passwords do not match."); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === "register") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await sendPasswordResetEmail(auth, email);
        setSuccess("Password reset email sent! Check your inbox/ spam inbox.");
      }
    } catch (err) {
      const msg = err.code === "auth/user-not-found" ? "No account found with this email."
        : err.code === "auth/wrong-password" ? "Incorrect password."
        : err.code === "auth/email-already-in-use" ? "This email is already registered."
        : err.message;
      setError(msg);
    }
    setSubmitting(false);
  };

  const handleGoogle = async () => {
    setError("");
    try { await signInWithPopup(auth, googleProvider); }
    catch (err) { setError(err.message); }
  };

  const switchMode = (m) => { setMode(m); setError(""); setSuccess(""); setPassword(""); setConfirmPassword(""); };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1f17" }}>
      <div style={{ color: "#52b788", fontFamily: "DM Sans, sans-serif", fontSize: "18px" }}>🌱 Loading FarmMate...</div>
    </div>
  );

  if (!user) return (
    <LanguageProvider>
      <style>{`
        @media (max-width: 768px) {
          .auth-left-panel { display: none !important; }
          .auth-right-panel { padding: 20px !important; }
          .auth-form-card { padding: 32px 24px !important; border-radius: 16px !important; }
        }
      `}</style>
      <div style={S.page}>
        {/* Left panel — visual */}
        <div className="auth-left-panel" style={S.leftPanel}>
          <div style={S.leftContent}>
            <img src="/logo.png" alt="FarmMate Logo" style={{ width: "64px", height: "64px", objectFit: "contain" }} />
            <h1 style={S.brand}>FarmMate</h1>
            <p style={S.tagline}>AI-Powered Smart Farming Assistant</p>
            <div style={S.features}>
              {["🗺️ Manage all your lands", "🌤️ Real-time weather insights", "🤖 AI crop recommendations", "🔬 Disease detection", "📅 Smart farming calendar"].map((f, i) => (
                <div key={i} style={{ ...S.featureItem, animationDelay: `${i * 0.1}s` }}>{f}</div>
              ))}
            </div>
          </div>
          <div style={S.leafDeco}>🌿</div>
        </div>

        {/* Right panel — form */}
        <div className="auth-right-panel" style={S.rightPanel}>
          <div className="auth-form-card" style={S.formCard}>
            <div style={S.formHeader}>
              <h2 style={S.formTitle}>
                {mode === "login" ? "Welcome back" : mode === "register" ? "Create account" : "Reset password"}
              </h2>
              <p style={S.formSub}>
                {mode === "login" ? "Sign in to your farm dashboard"
                  : mode === "register" ? "Start your smart farming journey"
                  : "We'll send you a reset link"}
              </p>
            </div>

            {error && <div style={S.errorBox}>⚠️ {error}</div>}
            {success && <div style={S.successBox}>✅ {success}</div>}

            {/* Email */}
            <div style={S.fieldGroup}>
              <label style={S.label}>Email address</label>
              <input
                type="email"
                placeholder="farmer@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={S.input}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>

            {/* Password */}
            {mode !== "forgot" && (
              <div style={S.fieldGroup}>
                <label style={S.label}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder={mode === "register" ? "Min 8 chars, A-Z, 0-9, @#$..." : "Your password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ ...S.input, paddingRight: "44px" }}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  />
                  <span onClick={() => setShowPass(!showPass)} style={S.eyeBtn}>{showPass ? "🙈" : "👁️"}</span>
                </div>
              </div>
            )}

            {/* Confirm password */}
            {mode === "register" && (
              <div style={S.fieldGroup}>
                <label style={S.label}>Confirm password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{
                      ...S.input, paddingRight: "44px",
                      borderColor: confirmPassword && confirmPassword !== password ? "#e74c3c" : confirmPassword && confirmPassword === password ? "#52b788" : "#d0d0d0"
                    }}
                  />
                  <span onClick={() => setShowConfirm(!showConfirm)} style={S.eyeBtn}>{showConfirm ? "🙈" : "👁️"}</span>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p style={{ color: "#e74c3c", fontSize: "11px", marginTop: "4px" }}>Passwords don't match</p>
                )}
              </div>
            )}

            {/* Forgot password link */}
            {mode === "login" && (
              <div style={{ textAlign: "right", marginBottom: "16px" }}>
                <span onClick={() => switchMode("forgot")} style={S.link}>Forgot password?</span>
              </div>
            )}

            {/* Password strength hint */}
            {mode === "register" && password && (
              <div style={{ marginBottom: "12px" }}>
                {[
                  { label: "8+ characters", ok: password.length >= 8 },
                  { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
                  { label: "Lowercase letter", ok: /[a-z]/.test(password) },
                  { label: "Number", ok: /\d/.test(password) },
                  { label: "Special char (@#$...)", ok: /[@#$%^&*!]/.test(password) },
                ].map((r, i) => (
                  <div key={i} style={{ fontSize: "11px", color: r.ok ? "#52b788" : "#aaa", display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    <span>{r.ok ? "✓" : "○"}</span> {r.label}
                  </div>
                ))}
              </div>
            )}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={submitting} style={S.primaryBtn}>
              {submitting ? "Please wait..." : mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Send Reset Email"}
            </button>

            {/* Google login */}
            {mode !== "forgot" && (
              <>
                <div style={S.divider}><span style={S.dividerText}>or continue with</span></div>
                <button onClick={handleGoogle} style={S.googleBtn}>
                  <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: "8px" }}>
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                  </svg>
                  Continue with Google
                </button>
              </>
            )}

            {/* Mode switch */}
            <p style={S.switchText}>
              {mode === "login" ? <>New to FarmMate? <span onClick={() => switchMode("register")} style={S.link}>Create an account</span></>
                : mode === "register" ? <>Already have an account? <span onClick={() => switchMode("login")} style={S.link}>Sign in</span></>
                : <>Remember your password? <span onClick={() => switchMode("login")} style={S.link}>Back to sign in</span></>}
            </p>
          </div>
        </div>
      </div>
    </LanguageProvider>
  );

  return (

    <LanguageProvider>
      <PopupProvider>
        <PlanProvider user={user}>
          <BrowserRouter>
            <Navbar user={user} />
            <div style={{ padding: "16px", maxWidth: "1200px", margin: "0 auto", fontFamily: "DM Sans, sans-serif", background: "#f7faf8", minHeight: "calc(100vh - 64px)", boxSizing: "border-box" }}>
              <Routes>
                <Route path="/" element={<Navigate to="/home" />} />
                <Route path="/home" element={<Home user={user} />} />
                <Route path="/my-lands" element={<MyLands user={user} />} />
                <Route path="/crop-recommendation" element={<CropRec user={user} />} />
                <Route path="/disease-detection" element={<DiseaseDetect user={user} />} />
                <Route path="/weather" element={<WeatherOverview user={user} />} />
                <Route path="/profile" element={<Profile user={user} />} />
                <Route path="/subscription" element={<Subscription user={user} />} />
              </Routes>
            </div>
          </BrowserRouter>
        </PlanProvider>
      </PopupProvider>
    </LanguageProvider>
  );
}

const S = {
  page: { display: "flex", minHeight: "100vh", fontFamily: "DM Sans, sans-serif" },
  leftPanel: {
    flex: 1, background: "linear-gradient(135deg, #0d1f17 0%, #1b4332 50%, #2d6a4f 100%)",
    display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
    padding: "60px 40px", position: "relative", overflow: "hidden",
  },
  leftContent: { zIndex: 2, textAlign: "center", maxWidth: "400px" },
logo: { width: "64px", height: "64px", marginBottom: "16px", objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(82,183,136,0.4))" },
  brand: { fontFamily: "Playfair Display, serif", fontSize: "42px", fontWeight: "700", color: "#fff", margin: "0 0 8px 0", letterSpacing: "-1px" },
  tagline: { color: "#95d5b2", fontSize: "16px", margin: "0 0 40px 0", fontWeight: "300" },
  features: { display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" },
  featureItem: { color: "#d8f3dc", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", padding: "10px 16px", borderRadius: "8px", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)" },
  leafDeco: { position: "absolute", bottom: "-20px", right: "-20px", fontSize: "180px", opacity: 0.05, transform: "rotate(-30deg)" },
  rightPanel: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f7faf8", padding: "40px 20px" },
  formCard: { width: "100%", maxWidth: "440px", background: "white", borderRadius: "20px", padding: "44px 40px", boxShadow: "0 8px 40px rgba(0,0,0,0.08)" },
  formHeader: { marginBottom: "28px" },
  formTitle: { fontFamily: "Playfair Display, serif", fontSize: "28px", fontWeight: "700", color: "#1b4332", margin: "0 0 6px 0" },
  formSub: { color: "#6b7280", fontSize: "14px", margin: 0 },
  errorBox: { background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" },
  successBox: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" },
  fieldGroup: { marginBottom: "16px" },
  label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" },
  input: { width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "14px", fontFamily: "DM Sans, sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", background: "#fafafa" },
  eyeBtn: { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: "16px" },
  link: { color: "#2d6a4f", cursor: "pointer", fontWeight: "600", fontSize: "13px", textDecoration: "underline" },
  primaryBtn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #2d6a4f, #1b4332)", color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "DM Sans, sans-serif", marginBottom: "16px", letterSpacing: "0.3px" },
  divider: { textAlign: "center", position: "relative", margin: "16px 0", borderTop: "1px solid #e5e7eb" },
  dividerText: { background: "white", padding: "0 12px", color: "#9ca3af", fontSize: "12px", position: "relative", top: "-9px" },
  googleBtn: { width: "100%", padding: "13px", background: "white", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" },
  switchText: { textAlign: "center", color: "#6b7280", fontSize: "13px", margin: 0 },
};

export default App;