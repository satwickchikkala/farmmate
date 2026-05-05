// src/hooks/useGate.js
import { useState } from "react";
import { usePlan } from "../context/PlanContext";
import { canCreateNewLand } from "../utils/updatePlan";
import { auth } from "../firebase";

export function useGate() {
  const { plan } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState("");

  const isPro = plan === "pro";

  // Only for disease detection
  const checkGate = (feature) => {
    if (isPro) return true;
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
    isPro,
    checkGate,
    checkLandGate,
    showUpgrade,
    setShowUpgrade,
    blockedFeature,
  };
}