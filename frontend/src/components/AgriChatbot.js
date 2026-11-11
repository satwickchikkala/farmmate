// src/components/AgriChatbot.js
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_URL from "../config";
import { useLanguage } from "../context/LanguageContext";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";
const LIGHT_GREEN = "#d8f3dc";
const ACCENT = "#52b788";

const I18N = {
  en: {
    title: "FarmMate AgriBot",
    subtitle: "AI Agricultural Advisor & Knowledge Base",
    welcome: "🌱 Hello! I am FarmMate AgriBot, your personal farming advisor. Ask me anything about crop cultivation, fertilizer schedules, organic pest control, soil health, or government schemes like PM-KISAN!",
    placeholder: "Ask a farming question...",
    listening: "🎙️ Listening... speak now",
    searching: "Searching agricultural research & guides...",
    clearConfirm: "Clear conversation history?",
    sources: "Sources & Guidelines",
    copied: "Copied!",
    copy: "Copy",
    tooltip: "Need farming advice? Ask AgriBot!",
    farmContextBadge: "Aware of your farm & active crops",
    voiceNotSupported: "Speech recognition is not supported in this browser.",
    errorReply: "I encountered an issue fetching agricultural advice. Please check your connection and try again.",
    suggestions: [
      "🌾 What is the fertilizer schedule for Paddy?",
      "🐛 How to control stem borer organically?",
      "💰 How do I apply for PM-KISAN ₹6,000?",
      "💧 What are the subsidies for Drip Irrigation?",
      "🍂 Why are my tomato leaves curling?"
    ]
  },
  te: {
    title: "ఫార్మ్‌మేట్ అగ్రిబాట్",
    subtitle: "రైతు సహాయక ఏఐ అడ్వైజర్",
    welcome: "🌱 నమస్కారం! నేను మీ ఫార్మ్‌మేట్ అగ్రిబాట్. పంటల సాగు, ఎరువుల మోతాదు, పురుగుల నివారణ, నేల రకాలు లేదా పీఎం-కిసాన్ పథకాల గురించి నన్ను ఏదైనా అడగవచ్చు!",
    placeholder: "మీ వ్యవసాయ సందేహాన్ని అడగండి...",
    listening: "🎙️ వింటున్నాను... మాట్లాడండి",
    searching: "వ్యవసాయ మార్గదర్శకాలను శోధిస్తోంది...",
    clearConfirm: "సంభాషణను తొలగించాలా?",
    sources: "ఆధార గ్రంథాలు & మార్గదర్శకాలు",
    copied: "కాపీ చేయబడింది!",
    copy: "కాపీ",
    tooltip: "వ్యవసాయ సలహా కావాలా? అడగండి!",
    farmContextBadge: "మీ భూమి & పంట వివరాలతో అనుసంధానించబడింది",
    voiceNotSupported: "మీ బ్రౌజర్‌లో వాయిస్ రికగ్నిషన్ సదుపాయం లేదు.",
    errorReply: "సలహా అందించడంలో సమస్య తలెత్తింది. దయచేసి మళ్లీ ప్రయత్నించండి.",
    suggestions: [
      "🌾 వరి పంటకు ఎరువుల మోతాదు మరియు సమయం ఏమిటి?",
      "🐛 కాండం తొలిచే పురుగును సేంద్రీయంగా ఎలా నివారించాలి?",
      "💰 పీఎం-కిసాన్ ₹6,000 పథకానికి ఎలా దరఖాస్తు చేయాలి?",
      "💧 బిందు సేద్యం (డ్రిప్) సబ్సిడీ వివరాలు ఏమిటి?",
      "🍂 టమాట ఆకులు ముడుచుకుపోవడానికి కారణం ఏమిటి?"
    ]
  },
  hi: {
    title: "फार्ममेट एग्रीबॉट",
    subtitle: "किसान सलाहकार व कृषि ज्ञान केंद्र",
    welcome: "🌱 नमस्ते! मैं फार्ममेट एग्रीबॉट हूँ। फसलों की खेती, खाद की मात्रा, जैविक कीट नियंत्रण, मिट्टी सुधार या पीएम-किसान जैसी सरकारी योजनाओं के बारे में कुछ भी पूछें!",
    placeholder: "खेती से जुड़ा सवाल पूछें...",
    listening: "🎙️ सुन रहा हूँ... बोलिए",
    searching: "कृषि ज्ञान भंडार से उत्तर तैयार हो रहा है...",
    clearConfirm: "क्या आप पूरी बातचीत मिटाना चाहते हैं?",
    sources: "प्रामाणिक स्रोत व दिशा-निर्देश",
    copied: "कॉपी हो गया!",
    copy: "कॉपी",
    tooltip: "खेती की सलाह चाहिए? एग्रीबॉट से पूछें!",
    farmContextBadge: "आपके खेत व फसलों की जानकारी से युक्त",
    voiceNotSupported: "आपके ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है।",
    errorReply: "सलाह प्राप्त करने में त्रुटि हुई। कृपया दोबारा प्रयास करें।",
    suggestions: [
      "🌾 धान की फसल के लिए खाद का सही समय क्या है?",
      "🐛 तना छेदक कीट की जैविक रोकथाम कैसे करें?",
      "💰 पीएम-किसान ₹6,000 योजना के लिए कैसे आवेदन करें?",
      "💧 ड्रिप सिंचाई पर कितनी सब्सिडी मिलती है?",
      "🍂 टमाटर की पत्तियां मुड़ क्यों रही हैं?"
    ]
  },
  ta: {
    title: "பார்ம்மேட் அக்ரிபாட்",
    subtitle: "வேளாண் ஆலோசகர் & தகவல் மையம்",
    welcome: "🌱 வணக்கம்! நான் உங்கள் பார்ம்மேட் அக்ரிபாட். பயிர் சாகுபடி, உர அட்டவணை, இயற்கை பூச்சி கட்டுப்பாடு அல்லது பிஎம்-கிசான் திட்டங்கள் பற்றி கேட்கலாம்!",
    placeholder: "விவசாய கேள்வி கேளுங்கள்...",
    listening: "🎙️ கேட்கிறேன்... பேசுங்கள்",
    searching: "வேளாண் தகவல்களை தேடுகிறது...",
    clearConfirm: "உரையாடலை அழிக்கவா?",
    sources: "வழிகாட்டுதல்கள் & ஆதாரங்கள்",
    copied: "நகலெடுக்கப்பட்டது!",
    copy: "நகல்",
    tooltip: "விவசாய ஆலோசனை வேண்டுமா? கேளுங்கள்!",
    farmContextBadge: "உங்கள் பண்ணை விவரங்களுடன் இணைக்கப்பட்டுள்ளது",
    voiceNotSupported: "உங்கள் உலாவியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை.",
    errorReply: "பதில் பெறுவதில் சிக்கல் ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.",
    suggestions: [
      "🌾 நெல் பயிருக்கான உர அட்டவணை என்ன?",
      "🐛 தண்டு துளைப்பானை இயற்கை முறையில் கட்டுப்படுத்துவது எப்படி?",
      "💰 பிஎம்-கிசான் ₹6,000 திட்டத்திற்கு எவ்வாறு விண்ணப்பிப்பது?",
      "💧 சொட்டு நீர் பாசன மானியம் விவரங்கள் என்ன?",
      "🍂 தக்காளி இலைகள் சுருங்குவதை தடுப்பது எப்படி?"
    ]
  },
  kn: {
    title: "ಫಾರ್ಮ್‌ಮೇಟ್ ಅಗ್ರಿಬಾಟ್",
    subtitle: "ರೈತ ಕೃಷಿ ಸಲಹೆಗಾರ",
    welcome: "🌱 ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಫಾರ್ಮ್‌ಮೇಟ್ ಅಗ್ರಿಬಾಟ್. ಬೆಳೆಗಳ ಮಾಹಿತಿ, ಗೊಬ್ಬರದ ಪ್ರಮಾಣ, ಕೀಟ ನಿಯಂತ್ರಣ ಮತ್ತು ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಕುರಿತು ಏನನ್ನಾದರೂ ಕೇಳಿ!",
    placeholder: "ಕೃಷಿ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ...",
    listening: "🎙️ ಆಲಿಸುತ್ತಿದೆ... ಮಾತನಾಡಿ",
    searching: "ಕೃಷಿ ಮಾಹಿತಿಯನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...",
    clearConfirm: "ಸಂಭಾಷಣೆಯನ್ನು ತೆರವುಗೊಳಿಸಬೇಕೇ?",
    sources: "ಆಧಾರಗಳು & ಮಾರ್ಗದರ್ಶಿಗಳು",
    copied: "ಕಾಪಿ ಮಾಡಲಾಗಿದೆ!",
    copy: "ಕಾಪಿ",
    tooltip: "ಕೃಷಿ ಸಲಹೆ ಬೇಕೇ? ಅಗ್ರಿಬಾಟ್ ಕೇಳಿ!",
    farmContextBadge: "ನಿಮ್ಮ ಜಮೀನು ಮತ್ತು ಬೆಳೆಗಳ ವಿವರ ತಿಳಿದಿದೆ",
    voiceNotSupported: "ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಸೌಲಭ್ಯವಿಲ್ಲ.",
    errorReply: "ಮಾಹಿತಿ ಪಡೆಯುವಲ್ಲಿ ದೋಷ ಸಂಭವಿಸಿದೆ. ದಯವಿಟ್ಟು ಪುನಃ ಪ್ರಯತ್ನಿಸಿ.",
    suggestions: [
      "🌾 ಭತ್ತದ ಬೆಳೆಗೆ ಗೊಬ್ಬರ ಹಾಕುವ ವಿಧಾನ ತಿಳಿಸಿ?",
      "🐛 ಕಾಂಡ ಕೊರೆಯುವ ಹುಳುವನ್ನು ಸಾವಯವವಾಗಿ ನಿಯಂತ್ರಿಸುವುದು ಹೇಗೆ?",
      "💰 ಪಿಎಂ-ಕಿಸಾನ್ ₹6,000 ಯೋಜನೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದು ಹೇಗೆ?",
      "💧 ಹನಿ ನೀರಾವರಿಗೆ ಎಷ್ಟು ಸಬ್ಸಿಡಿ ಸಿಗುತ್ತದೆ?",
      "🍂 ಟೊಮೆಟೊ ಎಲೆಗಳು ಮುದುರಿಕೊಳ್ಳುವುದನ್ನು ತಡೆಯುವುದು ಹೇಗೆ?"
    ]
  },
  ml: {
    title: "ഫാംമേറ്റ് അഗ്രിബോട്ട്",
    subtitle: "കർഷക സഹായി & ഉപദേശകൻ",
    welcome: "🌱 നമസ്കാരം! ഞാൻ ഫാംമേറ്റ് അഗ്രിബോട്ട്. കൃഷിരീതികൾ, വളപ്രയോഗം, ജൈവ കീടനിയന്ത്രണം, സർക്കാരിന്റെ കർഷക പദ്ധതികൾ എന്നിവയെക്കുറിച്ച് ചോദിക്കാം!",
    placeholder: "ഒരു കൃഷി സംശയം ചോദിക്കൂ...",
    listening: "🎙️ കേൾക്കുന്നു... സംസാരിക്കൂ",
    searching: "കാർഷിക വിവരങ്ങൾ ശേഖരിക്കുന്നു...",
    clearConfirm: "സന്ദേശങ്ങൾ മായ്‌ക്കണോ?",
    sources: "ഉറവിടങ്ങളും മാർഗ്ഗനിർദ്ദേശങ്ങളും",
    copied: "പകർത്തി!",
    copy: "കോപ്പി",
    tooltip: "കാർഷിക ഉപദേശം വേണോ? ചോദിക്കൂ!",
    farmContextBadge: "നിങ്ങളുടെ കൃഷിയിട വിവരങ്ങളുമായി ബന്ധിപ്പിച്ചിരിക്കുന്നു",
    voiceNotSupported: "നിങ്ങളുടെ ബ്രൗസറിൽ വോയ്‌സ് ഇൻപുട്ട് ലഭ്യമല്ല.",
    errorReply: "വിവരങ്ങൾ ലഭിക്കുന്നതിൽ തടസ്സം നേരിട്ടു. വീണ്ടും ശ്രമിക്കുക.",
    suggestions: [
      "🌾 നെൽകൃഷിക്ക് വളപ്രയോഗ സമയം ഏതാണ്?",
      "🐛 തണ്ടുതുരപ്പൻ പുഴുവിനെ ജൈവരീതിയിൽ എങ്ങനെ തടയാം?",
      "💰 പിഎം-കിസാൻ ₹6,000 എങ്ങനെ അപേക്ഷിക്കാം?",
      "💧 തുള്ളി നന സബ്‌സിഡി വിവരങ്ങൾ എന്തെല്ലാം?",
      "🍂 തക്കാളിയുടെ ഇല ചുരുളൽ രോഗം എങ്ങനെ നിയന്ത്രിക്കാം?"
    ]
  },
  bn: {
    title: "ফার্মমেট এগ্রিবট",
    subtitle: "কৃষি উপদেষ্টা ও তথ্য ভাণ্ডার",
    welcome: "🌱 নমস্কার! আমি ফার্মমেট এগ্রিবট। ফসল চাষ, সার প্রয়োগ, জৈব বালাই দমন কিংবা পিএম-কিসানের মতো সরকারি প্রকল্প নিয়ে যেকোনো প্রশ্ন করুন!",
    placeholder: "কৃষি সংক্রান্ত যেকোনো প্রশ্ন লিখুন...",
    listening: "🎙️ শুনছি... বলুন",
    searching: "কৃষি নির্দেশিকা থেকে তথ্য অনুসন্ধান করা হচ্ছে...",
    clearConfirm: "পুরনো কথোপকথন মুছে ফেলতে চান?",
    sources: "তথ্যসূত্র ও নির্দেশিকা",
    copied: "কপি হয়েছে!",
    copy: "কপি",
    tooltip: "কৃষি পরামর্শ প্রয়োজন? এগ্রিবটকে জিজ্ঞাসা করুন!",
    farmContextBadge: "আপনার জমির তথ্যের সাথে সংযুক্ত",
    voiceNotSupported: "আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই।",
    errorReply: "তথ্য পেতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    suggestions: [
      "🌾 ধান চাষে সার প্রয়োগের সঠিক নিয়ম কী?",
      "🐛 ধানের মাজরা পোকার জৈব নিয়ন্ত্রণ পদ্ধতি কী?",
      "💰 পিএম-কিসান ₹৬,০০০ প্রকল্পের আবেদন কীভাবে করব?",
      "💧 ড্রিপ সেচের সরকারি ভর্তুকি কত?",
      "🍂 টমেটো পাতার কোঁকড়ানো রোগ কীভাবে রোধ করব?"
    ]
  }
};

