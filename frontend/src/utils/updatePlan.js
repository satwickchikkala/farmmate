// src/utils/updatePlan.js
import { db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export const updateUserPlan = async (userId, plan, paymentId) => {
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1); // 1 year from now

  await setDoc(doc(db, "users", userId), {
    plan: plan,
    planExpiry: expiry.toISOString(),
    paymentId: paymentId,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};

export const getUserPlan = async (userId) => {
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    // Check if plan is expired
    if (data.planExpiry && new Date(data.planExpiry) < new Date()) {
      return "free"; // expired
    }
    return data.plan || "free";
  }
  return "free"; // default
};