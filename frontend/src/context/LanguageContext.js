// src/context/LanguageContext.js
import { createContext, useContext, useState } from "react";
import translations from "../translations/languages";

const LanguageContext = createContext();

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "te", label: "తెలుగు", flag: "🇮🇳" },
  { code: "ta", label: "தமிழ்", flag: "🇮🇳" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "kn", label: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ml", label: "മലയാളം", flag: "🇮🇳" },
  { code: "bn", label: "বাংলা", flag: "🇮🇳" },
];

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(
    localStorage.getItem("farmmate_lang") || "en"
  );

  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem("farmmate_lang", code);
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);