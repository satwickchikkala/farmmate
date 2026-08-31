// src/utils/updatePlan.js
import { db } from "../firebase";
import { doc, setDoc, getDoc, updateDoc, increment } from "firebase/firestore";

export const updateUserPlan = async (userId, plan, paymentId) => {
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);

  await setDoc(doc(db, "users", userId), {
    plan: plan,
    planExpiry: expiry.toISOString(),
    paymentId: paymentId,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};

export const getUserPlanInfo = async (userId) => {
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    const plan = data.plan || "free";

    if (plan === "pro") {
      const expiry = data.planExpiry ? new Date(data.planExpiry) : null;
      const isExpired = expiry && expiry < new Date();
      return {
        plan: isExpired ? "free" : "pro",
        planExpiry: data.planExpiry || null,
      };
    }

    return {
      plan: plan,
      planExpiry: data.planExpiry || null,
    };
  }
  return { plan: "free", planExpiry: null };
};

// Call this when user CREATES a new land
export const incrementLandCount = async (userId) => {
  const docRef = doc(db, "users", userId);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    await updateDoc(docRef, {
      totalLandsCreated: increment(1),
    });
  } else {
    await setDoc(docRef, {
      plan: "free",
      totalLandsCreated: 1,
    }, { merge: true });
  }
};

// Check if free user has exceeded lifetime land limit
export const canCreateNewLand = async (userId, plan) => {
  if (plan === "pro") return true; // Pro users unlimited

  const docRef = doc(db, "users", userId);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const data = snap.data();
    const totalCreated = data.totalLandsCreated || 0;
    return totalCreated < 1; // Free users can only ever create 1 land total
  }
  return true; // First time user
};