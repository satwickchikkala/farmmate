// src/hooks/useGate.js
import { useState } from "react";
import { usePlan } from "../context/PlanContext";

const FREE_LIMITS = {
  lands: 1,
  cropRec: 5,      // per month
  disease: 3,      // per month
  timeline: 1,     // per month
};

export function useGate() {
  const { plan } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState("");

  const isPro = plan === "pro";

  const checkGate = (feature) => {
    if (isPro) return true; // Pro users pass all gates

    setBlockedFeature(feature);
    setShowUpgrade(true);
    return false;
  };

  const canAddLand = (currentLandCount) => {
    if (isPro) return true;
    if (currentLandCount >= FREE_LIMITS.lands) {
      setBlockedFeature("Adding more than 1 land");
      setShowUpgrade(true);
      return false;
    }
    return true;
  };

  return {
    isPro,
    checkGate,
    canAddLand,
    showUpgrade,
    setShowUpgrade,
    blockedFeature,
  };
}