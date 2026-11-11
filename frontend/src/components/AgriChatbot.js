// src/components/AgriChatbot.js
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_URL from "../config";
import { useLanguage } from "../context/LanguageContext";
import { usePopup } from "../context/PopupContext";
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
    subtitle: "Your AI Agricultural Advisor & Farm Assistant",
    welcome: "🌱 Hello! I am KRISHMITRA. I have access to your registered lands, crops, and the official ICAR agricultural knowledge base. How can I assist your farming today?",
    placeholder: "Ask about your lands, crops, fertilizers, pest cures...",
    listening: "🎙️ Listening... speak now",
    searching: "KRISHMITRA is checking your farm data & agricultural guides...",
    clearConfirm: "Are you sure you want to clear this entire conversation history?",
    clearTitle: "Clear Conversation",
    clearBtn: "Yes, Clear",
    cancelBtn: "Cancel",
    clearedSuccess: "Conversation cleared successfully.",
    sources: "Sources & Verified Guidelines",
    copied: "Copied!",
    copy: "Copy",
    tooltip: "Need farming advice? Ask KRISHMITRA!",
    verifiedFarmBadge: "Verified Live Farm Data",
    voiceNotSupported: "Speech recognition is not supported in this browser.",
    errorReply: "I encountered an issue fetching agricultural advice. Please check your connection and try again.",
    quickCategories: [
      {
        icon: "🗺️",
        category: "My Lands & Soil",
        items: [
          "How many lands do I have?",
          "What is my soil type?",
          "Where are my farms located?"
        ]
      },
      {
        icon: "🌿",
        category: "My Active Crops",
        items: [
          "What crops am I growing?",
          "What tasks do I have upcoming?"
        ]
      },
      {
        icon: "🌾",
        category: "Crop Care & Nutrients",
        items: [
          "Fertilizer schedule for Paddy",
          "Zinc deficiency cure in crops",
          "Tomato early blight treatment"
        ]
      },
      {
        icon: "🐛",
        category: "Pest & Organic IPM",
        items: [
          "How to control stem borer organically?",
          "How to prepare Jeevamrutha at home?",
          "Cotton pink bollworm control"
        ]
      },
      {
        icon: "🏛️",
        category: "Govt Schemes & Subsidies",
        items: [
          "How to apply for PM-KISAN ₹6,000?",
          "Drip irrigation 55% subsidy rules",
          "PMFBY crop insurance claim within 72 hrs"
        ]
      }
    ]
  },
  te: {
    title: "క్రిష్‌మిత్ర (KRISHMITRA)",
    subtitle: "మీ స్మార్ట్ డిజిటల్ రైతు సలహాదారు",
    welcome: "🌱 నమస్కారం! నేను మీ క్రిష్‌మిత్ర (KRISHMITRA). మీ నమోదైన భూములు, ప్రస్తుత పంటలు, ఎరువుల మోతాదు, పురుగుల నివారణ మరియు పీఎం-కిసాన్ పథకాల గురించి నన్ను ఏదైనా అడగవచ్చు!",
    placeholder: "మీ భూములు, పంటలు లేదా ఎరువుల గురించి అడగండి...",
    listening: "🎙️ వింటున్నాను... మాట్లాడండి",
    searching: "క్రిష్‌మిత్ర మీ వివరాలను మరియు మార్గదర్శకాలను శోధిస్తోంది...",
    clearConfirm: "మీరు ఈ సంభాషణను పూర్తిగా తొలగించాలనుకుంటున్నారా?",
    clearTitle: "సంభాషణను తొలగించండి",
    clearBtn: "అవును, తొలగించు",
    cancelBtn: "రద్దు చేయి",
    clearedSuccess: "సంభాషణ విజయవంతంగా తొలగించబడింది.",
    sources: "ఆధార గ్రంథాలు & మార్గదర్శకాలు",
    copied: "కాపీ చేయబడింది!",
    copy: "కాపీ",
    tooltip: "వ్యవసాయ సలహా కావాలా? క్రిష్‌మిత్రను అడగండి!",
    verifiedFarmBadge: "ధృవీకరించబడిన వ్యక్తిగత సమాచారం",
    voiceNotSupported: "మీ బ్రౌజర్‌లో వాయిస్ రికగ్నిషన్ సదుపాయం లేదు.",
    errorReply: "సలహా అందించడంలో సమస్య తలెత్తింది. దయచేసి మళ్లీ ప్రయత్నించండి.",
    quickCategories: [
      {
        icon: "🗺️",
        category: "నా భూములు & నేల",
        items: [
          "నాకు ఎన్ని భూములు ఉన్నాయి?",
          "నా భూమి నేల రకం ఏమిటి?"
        ]
      },
      {
        icon: "🌿",
        category: "నా ప్రస్తుత పంటలు",
        items: [
          "నేను ప్రస్తుతం ఏ పంటలు సాగు చేస్తున్నాను?"
        ]
      },
      {
        icon: "🌾",
        category: "పంటల సాగు & ఎరువులు",
        items: [
          "వరి పంటకు ఎరువుల మోతాదు మరియు సమయం ఏమిటి?",
          "జీవామృతం తయారీ విధానం ఏమిటి?"
        ]
      },
      {
        icon: "🐛",
        category: "పురుగుల నివారణ",
        items: [
          "కాండం తొలిచే పురుగును సేంద్రీయంగా ఎలా నివారించాలి?",
          "టమాట ఆకుల ముడత నివారణ ఏమిటి?"
        ]
      },
      {
        icon: "🏛️",
        category: "ప్రభుత్వ పథకాలు",
        items: [
          "పీఎం-కిసాన్ ₹6,000 పథకానికి ఎలా దరఖాస్తు చేయాలి?",
          "బిందు సేద్యం (డ్రిప్) సబ్సిడీ వివరాలు ఏమిటి?"
        ]
      }
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
    clearTitle: "बातचीत हटाएं",
    clearBtn: "हाँ, हटाएं",
    cancelBtn: "रद्द करें",
    clearedSuccess: "बातचीत सफलता से मिटा दी गई।",
    sources: "प्रामाणिक स्रोत व दिशा-निर्देश",
    copied: "कॉपी हो गया!",
    copy: "कॉपी",
    tooltip: "खेती की सलाह चाहिए? कृषिमित्र से पूछें!",
    verifiedFarmBadge: "सत्यापित खेत डेटा",
    voiceNotSupported: "आपके ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है।",
    errorReply: "सलाह प्राप्त करने में त्रुटि हुई। कृपया दोबारा प्रयास करें।",
    quickCategories: [
      {
        icon: "🗺️",
        category: "मेरे खेत व मिट्टी",
        items: [
          "मेरे पास कुल कितने खेत हैं?",
          "मेरे खेत की मिट्टी का प्रकार क्या है?"
        ]
      },
      {
        icon: "🌿",
        category: "मेरी वर्तमान फसलें",
        items: [
          "मैं अभी कौन सी फसलें उगा रहा हूँ?"
        ]
      },
      {
        icon: "🌾",
        category: "फसल पोषण व खाद",
        items: [
          "धान की फसल के लिए खाद का सही समय क्या है?",
          "जीवामृत बनाने की सही विधि क्या है?"
        ]
      },
      {
        icon: "🐛",
        category: "कीट नियंत्रण",
        items: [
          "तना छेदक कीट की जैविक रोकथाम कैसे करें?",
          "टमाटर की पत्तियों के मुड़ने का इलाज क्या है?"
        ]
      },
      {
        icon: "🏛️",
        category: "सरकारी योजनाएं",
        items: [
          "पीएम-किसान ₹6,000 योजना के लिए कैसे आवेदन करें?",
          "ड्रिप सिंचाई पर कितनी सब्सिडी मिलती है?"
        ]
      }
    ]
  },
  ta: {
    title: "கிரிஷ்மித்ரா (KRISHMITRA)",
    subtitle: "உங்கள் வேளாண் ஆலோசகர்",
    welcome: "🌱 வணக்கம்! நான் உங்கள் கிரிஷ்மித்ரா (KRISHMITRA). உங்கள் நிலங்கள், பயிர்கள், உர அட்டவணை அல்லது அரசு திட்டங்கள் பற்றி கேட்கலாம்!",
    placeholder: "நிலம், பயிர் அல்லது விவசாயம் பற்றி கேட்கவும்...",
    listening: "🎙️ கேட்கிறேன்... பேசுங்கள்",
    searching: "கிரிஷ்மித்ரா தகவல்களை சேகரிக்கிறது...",
    clearConfirm: "உரையாடலை அழிக்க விரும்புகிறீர்களா?",
    clearTitle: "உரையாடலை அழிக்க",
    clearBtn: "அழி",
    cancelBtn: "ரத்து செய்",
    clearedSuccess: "உரையாடல் அழிக்கப்பட்டது.",
    sources: "வழிகாட்டுதல்கள் & ஆதாரங்கள்",
    copied: "நகலெடுக்கப்பட்டது!",
    copy: "நகல்",
    tooltip: "விவசாய ஆலோசனை வேண்டுமா? கிரிஷ்மித்ராவிடம் கேளுங்கள்!",
    verifiedFarmBadge: "உறுதிப்படுத்தப்பட்ட பண்ணை தகவல்",
    voiceNotSupported: "குரல் உள்ளீடு ஆதரிக்கப்படவில்லை.",
    errorReply: "பதில் பெறுவதில் சிக்கல் ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.",
    quickCategories: [
      {
        icon: "🗺️",
        category: "எனது நிலங்கள்",
        items: ["என்னிடம் எத்தனை நிலங்கள் உள்ளன?", "எனது நிலத்தின் மண் வகை என்ன?"]
      },
      {
        icon: "🌿",
        category: "எனது பயிர்கள்",
        items: ["நான் என்னென்ன பயிர்களை பயிரிடுகிறேன்?"]
      },
      {
        icon: "🌾",
        category: "உர மேலாண்மை",
        items: ["நெல் பயிருக்கான உர அட்டவணை என்ன?", "தண்டு துளைப்பானை இயற்கை முறையில் கட்டுப்படுத்துவது எப்படி?"]
      },
      {
        icon: "🏛️",
        category: "அரசு திட்டங்கள்",
        items: ["பிஎம்-கிசான் திட்டத்திற்கு எவ்வாறு விண்ணப்பிப்பது?"]
      }
    ]
  },
  kn: {
    title: "ಕ್ರಿಷ್‌ಮಿತ್ರ (KRISHMITRA)",
    subtitle: "ನಿಮ್ಮ ಡಿಜಿಟಲ್ ಕೃಷಿ ಸಲಹೆಗಾರ",
    welcome: "🌱 ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಕ್ರಿಷ್‌ಮಿತ್ರ (KRISHMITRA). ನಿಮ್ಮ ಜಮೀನು, ಬೆಳೆಗಳು, ಗೊಬ್ಬರದ ಪ್ರಮಾಣ ಮತ್ತು ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಕುರಿತು ಏನನ್ನಾದರೂ ಕೇಳಿ!",
    placeholder: "ನಿಮ್ಮ ಜಮೀನು, ಬೆಳೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ...",
    listening: "🎙️ ಆಲಿಸುತ್ತಿದೆ... ಮಾತನಾಡಿ",
    searching: "ಕ್ರಿಷ್‌ಮಿತ್ರ ಮಾಹಿತಿಯನ್ನು ಹುಡುಕುತ್ತಿದೆ...",
    clearConfirm: "ಸಂಭಾಷಣೆಯನ್ನು ತೆರವುಗೊಳಿಸಲು ನೀವು ಖಚಿತವಾಗಿ ಬಯಸುವಿರಾ?",
    clearTitle: "ಸಂಭಾಷಣೆ ತೆರವುಗೊಳಿಸಿ",
    clearBtn: "ತೆರವುಗೊಳಿಸಿ",
    cancelBtn: "ರದ್ದುಮಾಡಿ",
    clearedSuccess: "ಸಂಭಾಷಣೆ ತೆರವುಗೊಳಿಸಲಾಗಿದೆ.",
    sources: "ಆಧಾರಗಳು & ಮಾರ್ಗದರ್ಶಿಗಳು",
    copied: "ಕಾಪಿ ಮಾಡಲಾಗಿದೆ!",
    copy: "ಕಾಪಿ",
    tooltip: "ಕೃಷಿ ಸಲಹೆ ಬೇಕೇ? ಕ್ರಿಷ್‌ಮಿತ್ರ ಅವರನ್ನು ಕೇಳಿ!",
    verifiedFarmBadge: "ಖಚಿತಪಡಿಸಿದ ಜಮೀನು ಮಾಹಿತಿ",
    voiceNotSupported: "ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಸೌಲಭ್ಯವಿಲ್ಲ.",
    errorReply: "ಮಾಹಿತಿ ಪಡೆಯುವಲ್ಲಿ ದೋಷ ಸಂಭವಿಸಿದೆ. ಪುನಃ ಪ್ರಯತ್ನಿಸಿ.",
    quickCategories: [
      {
        icon: "🗺️",
        category: "ನನ್ನ ಜಮೀನುಗಳು",
        items: ["ನನ್ನ ಬಳಿ ಎಷ್ಟು ಜಮೀನುಗಳಿವೆ?", "ನನ್ನ ಜಮೀನಿನ ಮಣ್ಣಿನ ಪ್ರಕಾರ ಯಾವುದು?"]
      },
      {
        icon: "🌿",
        category: "ನನ್ನ ಬೆಳೆಗಳು",
        items: ["ನಾನು ಪ್ರಸ್ತುತ ಯಾವ ಬೆಳೆಗಳನ್ನು ಬೆಳೆಯುತ್ತಿದ್ದೇನೆ?"]
      },
      {
        icon: "🌾",
        category: "ಬೆಳೆ ಆರೈಕೆ",
        items: ["ಭತ್ತದ ಬೆಳೆಗೆ ಗೊಬ್ಬರ ಹಾಕುವ ವಿಧಾನ ತಿಳಿಸಿ?", "ಕಾಂಡ ಕೊರೆಯುವ ಹುಳುವನ್ನು ಸಾವಯವವಾಗಿ ನಿಯಂತ್ರಿಸುವುದು ಹೇಗೆ?"]
      },
      {
        icon: "🏛️",
        category: "ಸರ್ಕಾರಿ ಯೋಜನೆ",
        items: ["ಪಿಎಂ-ಕಿಸಾನ್ ಯೋಜನೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದು ಹೇಗೆ?"]
      }
    ]
  },
  ml: {
    title: "കൃഷ്മിത്ര (KRISHMITRA)",
    subtitle: "നിങ്ങളുടെ കാർഷിക സഹായി",
    welcome: "🌱 നമസ്കാരം! ഞാൻ കൃഷ്മിത്ര (KRISHMITRA). നിങ്ങളുടെ കൃഷിയിടം, വിളകൾ, വളപ്രയോഗം, കർഷക പദ്ധതികൾ എന്നിവയെക്കുറിച്ച് ചോദിക്കാം!",
    placeholder: "ഭൂമി, വിളകൾ, കൃഷി സംശയങ്ങൾ ചോദിക്കൂ...",
    listening: "🎙️ കേൾക്കുന്നു... സംസാരിക്കൂ",
    searching: "കൃഷ്മിത്ര വിവരങ്ങൾ ശേഖരിക്കുന്നു...",
    clearConfirm: "സംഭാഷണം മായ്‌ക്കാൻ താൽപ്പര്യമുണ്ടോ?",
    clearTitle: "സംഭാഷണം മായ്‌ക്കുക",
    clearBtn: "മായ്‌ക്കുക",
    cancelBtn: "റദ്ദാക്കുക",
    clearedSuccess: "സംഭാഷണം വിജയകരമായി മായ്‌ച്ചു.",
    sources: "ഉറവിടങ്ങളും മാർഗ്ഗനിർദ്ദേശങ്ങളും",
    copied: "പകർത്തി!",
    copy: "കോപ്പി",
    tooltip: "കാർഷിക ഉപദേശം വേണോ? കൃഷ്മിത്രയോട് ചോദിക്കൂ!",
    verifiedFarmBadge: "കൃഷിയിട വിവരങ്ങൾ",
    voiceNotSupported: "വോയ്‌സ് ഇൻപുട്ട് ലഭ്യമല്ല.",
    errorReply: "വിവരങ്ങൾ ലഭിക്കുന്നതിൽ തടസ്സം നേരിട്ടു. വീണ്ടും ശ്രമിക്കുക.",
    quickCategories: [
      {
        icon: "🗺️",
        category: "എന്റെ സ്ഥലങ്ങൾ",
        items: ["എനിക്ക് എത്ര സ്ഥലങ്ങളുണ്ട്?", "എന്റെ മണ്ണിന്റെ തരം ഏതാണ്?"]
      },
      {
        icon: "🌿",
        category: "എന്റെ വിളകൾ",
        items: ["ഞാൻ ഇപ്പോൾ എന്തൊക്കെ വിളകളാണ് കൃഷി ചെയ്യുന്നത്?"]
      },
      {
        icon: "🌾",
        category: "കൃഷി പരിചരണം",
        items: ["നെൽകൃഷിക്ക് വളപ്രയോഗ സമയം ഏതാണ്?"]
      }
    ]
  },
  bn: {
    title: "কৃষিমিত্র (KRISHMITRA)",
    subtitle: "আপনার স্মার্ট কৃষি উপদেষ্টা",
    welcome: "🌱 নমস্কার! আমি কৃষিমিত্র (KRISHMITRA)। আপনার জমি, ফসল, সার প্রয়োগ বা সরকারি প্রকল্প নিয়ে যেকোনো প্রশ্ন করুন!",
    placeholder: "আপনার জমি, ফসল বা চাষাবাদ নিয়ে প্রশ্ন করুন...",
    listening: "🎙️ শুনছি... বলুন",
    searching: "কৃষিমিত্র আপনার তথ্য অনুসন্ধান করছে...",
    clearConfirm: "আপনি কি সমস্ত বার্তা মুছে ফেলতে চান?",
    clearTitle: "বার্তা মুছুন",
    clearBtn: "মুছুন",
    cancelBtn: "বাতিল",
    clearedSuccess: "বার্তা সফলভাবে মুছে ফেলা হয়েছে।",
    sources: "তথ্যসূত্র ও নির্দেশিকা",
    copied: "কপি হয়েছে!",
    copy: "কপি",
    tooltip: "কৃষি পরামর্শ প্রয়োজন? কৃষিমিত্রকে জিজ্ঞাসা করুন!",
    verifiedFarmBadge: "যাচাইকৃত জমির তথ্য",
    voiceNotSupported: "ভয়েস সাপোর্ট নেই।",
    errorReply: "তথ্য পেতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    quickCategories: [
      {
        icon: "🗺️",
        category: "আমার জমি",
        items: ["আমার কতগুলো জমি নথিভুক্ত আছে?", "আমার জমির মাটির ধরন কী?"]
      },
      {
        icon: "🌿",
        category: "আমার বর্তমান ফসল",
        items: ["আমি বর্তমানে কী কী ফসল চাষ করছি?"]
      },
      {
        icon: "🌾",
        category: "ফসল পরিচর্যা",
        items: ["ধান চাষে সার প্রয়োগের সঠিক নিয়ম কী?"]
      }
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
        <div key={idx} style={{ fontWeight: "700", color: DARK, fontSize: "15px", marginTop: "10px", marginBottom: "5px", borderBottom: "1px solid #edf2f7", paddingBottom: "4px" }}>
          {formatInline(trimmed.replace(/^###\s+/, ""))}
        </div>
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <div key={idx} style={{ fontWeight: "700", color: DARK, fontSize: "16px", marginTop: "12px", marginBottom: "6px" }}>
          {formatInline(trimmed.replace(/^##\s+/, ""))}
        </div>
      );
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      elements.push(
        <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "6px", paddingLeft: "4px" }}>
          <span style={{ color: GREEN, fontWeight: "bold", fontSize: "14px", lineHeight: "1.4" }}>•</span>
          <span style={{ flex: 1, fontSize: "13.5px", color: "#374151", lineHeight: "1.6" }}>
            {formatInline(trimmed.replace(/^[-*•]\s+/, ""))}
          </span>
        </div>
      );
      return;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "6px", paddingLeft: "4px" }}>
          <span style={{ color: GREEN, fontWeight: "700", fontSize: "13px", minWidth: "18px" }}>{numMatch[1]}.</span>
          <span style={{ flex: 1, fontSize: "13.5px", color: "#374151", lineHeight: "1.6" }}>
            {formatInline(numMatch[2])}
          </span>
        </div>
      );
      return;
    }

    elements.push(
      <p key={idx} style={{ margin: "0 0 8px 0", fontSize: "13.5px", color: "#374151", lineHeight: "1.6" }}>
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
        <span key={match.index} style={{ background: "#e8f5e9", color: DARK, padding: "2px 6px", borderRadius: "4px", fontFamily: "monospace", fontSize: "12px", fontWeight: "500" }}>
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
  const { showConfirm, showAlert } = usePopup();
  const texts = I18N[lang] || I18N.en;

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0);

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

  const loadFarmerProfile = async () => {
    if (!user?.uid) return;
    try {
      const uid = user.uid;

      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      loadFarmerProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      showAlert(texts.voiceNotSupported, "Voice Input");
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
        isPersonal: data.isPersonal || false,
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

  // Uses FarmMate's standard application modal via PopupContext!
  const handleClearHistory = () => {
    showConfirm(
      texts.clearConfirm,
      () => {
        setMessages([]);
        try {
          sessionStorage.removeItem("krishmitra_chat_history");
        } catch (e) {}
        showAlert(texts.clearedSuccess, texts.clearTitle);
      },
      null,
      texts.clearTitle,
      texts.clearBtn,
      texts.cancelBtn
    );
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
  const categories = texts.quickCategories || [];
  const currentCategory = categories[selectedCategoryIdx] || categories[0];

  return (
    <>
      {/* Floating Chat Bubble Button */}
      <div style={S.bubbleContainer}>
        {showTooltip && !isOpen && (
          <div style={S.tooltipBubble} onClick={() => setIsOpen(true)}>
            <span style={{ fontSize: "16px" }}>🌱</span>
            <span>{texts.tooltip}</span>
            <button
              style={S.tooltipClose}
              onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
              title="Dismiss"
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
              <span style={{ fontSize: "28px" }}>🌾</span>
              <span style={S.aiBadge}>AI</span>
            </div>
          )}
        </button>
      </div>

      {/* KRISHMITRA Expanded Pro Panel */}
      {isOpen && (
        <div
          style={{
            ...S.chatCard,
            width: isExpanded ? "min(640px, calc(100vw - 28px))" : "min(460px, calc(100vw - 28px))",
            height: isExpanded ? "min(780px, calc(100vh - 100px))" : "min(680px, calc(100vh - 100px))"
          }}
        >
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
              <span style={S.langPill} title={`Language: ${lang.toUpperCase()}`}>
                {currentFlag}
              </span>
              <button
                onClick={() => setIsExpanded(prev => !prev)}
                style={S.headerIconBtn}
                title={isExpanded ? "Collapse Panel" : "Expand Panel"}
              >
                {isExpanded ? "⊡" : "⛶"}
              </button>
              <button
                onClick={handleClearHistory}
                style={S.headerIconBtn}
                title={texts.clearTitle}
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

          {/* Farm Profile Live Context Bar */}
          <div style={S.contextPillBar}>
            <div style={S.contextBadge}>
              <span style={{ fontSize: "14px" }}>👨‍🌾</span>
              <span style={S.contextFarmerName}>{farmerName}</span>
            </div>
            <div style={S.contextStatsRow}>
              <span style={S.statTag}>
                🗺️ <strong>{landsCount}</strong> {landsCount === 1 ? "Land" : "Lands"}
              </span>
              <span style={S.statTag}>
                🌿 <strong>{cropsCount}</strong> Active {cropsCount === 1 ? "Crop" : "Crops"}
              </span>
            </div>
          </div>

          {/* Messages Area */}
          <div style={S.messagesBody}>
            {/* Welcome Greeting & Big Options Hub */}
            <div style={S.welcomeCard}>
              <div style={S.welcomeTopRow}>
                <span style={{ fontSize: "24px" }}>🌾</span>
                <div>
                  <h4 style={S.welcomeHeading}>Welcome to KRISHMITRA</h4>
                  <p style={S.welcomeSubtext}>{texts.welcome}</p>
                </div>
              </div>

              {/* Big Interactive Category Tabs */}
              {categories.length > 0 && (
                <div style={S.hubSection}>
                  <div style={S.hubTitle}>💡 Quick Farm Inquiries & Guides:</div>

                  {/* Horizontal Category Switcher */}
                  <div style={S.categoryTabsScroll}>
                    {categories.map((cat, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedCategoryIdx(idx)}
                        style={{
                          ...S.categoryTabBtn,
                          background: selectedCategoryIdx === idx ? GREEN : "#f1f5f3",
                          color: selectedCategoryIdx === idx ? "#ffffff" : "#374151",
                          borderColor: selectedCategoryIdx === idx ? GREEN : "#e2e8f0"
                        }}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.category}</span>
                      </button>
                    ))}
                  </div>

                  {/* Large Prompt Cards for the Active Category */}
                  {currentCategory && (
                    <div style={S.optionsGrid}>
                      {currentCategory.items.map((itemText, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(itemText)}
                          style={S.bigOptionCard}
                          disabled={loading}
                        >
                          <span style={S.optionArrow}>➔</span>
                          <span style={S.optionText}>{itemText}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                        {/* Verified Personal Farm Data Indicator */}
                        {msg.isPersonal && (
                          <div style={S.personalVerifiedBadge}>
                            <span>✓</span> {texts.verifiedFarmBadge}
                          </div>
                        )}

                        {renderBotMarkdown(msg.text)}

                        {/* Verified Sources Bar */}
                        {msg.sources && msg.sources.length > 0 && !msg.isPersonal && (
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
                            title="Copy advice"
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
                <div style={{ ...S.msgBubble, ...S.botBubble, padding: "14px 18px" }}>
                  <div style={S.loadingRow}>
                    <div style={S.pulsingDot} />
                    <div style={{ ...S.pulsingDot, animationDelay: "0.2s" }} />
                    <div style={{ ...S.pulsingDot, animationDelay: "0.4s" }} />
                    <span style={{ fontSize: "13px", color: "#6b7280", marginLeft: "8px", fontWeight: "500" }}>
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

          {/* Enhanced Input Footer */}
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
              <span style={{ fontSize: "18px" }}>{isListening ? "⏹️" : "🎙️"}</span>
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
              <span style={{ fontSize: "17px", color: "white" }}>➤</span>
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
    padding: "10px 16px",
    borderRadius: "16px",
    fontSize: "13px",
    fontWeight: "600",
    boxShadow: "0 8px 24px rgba(15, 33, 23, 0.16)",
    border: `2px solid ${LIGHT_GREEN}`,
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    animation: "fadeIn 0.3s ease",
    whiteSpace: "nowrap",
  },
  tooltipClose: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    fontSize: "12px",
    cursor: "pointer",
    padding: "0 4px",
  },
  bubbleBtn: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    border: "3px solid #ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 30px rgba(45, 106, 79, 0.45)",
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
    bottom: "-6px",
    right: "-10px",
    background: ACCENT,
    color: DARK,
    fontSize: "10px",
    fontWeight: "800",
    padding: "2px 6px",
    borderRadius: "10px",
    border: "1.5px solid white",
    letterSpacing: "0.5px",
  },
  // Distinctive, high-impact card outline & elevated pro dimensions
  chatCard: {
    position: "fixed",
    bottom: "96px",
    right: "24px",
    background: "#ffffff",
    borderRadius: "24px",
    boxShadow: "0 24px 70px rgba(15, 33, 23, 0.28), 0 0 0 1.5px rgba(45, 106, 79, 0.22)",
    border: "2px solid rgba(45, 106, 79, 0.15)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 9998,
    fontFamily: FONT,
    animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
    transition: "width 0.25s ease, height 0.25s ease",
  },
  chatHeader: {
    background: `linear-gradient(135deg, ${DARK} 0%, ${GREEN} 100%)`,
    padding: "18px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "white",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  botAvatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  headerTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  headerTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: "0.2px",
  },
  onlineDot: {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
    background: "#52b788",
    boxShadow: "0 0 8px #52b788",
  },
  headerSubtitle: {
    margin: "3px 0 0 0",
    fontSize: "12px",
    color: "#d8f3dc",
    fontWeight: "400",
    opacity: 0.95,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  langPill: {
    background: "rgba(255,255,255,0.18)",
    padding: "4px 10px",
    borderRadius: "14px",
    fontSize: "13px",
  },
  headerIconBtn: {
    background: "rgba(255,255,255,0.16)",
    border: "none",
    color: "#ffffff",
    borderRadius: "10px",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background 0.2s, transform 0.1s",
  },
  contextPillBar: {
    background: "#f0fdf4",
    borderBottom: "1.5px solid #bbf7d0",
    padding: "10px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "12.5px",
    color: "#166534",
  },
  contextBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  contextFarmerName: {
    fontWeight: "700",
    color: DARK,
  },
  contextStatsRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statTag: {
    background: "#ffffff",
    border: "1px solid #bbf7d0",
    padding: "2px 8px",
    borderRadius: "12px",
    fontSize: "11.5px",
  },
  messagesBody: {
    flex: 1,
    padding: "18px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    background: "#f8faf9",
  },
  welcomeCard: {
    background: "#ffffff",
    border: "1.5px solid #d8f3dc",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
  },
  welcomeTopRow: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    marginBottom: "16px",
  },
  welcomeHeading: {
    margin: "0 0 4px 0",
    fontSize: "15px",
    fontWeight: "700",
    color: DARK,
  },
  welcomeSubtext: {
    margin: 0,
    fontSize: "13px",
    color: "#4b5563",
    lineHeight: "1.5",
  },
  hubSection: {
    borderTop: "1px solid #eef2f0",
    paddingTop: "14px",
  },
  hubTitle: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: DARK,
    marginBottom: "10px",
  },
  categoryTabsScroll: {
    display: "flex",
    gap: "6px",
    overflowX: "auto",
    paddingBottom: "8px",
    marginBottom: "12px",
    scrollbarWidth: "none",
  },
  categoryTabBtn: {
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
    fontFamily: FONT,
  },
  optionsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  bigOptionCard: {
    background: "#f9fbfa",
    border: "1.5px solid #d8f3dc",
    borderRadius: "12px",
    padding: "10px 14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textAlign: "left",
    transition: "all 0.18s ease",
    fontFamily: FONT,
  },
  optionArrow: {
    color: GREEN,
    fontWeight: "bold",
    fontSize: "13px",
  },
  optionText: {
    fontSize: "13px",
    fontWeight: "500",
    color: DARK,
    lineHeight: "1.4",
  },
  msgRow: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    width: "100%",
  },
  avatarSmall: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    background: LIGHT_GREEN,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    flexShrink: 0,
    marginTop: "2px",
  },
  msgBubble: {
    maxWidth: "88%",
    borderRadius: "18px",
    fontSize: "13.5px",
    wordBreak: "break-word",
  },
  userBubble: {
    background: GREEN,
    color: "#ffffff",
    padding: "12px 16px",
    borderBottomRightRadius: "4px",
    boxShadow: "0 3px 12px rgba(45, 106, 79, 0.25)",
  },
  userMsgText: {
    fontSize: "13.5px",
    lineHeight: "1.5",
  },
  botBubble: {
    background: "#ffffff",
    color: "#1f2937",
    padding: "14px 18px",
    border: "1.5px solid #e5e7eb",
    borderBottomLeftRadius: "4px",
    boxShadow: "0 3px 12px rgba(0,0,0,0.05)",
  },
  botContent: {
    display: "flex",
    flexDirection: "column",
  },
  personalVerifiedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    padding: "3px 8px",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: "700",
    marginBottom: "10px",
    alignSelf: "flex-start",
  },
  sourcesContainer: {
    marginTop: "12px",
    paddingTop: "10px",
    borderTop: "1px dashed #e2e8f0",
  },
  sourcesTitle: {
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    marginBottom: "6px",
  },
  sourcesList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  sourceTag: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    fontSize: "11px",
    padding: "3px 9px",
    borderRadius: "8px",
    fontWeight: "500",
  },
  botFooterBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "10px",
    paddingTop: "6px",
  },
  timestamp: {
    fontSize: "11px",
    color: "#9ca3af",
  },
  copyBtn: {
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    color: "#4b5563",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "3px 8px",
    borderRadius: "6px",
    transition: "background 0.2s",
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  pulsingDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: GREEN,
    opacity: 0.7,
  },
  listeningBanner: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    borderTop: "1px solid #fecaca",
  },
  micPulse: {
    animation: "pulse 1s infinite",
    fontSize: "11px",
  },
  chatFooter: {
    padding: "12px 18px",
    background: "#ffffff",
    borderTop: "1.5px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  micBtn: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border: "1.5px solid #e5e7eb",
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
    padding: "12px 16px",
    borderRadius: "22px",
    border: "1.5px solid #e2e8f0",
    fontSize: "13.5px",
    fontFamily: FONT,
    outline: "none",
    background: "#f8fafc",
    transition: "border-color 0.2s, background 0.2s",
  },
  sendBtn: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border: "none",
    background: `linear-gradient(135deg, ${GREEN}, ${DARK})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    outline: "none",
    boxShadow: "0 3px 10px rgba(45, 106, 79, 0.35)",
    transition: "opacity 0.2s, transform 0.1s",
  },
};
