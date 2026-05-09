// src/utils/trackUsage.js
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { PAYG_PRICES } from "./paygPricing";

export const trackUsage = async (userId, feature) => {
  const month = new Date().toISOString().slice(0, 7);
  const docRef = doc(db, "usage", `${userId}_${month}`);
  const price = PAYG_PRICES[feature]?.price || 0;

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        [`${feature}Count`]: increment(1),
        [`${feature}Cost`]: increment(price),
        totalCost: increment(price),
        lastUpdated: new Date().toISOString(),
      });
    } else {
      await setDoc(docRef, {
        userId,
        month,
        [`${feature}Count`]: 1,
        [`${feature}Cost`]: price,
        totalCost: price,
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

export const getPreviousMonthUsage = async (userId) => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const month = d.toISOString().slice(0, 7);
  const docRef = doc(db, "usage", `${userId}_${month}`);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
};