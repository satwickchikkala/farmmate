// src/utils/trackUsage.js
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { PAYG_PRICES } from "./paygPricing";

export const getYearMonth = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const trackUsage = async (userId, feature, landId = null, isPaygLand = false) => {
  // Only charge if this is a PAYG land (11th land onwards)
  if (!isPaygLand) return;

  const month = getYearMonth();
  const docRef = doc(db, "usage", `${userId}_${month}`);
  const price = PAYG_PRICES[feature]?.price || 0;

  const updateData = {
    [`${feature}Count`]: increment(1),
    [`${feature}Cost`]: increment(price),
    totalCost: increment(price),
    lastUpdated: new Date().toISOString(),
    userId,
    month,
  };

  // Also track per land for detailed billing
  if (landId) {
    updateData[`land_${landId}_${feature}Count`] = increment(1);
    updateData[`land_${landId}_${feature}Cost`] = increment(price);
  }

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, updateData);
    } else {
      await setDoc(docRef, {
        ...updateData,
        [`${feature}Count`]: 1,
        [`${feature}Cost`]: price,
        totalCost: price,
      });
    }
  } catch (err) {
    console.error("Usage tracking error:", err);
  }
};

export const getMonthlyUsage = async (userId) => {
  const month = getYearMonth();
  const docRef = doc(db, "usage", `${userId}_${month}`);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
};

export const getPreviousMonthUsage = async (userId) => {
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = getYearMonth(prevMonthDate);
  const docRef = doc(db, "usage", `${userId}_${month}`);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
};