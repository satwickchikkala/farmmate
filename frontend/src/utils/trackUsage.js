// src/utils/trackUsage.js
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

const MARGIN = 1.2; // 20% margin on API costs

// Approximate API costs in INR
const API_COSTS = {
  cropRec: 0.5,     // Gemini call
  timeline: 1.0,    // Gemini call (longer)
  disease: 0.8,     // TensorFlow + Gemini
  weather: 0.1,     // OpenWeather call
  extraLand: 10,    // per extra land per month
};

export const trackUsage = async (userId, feature) => {
  const month = new Date().toISOString().slice(0, 7); // "2026-05"
  const docRef = doc(db, "usage", `${userId}_${month}`);

  const cost = (API_COSTS[feature] || 0) * MARGIN;

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        [`${feature}Count`]: increment(1),
        totalCost: increment(cost),
        lastUpdated: new Date().toISOString(),
      });
    } else {
      await setDoc(docRef, {
        userId,
        month,
        [`${feature}Count`]: 1,
        totalCost: cost,
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Usage tracking error:", err);
  }
};

export const getMonthlyUsage = async (userId) => {
  const month = new Date().toISOString().slice(0, 7);
  const docRef = doc(db, "usage", `${userId}_${month}`);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
};