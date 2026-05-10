// src/context/PlanContext.js
import { createContext, useContext, useState, useEffect } from "react";
import { getUserPlanInfo } from "../utils/updatePlan";
import { auth } from "../firebase";

const PlanContext = createContext();

export function PlanProvider({ children, user }) {
  const [plan, setPlan] = useState("free");
  const [planExpiry, setPlanExpiry] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      if (user) {
        const { plan: p, planExpiry: e } = await getUserPlanInfo(user.uid);
        setPlan(p);
        setPlanExpiry(e);
      }
      setPlanLoading(false);
    };
    loadPlan();
  }, [user]);

  const refreshPlan = async () => {
    if (user) {
      const { plan: p, planExpiry: e } = await getUserPlanInfo(user.uid);
      setPlan(p);
      setPlanExpiry(e);
    }
  };

  return (
    <PlanContext.Provider value={{ plan, planExpiry, planLoading, refreshPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);