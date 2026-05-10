// src/hooks/useGate.js
import { useState, useEffect } from "react";
import { usePlan } from "../context/PlanContext";
import { canCreateNewLand } from "../utils/updatePlan";
import { auth, db } from "../firebase";
import { isServiceStopped } from "../utils/billManager";
import { doc, getDoc } from "firebase/firestore";

export function useGate() {
  const { plan } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState("");
  const [serviceStopped, setServiceStopped] = useState(false);

  useEffect(() => {
    const checkService = async () => {
      if (plan === "payg") {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (snap.exists()) {
          setServiceStopped(isServiceStopped(snap.data()));
        }
      }
    };
    checkService();
  }, [plan]);

  const isPro = plan === "pro";

  // Only for disease detection
  const checkGate = (feature) => {
    // PAYG users with unpaid bills — stop all services
    if (serviceStopped) {
      setBlockedFeature("All services (unpaid bill — please pay to restore)");
      setShowUpgrade(true);
      return false;
    }

    if (plan === "pro" || plan === "payg") return true;

    setBlockedFeature(feature);
    setShowUpgrade(true);
    return false;
  };

  // Lifetime land check — blocks spam workaround
  const checkLandGate = async () => {
    if (isPro) return true;

    const allowed = await canCreateNewLand(auth.currentUser.uid, plan);
    if (!allowed) {
      setBlockedFeature(
        "Adding more than 1 land (Free plan allows only 1 land ever — even after deletion)"
      );
      setShowUpgrade(true);
      return false;
    }
    return true;
  };

  return {
    plan,
    isPro,
    checkGate,
    checkLandGate,
    showUpgrade,
    setShowUpgrade,
    blockedFeature,
  };
}