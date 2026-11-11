// src/components/AgriChatbot.js
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_URL from "../config";
import { useLanguage } from "../context/LanguageContext";
import { db } from "../firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";

const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";
const LIGHT_GREEN = "#d8f3dc";
const ACCENT = "#52b788";

const I18N = {
  en: {
    title: "KRISHMITRA",
    subtitle: "Your Smart AI Agricultural Advisor",
    welcome: "🌱 Hello! I am KRISHMITRA, your personal agricultural advisor. Ask me anything about your registered lands, active crops, fertilizer schedules, organic pest control, or government schemes like PM-KISAN!",
    placeholder: "Ask about your lands, crops, fertilizers...",
    listening: "🎙️ Listening... speak now",
    searching: "KRISHMITRA is checking your farm data & agricultural guides...",
    clearConfirm: "Clear conversation history?",
    sources: "Sources & Verified Guidelines",
    copied: "Copied!",
    copy: "Copy",
    tooltip: "Need farming advice? Ask KRISHMITRA!",
    farmContextBadge: "Connected to your real-time farm profile",
    voiceNotSupported: "Speech recognition is not supported in this browser.",
    errorReply: "I encountered an issue fetching agricultural advice. Please check your connection and try again.",
    suggestions: [
      "🗺️ How many lands do I have?",
      "🌿 What crops am I growing?",
      "🧪 What is my soil type?",
      "🌾 What is the fertilizer schedule for Paddy?",
      "💰 How do I apply for PM-KISAN ₹6,000?"
    ]
  },
  te: {
    title: "క్రిష్‌మిత్ర (KRISHMITRA)",
    subtitle: "మీ స్మార్ట్ డిజిటల్ రైతు సలహాదారు",
    welcome: "🌱 నమస్కారం! నేను మీ క్రిష్‌మిత్ర (KRISHMITRA). మీ నమోదైన భూములు, ప్రస్తుత పంటలు, ఎరువుల మోతాదు, పురుగుల నివారణ మరియు పీఎం-కిసాన్ పథకాల గురించి నన్ను ఏదైనా అడగవచ్చు!",
    placeholder: "మీ భూములు, పంటలు లేదా ఎరువుల గురించి అడగండి...",
    listening: "🎙️ వింటున్నాను... మాట్లాడండి",
    searching: "క్రిష్‌మిత్ర మీ వివరాలను మరియు మార్గదర్శకాలను శోధిస్తోంది...",
    clearConfirm: "సంభాషణను తొలగించాలా?",
    sources: "ఆధార గ్రంథాలు & మార్గదర్శకాలు",
    copied: "కాపీ చేయబడింది!",
    copy: "కాపీ",
    tooltip: "వ్యవసాయ సలహా కావాలా? క్రిష్‌మిత్రను అడగండి!",
    farmContextBadge: "మీ భూమి & పంట వివరాలతో ప్రత్యక్ష అనుసంధానం",
    voiceNotSupported: "మీ బ్రౌజర్‌లో వాయిస్ రికగ్నిషన్ సదుపాయం లేదు.",
    errorReply: "సలహా అందించడంలో సమస్య తలెత్తింది. దయచేసి మళ్లీ ప్రయత్నించండి.",
    suggestions: [
      "🗺️ నాకు ఎన్ని భూములు ఉన్నాయి?",
      "🌿 నేను ప్రస్తుతం ఏ పంటలు సాగు చేస్తున్నాను?",
      "🧪 నా భూమి నేల రకం ఏమిటి?",
      "🌾 వరి పంటకు ఎరువుల మోతాదు మరియు సమయం ఏమిటి?",
      "💰 పీఎం-కిసాన్ ₹6,000 పథకానికి ఎలా దరఖాస్తు చేయాలి?"
    ]
  },
  hi: {
    title: "कृषिमित्र (KRISHMITRA)",
    subtitle: "आपका स्मार्ट डिजिटल किसान सहायक",
    welcome: "🌱 नमस्ते! मैं कृषिमित्र (KRISHMITRA) हूँ। आपके पंजीकृत खेत, वर्तमान फसलें, खाद की मात्रा, जैविक कीट नियंत्रण या सरकारी योजनाओं के बारे में कुछ भी पूछें!",
    placeholder: "अपने खेत, फसल या खाद के बारे में पूछें...",
    listening: "🎙️ सुन रहा हूँ... बोलिए",
    searching: "कृषिमित्र आपके खेत की जानकारी और कृषि ज्ञान देख रहा है...",
    clearConfirm: "क्या आप पूरी बातचीत मिटाना चाहते हैं?",
    sources: "प्रामाणिक स्रोत व दिशा-निर्देश",
    copied: "कॉपी हो गया!",
    copy: "कॉपी",
    tooltip: "खेती की सलाह चाहिए? कृषिमित्र से पूछें!",
    farmContextBadge: "आपके खेतों और फसलों से सीधे जुड़ा हुआ",
    voiceNotSupported: "आपके ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है।",
    errorReply: "सलाह प्राप्त करने में त्रुटि हुई। कृपया दोबारा प्रयास करें।",
    suggestions: [
      "🗺️ मेरे पास कुल कितने खेत हैं?",
      "🌿 मैं अभी कौन सी फसलें उगा रहा हूँ?",
      "🧪 मेरे खेत की मिट्टी का प्रकार क्या है?",
      "🌾 धान की फसल के लिए खाद का सही समय क्या है?",
      "💰 पीएम-किसान ₹6,000 योजना के लिए कैसे आवेदन करें?"
    ]
  },
  ta: {
    title: "கிரிஷ்மித்ரா (KRISHMITRA)",
    subtitle: "உங்கள் வேளாண் ஆலோசகர்",
    welcome: "🌱 வணக்கம்! நான் உங்கள் கிரிஷ்மித்ரா (KRISHMITRA). உங்கள் நிலங்கள், தற்போதைய பயிர்கள், உர அட்டவணை அல்லது அரசு திட்டங்கள் பற்றி கேட்கலாம்!",
    placeholder: "நிலம், பயிர் அல்லது விவசாயம் பற்றி கேட்கவும்...",
    listening: "🎙️ கேட்கிறேன்... பேசுங்கள்",
    searching: "கிரிஷ்மித்ரா தகவல்களை சேகரிக்கிறது...",
    clearConfirm: "உரையாடலை அழிக்கவா?",
    sources: "வழிகாட்டுதல்கள் & ஆதாரங்கள்",
    copied: "நகலெடுக்கப்பட்டது!",
    copy: "நகல்",
    tooltip: "விவசாய ஆலோசனை வேண்டுமா? கிரிஷ்மித்ராவிடம் கேளுங்கள்!",
    farmContextBadge: "உங்கள் பண்ணை விவரங்களுடன் இணைக்கப்பட்டுள்ளது",
    voiceNotSupported: "உங்கள் உலாவியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை.",
    errorReply: "பதில் பெறுவதில் சிக்கல் ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.",
    suggestions: [
      "🗺️ என்னிடம் எத்தனை நிலங்கள் உள்ளன?",
      "🌿 நான் என்னென்ன பயிர்களை பயிரிடுகிறேன்?",
      "🧪 எனது நிலத்தின் மண் வகை என்ன?",
      "🌾 நெல் பயிருக்கான உர அட்டவணை என்ன?",
      "💰 பிஎம்-கிசான் திட்டத்திற்கு எவ்வாறு விண்ணப்பிப்பது?"
    ]
  },
  kn: {
    title: "ಕ್ರಿಷ್‌ಮಿತ್ರ (KRISHMITRA)",
    subtitle: "ನಿಮ್ಮ ಡಿಜಿಟಲ್ ಕೃಷಿ ಸಲಹೆಗಾರ",
    welcome: "🌱 ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಕ್ರಿಷ್‌ಮಿತ್ರ (KRISHMITRA). ನಿಮ್ಮ ನೋಂದಾಯಿತ ಜಮೀನು, ಪ್ರಸ್ತುತ ಬೆಳೆಗಳು, ಗೊಬ್ಬರದ ಪ್ರಮಾಣ ಮತ್ತು ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಕುರಿತು ಏನನ್ನಾದರೂ ಕೇಳಿ!",
    placeholder: "ನಿಮ್ಮ ಜಮೀನು, ಬೆಳೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ...",
    listening: "🎙️ ಆಲಿಸುತ್ತಿದೆ... ಮಾತನಾಡಿ",
    searching: "ಕ್ರಿಷ್‌ಮಿತ್ರ ಮಾಹಿತಿಯನ್ನು ಹುಡುಕುತ್ತಿದೆ...",
    clearConfirm: "ಸಂಭಾಷಣೆಯನ್ನು ತೆರವುಗೊಳಿಸಬೇಕೇ?",
    sources: "ಆಧಾರಗಳು & ಮಾರ್ಗದರ್ಶಿಗಳು",
    copied: "ಕಾಪಿ ಮಾಡಲಾಗಿದೆ!",
    copy: "ಕಾಪಿ",
    tooltip: "ಕೃಷಿ ಸಲಹೆ ಬೇಕೇ? ಕ್ರಿಷ್‌ಮಿತ್ರ ಅವರನ್ನು ಕೇಳಿ!",
    farmContextBadge: "ನಿಮ್ಮ ಜಮೀನಿನ ವಿವರಗಳೊಂದಿಗೆ ಸಂಪರ್ಕ ಹೊಂದಿದೆ",
    voiceNotSupported: "ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಸೌಲಭ್ಯವಿಲ್ಲ.",
    errorReply: "ಮಾಹಿತಿ ಪಡೆಯುವಲ್ಲಿ ದೋಷ ಸಂಭವಿಸಿದೆ. ದಯವಿಟ್ಟು ಪುನಃ ಪ್ರಯತ್ನಿಸಿ.",
    suggestions: [
      "🗺️ ನನ್ನ ಬಳಿ ಎಷ್ಟು ಜಮೀನುಗಳಿವೆ?",
      "🌿 ನಾನು ಪ್ರಸ್ತುತ ಯಾವ ಬೆಳೆಗಳನ್ನು ಬೆಳೆಯುತ್ತಿದ್ದೇನೆ?",
      "🧪 ನನ್ನ ಜಮೀನಿನ ಮಣ್ಣಿನ ಪ್ರಕಾರ ಯಾವುದು?",
      "🌾 ಭತ್ತದ ಬೆಳೆಗೆ ಗೊಬ್ಬರ ಹಾಕುವ ವಿಧಾನ ತಿಳಿಸಿ?",
      "💰 ಪಿಎಂ-ಕಿಸಾನ್ ಯೋಜನೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದು ಹೇಗೆ?"
    ]
  },
  ml: {
    title: "കൃഷ്മിത്ര (KRISHMITRA)",
    subtitle: "നിങ്ങളുടെ കാർഷിക സഹായി",
    welcome: "🌱 നമസ്കാരം! ഞാൻ കൃഷ്മിത്ര (KRISHMITRA). നിങ്ങളുടെ ഭൂമി, കൃഷി ചെയ്യുന്ന വിളകൾ, വളപ്രയോഗം, കർഷക പദ്ധതികൾ എന്നിവയെക്കുറിച്ച് ചോദിക്കാം!",
    placeholder: "ഭൂമി, വിളകൾ, കൃഷി സംശയങ്ങൾ ചോദിക്കൂ...",
    listening: "🎙️ കേൾക്കുന്നു... സംസാരിക്കൂ",
    searching: "കൃഷ്മിത്ര വിവരങ്ങൾ ശേഖരിക്കുന്നു...",
    clearConfirm: "സന്ദേശങ്ങൾ മായ്‌ക്കണോ?",
    sources: "ഉറവിടങ്ങളും മാർഗ്ഗനിർദ്ദേശങ്ങളും",
    copied: "പകർത്തി!",
    copy: "കോപ്പി",
    tooltip: "കാർഷിക ഉപദേശം വേണോ? കൃഷ്മിത്രയോട് ചോദിക്കൂ!",
    farmContextBadge: "നിങ്ങളുടെ കൃഷിയിട വിവരങ്ങളുമായി ബന്ധിപ്പിച്ചിരിക്കുന്നു",
    voiceNotSupported: "നിങ്ങളുടെ ബ്രൗസറിൽ വോയ്‌സ് ഇൻപുട്ട് ലഭ്യമല്ല.",
    errorReply: "വിവരങ്ങൾ ലഭിക്കുന്നതിൽ തടസ്സം നേരിട്ടു. വീണ്ടും ശ്രമിക്കുക.",
    suggestions: [
      "🗺️ എനിക്ക് എത്ര സ്ഥലങ്ങളുണ്ട്?",
      "🌿 ഞാൻ ഇപ്പോൾ എന്തൊക്കെ വിളകളാണ് കൃഷി ചെയ്യുന്നത്?",
      "🧪 എന്റെ മണ്ണിന്റെ തരം ഏതാണ്?",
      "🌾 നെൽകൃഷിക്ക് വളപ്രയോഗ സമയം ഏതാണ്?",
      "💰 പിഎം-കിസാൻ സഹായത്തിന് എങ്ങനെ അപേക്ഷിക്കാം?"
    ]
  },
  bn: {
    title: "কৃষিমিত্র (KRISHMITRA)",
    subtitle: "আপনার স্মার্ট কৃষি উপদেষ্টা",
    welcome: "🌱 নমস্কার! আমি কৃষিমিত্র (KRISHMITRA)। আপনার নিবন্ধিত জমি, বর্তমান ফসল, সার প্রয়োগ বা সরকারি প্রকল্প নিয়ে যেকোনো প্রশ্ন করুন!",
    placeholder: "আপনার জমি, ফসল বা চাষাবাদ নিয়ে প্রশ্ন করুন...",
    listening: "🎙️ শুনছি... বলুন",
    searching: "কৃষিমিত্র আপনার তথ্য অনুসন্ধান করছে...",
    clearConfirm: "পুরনো কথোপকথন মুছে ফেলতে চান?",
    sources: "তথ্যসূত্র ও নির্দেশিকা",
    copied: "কপি হয়েছে!",
    copy: "কপি",
    tooltip: "কৃষি পরামর্শ প্রয়োজন? কৃষিমিত্রকে জিজ্ঞাসা করুন!",
    farmContextBadge: "আপনার জমির তথ্যের সাথে সরাসরি যুক্ত",
    voiceNotSupported: "আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই।",
    errorReply: "তথ্য পেতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    suggestions: [
      "🗺️ আমার কতগুলো জমি নথিভুক্ত আছে?",
      "🌿 আমি বর্তমানে কী কী ফসল চাষ করছি?",
      "🧪 আমার জমির মাটির ধরন কী?",
      "🌾 ধান চাষে সার প্রয়োগের সঠিক নিয়ম কী?",
      "💰 পিএম-কিসান প্রকল্পে কীভাবে আবেদন করবেন?"
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

function renderBotMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={`empty-${idx}`} style={{ height: "6px" }} />);
      return;
    }

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

    elements.push(
      <p key={idx} style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>
        {formatInline(trimmed)}
      </p>
    );
  });

  return elements;
}

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
      const saved = sessionStorage.getItem("krishmitra_chat_history");
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

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  useEffect(() => {
    try {
      sessionStorage.setItem("krishmitra_chat_history", JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
    }
  }, [isOpen]);

  // Load real-time profile, lands, and active timelines whenever user logs in or opens chat
  const loadFarmerProfile = async () => {
    if (!user?.uid) return;
    try {
      const uid = user.uid;

      // 1. User doc details
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};

      // 2. User's lands
      const landsSnap = await getDocs(query(collection(db, "lands"), where("userId", "==", uid)));
      const landsList = landsSnap.docs.map(d => {
        const dt = d.data();
        return {
          id: d.id,
          landName: dt.landName || dt.name || "My Farm",
          soilType: dt.soilType || "Not specified",
          landSize: dt.landSize || dt.size || "",
          landUnit: dt.landUnit || dt.unit || "acres",
          city: dt.city || "",
          landStatus: dt.landStatus || "Active",
          temperature: dt.temperature,
          humidity: dt.humidity,
          description: dt.description,
          notes: dt.notes || ""
        };
      });

      // 3. User's active crop timelines
      const timelinesSnap = await getDocs(query(collection(db, "timelines"), where("userId", "==", uid), where("status", "==", "active")));
      const todayStr = new Date().toISOString().split("T")[0];
      const cropsList = timelinesSnap.docs.map(d => {
        const dt = d.data();
        const tasks = dt.tasks || [];
        const todayTasks = tasks.filter(t => !t.completed && t.date === todayStr);
        const pendingTasks = tasks.filter(t => !t.completed);
        return {
          id: d.id,
          crop: dt.crop || "Unknown Crop",
          landName: dt.landName || "",
          startDate: dt.startDate || "",
          harvestDate: dt.harvestDate || "",
          totalDays: dt.totalDays || "",
          summary: dt.summary || "",
          todayTasks: todayTasks.map(t => t.title),
          pendingCount: pendingTasks.length,
          nextTask: pendingTasks[0] ? `${pendingTasks[0].title} (due ${pendingTasks[0].date})` : null
        };
      });

      setFarmContext({
        profile: {
          name: userData.displayName || user.displayName || user.email?.split("@")[0] || "Farmer",
          email: user.email || "",
          phone: userData.phone || "",
          state: userData.state || "",
          district: userData.district || "",
          plan: userData.plan || "free",
        },
        lands: landsList,
        activeCrops: cropsList
      });
    } catch (err) {
      console.warn("KRISHMITRA: Could not load farm profile:", err);
    }
  };

  useEffect(() => {
    loadFarmerProfile();
  }, [user]);

  // Refresh profile when chat opens to ensure freshest land and crop counts
  useEffect(() => {
    if (isOpen) {
      loadFarmerProfile();
    }
  }, [isOpen]);

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
      console.error("KRISHMITRA Chat error:", err);
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
        sessionStorage.removeItem("krishmitra_chat_history");
      } catch (e) {}
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const currentFlag = LANGUAGES?.find(l => l.code === lang)?.flag || "🇮🇳";
  const landsCount = farmContext?.lands?.length || 0;
  const cropsCount = farmContext?.activeCrops?.length || 0;
  const farmerName = farmContext?.profile?.name || user?.displayName || "Farmer";

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

      {/* KRISHMITRA Chat Window Popup */}
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

          {/* Farm Profile Live Status Bar */}
          <div style={S.contextPillBar}>
            <span style={S.contextIcon}>👨‍🌾</span>
            <span style={S.contextText}>
              <strong>{farmerName}</strong> • {landsCount} {landsCount === 1 ? "Land" : "Lands"} • {cropsCount} Active {cropsCount === 1 ? "Crop" : "Crops"}
            </span>
          </div>

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
    padding: "8px 14px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11.5px",
    color: "#166534",
  },
  contextIcon: {
    fontSize: "13px",
  },
  contextText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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