const BROWSER_SPEECH_LANGS = {
  en: "en-IN",
  te: "te-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  bn: "bn-IN"
};

// Safe markdown renderer for structured botanical/agricultural text
function renderBotMarkdown(text) {
  if (!text) return null;

  // Split lines
  const lines = text.split("\n");
  const elements = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={`empty-${idx}`} style={{ height: "6px" }} />);
      return;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      elements.push(
        <div key={idx} style={{ fontWeight: "700", color: DARK, fontSize: "14px", marginTop: "8px", marginBottom: "4px" }}>
          {formatInline(trimmed.replace(/^###\s+/, ""))}
        </div>
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <div key={idx} style={{ fontWeight: "700", color: DARK, fontSize: "15px", marginTop: "10px", marginBottom: "4px" }}>
          {formatInline(trimmed.replace(/^##\s+/, ""))}
        </div>
      );
      return;
    }

    // Bullet points
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      elements.push(
        <div key={idx} style={{ display: "flex", gap: "6px", alignItems: "flex-start", marginBottom: "4px", paddingLeft: "4px" }}>
          <span style={{ color: GREEN, fontWeight: "bold", fontSize: "13px", lineHeight: "1.4" }}>•</span>
          <span style={{ flex: 1, fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>
            {formatInline(trimmed.replace(/^[-*•]\s+/, ""))}
          </span>
        </div>
      );
      return;
    }

    // Numbered list: "1. " or "2. "
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={idx} style={{ display: "flex", gap: "6px", alignItems: "flex-start", marginBottom: "4px", paddingLeft: "4px" }}>
          <span style={{ color: GREEN, fontWeight: "600", fontSize: "12px", minWidth: "16px" }}>{numMatch[1]}.</span>
          <span style={{ flex: 1, fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>
            {formatInline(numMatch[2])}
          </span>
        </div>
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={idx} style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>
        {formatInline(trimmed)}
      </p>
    );
  });

  return elements;
}

// Inline format for **bold** and `code`
function formatInline(str) {
  if (!str) return "";
  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      parts.push(str.substring(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(<strong key={match.index} style={{ color: "#111827", fontWeight: "600" }}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <span key={match.index} style={{ background: "#e8f5e9", color: DARK, padding: "1px 5px", borderRadius: "4px", fontFamily: "monospace", fontSize: "12px" }}>
          {token.slice(1, -1)}
        </span>
      );
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < str.length) {
    parts.push(str.substring(lastIdx));
  }
  return parts;
}

export default function AgriChatbot({ user }) {
  const { lang, LANGUAGES } = useLanguage();
  const texts = I18N[lang] || I18N.en;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem("farmmate_chat_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [farmContext, setFarmContext] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  // Persist conversation to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("farmmate_chat_history", JSON.stringify(messages));
    } catch (e) {
      // storage full or disabled
    }
  }, [messages]);

  // Auto-hide tooltip after 10s or when opened
  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
    }
  }, [isOpen]);

  // Fetch farmer context (lands & active crops) once
  useEffect(() => {
    if (!user?.uid) return;

    let mounted = true;
    async function loadFarmerProfile() {
      try {
        const landsSnap = await getDocs(query(collection(db, "lands"), where("userId", "==", user.uid)));
        const lands = landsSnap.docs.map(d => {
          const dt = d.data();
          return { name: dt.name, soilType: dt.soilType, city: dt.city, size: dt.size, unit: dt.unit };
        });

        const timelinesSnap = await getDocs(query(collection(db, "timelines"), where("userId", "==", user.uid), where("status", "==", "active")));
        const activeCrops = timelinesSnap.docs.map(d => {
          const dt = d.data();
          return { crop: dt.crop, startDate: dt.startDate };
        });

        if (mounted) {
          setFarmContext({ lands, activeCrops });
        }
      } catch (err) {
        console.warn("Could not preload farm context for chatbot:", err);
      }
    }
    loadFarmerProfile();

    return () => { mounted = false; };
  }, [user]);

  // Handle Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = BROWSER_SPEECH_LANGS[lang] || "en-IN";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [lang]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(texts.voiceNotSupported);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = BROWSER_SPEECH_LANGS[lang] || "en-IN";
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
        setIsListening(false);
      }
    }
  };

  const handleSendMessage = async (textToSend) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const userMessage = {
      role: "user",
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput("");
    setLoading(true);

    try {
      // Prepare last 4 turns for context
      const convHistory = messages.slice(-4).map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await axios.post(`${API_URL}/api/chat`, {
        message: queryText,
        language: lang,
        conversationHistory: convHistory,
        farmContext: farmContext
      });

      const data = res.data;
      const botMessage = {
        role: "assistant",
        text: data.reply || texts.errorReply,
        sources: data.sources || [],
        matchedDocs: data.matchedDocs || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages([...updatedHistory, botMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage = {
        role: "assistant",
        text: texts.errorReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages([...updatedHistory, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm(texts.clearConfirm)) {
      setMessages([]);
      try {
        sessionStorage.removeItem("farmmate_chat_history");
      } catch (e) {}
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const currentFlag = LANGUAGES?.find(l => l.code === lang)?.flag || "🇮🇳";

  return (
    <>
      {/* Floating Chat Bubble Button */}
      <div style={S.bubbleContainer}>
        {showTooltip && !isOpen && (
          <div style={S.tooltipBubble} onClick={() => setIsOpen(true)}>
            <span>💬 {texts.tooltip}</span>
            <button
              style={S.tooltipClose}
              onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
            >
              ✕
            </button>
          </div>
        )}

        <button
          onClick={() => setIsOpen(prev => !prev)}
          style={{
            ...S.bubbleBtn,
            transform: isOpen ? "rotate(90deg) scale(0.95)" : "scale(1)",
            background: isOpen ? "#1b4332" : `linear-gradient(135deg, ${GREEN}, ${DARK})`
          }}
          title={texts.title}
          aria-label={texts.title}
        >
          {isOpen ? (
            <span style={{ fontSize: "22px", color: "#fff", lineHeight: 1 }}>✕</span>
          ) : (
            <div style={S.bubbleIconWrapper}>
              <span style={{ fontSize: "26px" }}>🌾</span>
              <span style={S.aiBadge}>AI</span>
            </div>
          )}
        </button>
      </div>

      {/* Chat Window Popup Docked to Bottom-Right */}
      {isOpen && (
        <div style={S.chatCard}>
          {/* Header */}
          <div style={S.chatHeader}>
            <div style={S.headerLeft}>
              <div style={S.botAvatar}>🌱</div>
              <div>
                <div style={S.headerTitleRow}>
                  <h3 style={S.headerTitle}>{texts.title}</h3>
                  <span style={S.onlineDot} title="Online & ready" />
                </div>
                <p style={S.headerSubtitle}>{texts.subtitle}</p>
              </div>
            </div>

            <div style={S.headerActions}>
              <span style={S.langPill} title={`Active: ${lang.toUpperCase()}`}>
                {currentFlag}
              </span>
              <button
                onClick={handleClearHistory}
                style={S.headerIconBtn}
                title={texts.clearConfirm}
              >
                🗑️
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={S.headerIconBtn}
                title="Minimize"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Farm Context Indicator */}
          {farmContext?.lands?.length > 0 && (
            <div style={S.contextPillBar}>
              <span style={S.contextIcon}>📍</span>
              <span style={S.contextText}>
                {texts.farmContextBadge} ({farmContext.lands[0]?.name || "Farm"} - {farmContext.lands[0]?.soilType || "Soil"})
              </span>
            </div>
          )}

          {/* Messages Area */}
          <div style={S.messagesBody}>
            {/* Welcome Greeting */}
            <div style={S.welcomeCard}>
              <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#2d3748", lineHeight: "1.5" }}>
                {texts.welcome}
              </p>

              {/* Quick Prompt Chips */}
              <div style={S.chipsContainer}>
                {texts.suggestions.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug)}
                    style={S.chipBtn}
                    disabled={loading}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Messages */}
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={i}
                  style={{
                    ...S.msgRow,
                    justifyContent: isUser ? "flex-end" : "flex-start"
                  }}
                >
                  {!isUser && <div style={S.avatarSmall}>🌱</div>}
                  <div
                    style={{
                      ...S.msgBubble,
                      ...(isUser ? S.userBubble : S.botBubble)
                    }}
                  >
                    {isUser ? (
                      <div style={S.userMsgText}>{msg.text}</div>
                    ) : (
                      <div style={S.botContent}>
                        {renderBotMarkdown(msg.text)}

                        {/* Sources Citation Bar */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div style={S.sourcesContainer}>
                            <div style={S.sourcesTitle}>
                              <span>📚</span> {texts.sources}:
                            </div>
                            <div style={S.sourcesList}>
                              {msg.sources.map((src, sIdx) => (
                                <span key={sIdx} style={S.sourceTag}>
                                  {src}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Copy button */}
                        <div style={S.botFooterBar}>
                          <span style={S.timestamp}>{msg.timestamp}</span>
                          <button
                            onClick={() => copyToClipboard(msg.text, i)}
                            style={S.copyBtn}
                          >
                            {copiedIdx === i ? `✓ ${texts.copied}` : `📋 ${texts.copy}`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading / Searching Indicator */}
            {loading && (
              <div style={{ ...S.msgRow, justifyContent: "flex-start" }}>
                <div style={S.avatarSmall}>🌱</div>
                <div style={{ ...S.msgBubble, ...S.botBubble, padding: "12px 16px" }}>
                  <div style={S.loadingRow}>
                    <div style={S.pulsingDot} />
                    <div style={{ ...S.pulsingDot, animationDelay: "0.2s" }} />
                    <div style={{ ...S.pulsingDot, animationDelay: "0.4s" }} />
                    <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "6px" }}>
                      {texts.searching}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Listening Overlay Status */}
          {isListening && (
            <div style={S.listeningBanner}>
              <span style={S.micPulse}>🔴</span> {texts.listening}
            </div>
          )}

          {/* Input Footer */}
          <div style={S.chatFooter}>
            <button
              onClick={toggleListening}
              style={{
                ...S.micBtn,
                background: isListening ? "#fee2e2" : "#f3f4f6",
                borderColor: isListening ? "#ef4444" : "#e5e7eb"
              }}
              title="Voice Input"
              type="button"
            >
              <span style={{ fontSize: "17px" }}>{isListening ? "⏹️" : "🎙️"}</span>
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={texts.placeholder}
              style={S.chatInput}
              disabled={loading}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              style={{
                ...S.sendBtn,
                opacity: loading || !input.trim() ? 0.45 : 1,
                cursor: loading || !input.trim() ? "not-allowed" : "pointer"
              }}
              type="button"
              title="Send"
            >
              <span style={{ fontSize: "16px", color: "white" }}>➤</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const S = {
  bubbleContainer: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    fontFamily: FONT,
  },
  tooltipBubble: {
    background: "#ffffff",
    color: DARK,
    padding: "8px 14px",
    borderRadius: "14px",
    fontSize: "12px",
    fontWeight: "600",
    boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
    border: `1.5px solid ${LIGHT_GREEN}`,
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    animation: "fadeIn 0.3s ease",
    whiteSpace: "nowrap",
  },
  tooltipClose: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    fontSize: "11px",
    cursor: "pointer",
    padding: "0 2px",
  },
  bubbleBtn: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    border: "2.5px solid #ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 24px rgba(45, 106, 79, 0.4)",
    transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease",
    position: "relative",
    outline: "none",
  },
  bubbleIconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  aiBadge: {
    position: "absolute",
    bottom: "-5px",
    right: "-8px",
    background: ACCENT,
    color: DARK,
    fontSize: "9px",
    fontWeight: "800",
    padding: "1px 5px",
    borderRadius: "10px",
    border: "1.5px solid white",
    letterSpacing: "0.5px",
  },
  chatCard: {
    position: "fixed",
    bottom: "94px",
    right: "24px",
    width: "395px",
    maxWidth: "calc(100vw - 32px)",
    height: "580px",
    maxHeight: "calc(100vh - 120px)",
    background: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 20px 60px rgba(15, 33, 23, 0.22)",
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 9998,
    fontFamily: FONT,
    animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  chatHeader: {
    background: `linear-gradient(135deg, ${DARK} 0%, ${GREEN} 100%)`,
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "white",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  botAvatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.18)",
    border: "1.5px solid rgba(255,255,255,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },
  headerTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  headerTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: "-0.2px",
  },
  onlineDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#52b788",
    boxShadow: "0 0 6px #52b788",
  },
  headerSubtitle: {
    margin: "2px 0 0 0",
    fontSize: "11px",
    color: "#d8f3dc",
    fontWeight: "400",
    opacity: 0.9,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  langPill: {
    background: "rgba(255,255,255,0.16)",
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "12px",
  },
  headerIconBtn: {
    background: "rgba(255,255,255,0.14)",
    border: "none",
    color: "#ffffff",
    borderRadius: "8px",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "12px",
    transition: "background 0.2s",
  },
  contextPillBar: {
    background: "#f0fdf4",
    borderBottom: "1px solid #bbf7d0",
    padding: "6px 14px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    color: "#166534",
  },
  contextIcon: {
    fontSize: "12px",
  },
  contextText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: "500",
  },
  messagesBody: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    background: "#f8faf9",
  },
  welcomeCard: {
    background: "#ffffff",
    border: "1px solid #e6f4ea",
    borderRadius: "14px",
    padding: "14px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
  },
  chipsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  chipBtn: {
    background: "#f0f7f4",
    border: "1px solid #d8f3dc",
    color: DARK,
    padding: "8px 12px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: "500",
    textAlign: "left",
    cursor: "pointer",
    transition: "background 0.2s, transform 0.1s",
    fontFamily: FONT,
  },
  msgRow: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
    width: "100%",
  },
  avatarSmall: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    background: LIGHT_GREEN,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    flexShrink: 0,
    marginTop: "2px",
  },
  msgBubble: {
    maxWidth: "85%",
    borderRadius: "14px",
    fontSize: "13px",
    wordBreak: "break-word",
  },
  userBubble: {
    background: GREEN,
    color: "#ffffff",
    padding: "10px 14px",
    borderBottomRightRadius: "4px",
    boxShadow: "0 2px 8px rgba(45, 106, 79, 0.2)",
  },
  userMsgText: {
    fontSize: "13px",
    lineHeight: "1.4",
  },
  botBubble: {
    background: "#ffffff",
    color: "#1f2937",
    padding: "12px 14px",
    border: "1px solid #e5e7eb",
    borderBottomLeftRadius: "4px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  },
  botContent: {
    display: "flex",
    flexDirection: "column",
  },
  sourcesContainer: {
    marginTop: "10px",
    paddingTop: "8px",
    borderTop: "1px dashed #e5e7eb",
  },
  sourcesTitle: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginBottom: "4px",
  },
  sourcesList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
  },
  sourceTag: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    fontSize: "10.5px",
    padding: "2px 7px",
    borderRadius: "6px",
  },
  botFooterBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "8px",
    paddingTop: "4px",
  },
  timestamp: {
    fontSize: "10.5px",
    color: "#9ca3af",
  },
  copyBtn: {
    background: "none",
    border: "none",
    color: "#6b7280",
    fontSize: "11px",
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  pulsingDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: GREEN,
    opacity: 0.7,
  },
  listeningBanner: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "6px 14px",
    fontSize: "11.5px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    borderTop: "1px solid #fecaca",
  },
  micPulse: {
    animation: "pulse 1s infinite",
    fontSize: "10px",
  },
  chatFooter: {
    padding: "10px 14px",
    background: "#ffffff",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  micBtn: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    outline: "none",
    transition: "background 0.2s, border-color 0.2s",
  },
  chatInput: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: "20px",
    border: "1.5px solid #e5e7eb",
    fontSize: "13px",
    fontFamily: FONT,
    outline: "none",
    background: "#f9fafb",
  },
  sendBtn: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: "none",
    background: `linear-gradient(135deg, ${GREEN}, ${DARK})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    outline: "none",
    boxShadow: "0 2px 8px rgba(45, 106, 79, 0.3)",
    transition: "opacity 0.2s, transform 0.1s",
  },
};
