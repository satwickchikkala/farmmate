// src/context/PlanContext.js
import { createContext, useContext, useState, useEffect } from "react";
import { getUserPlan } from "../utils/updatePlan";
import { auth } from "../firebase";

const PlanContext = createContext();

export function PlanProvider({ children, user }) {
  const [plan, setPlan] = useState("free");
  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      if (user) {
        const userPlan = await getUserPlan(user.uid);
        setPlan(userPlan);
      }
      setPlanLoading(false);
    };
    loadPlan();
  }, [user]);

  const refreshPlan = async () => {
    if (user) {
      const userPlan = await getUserPlan(user.uid);
      setPlan(userPlan);
    }
  };

  return (
    <PlanContext.Provider value={{ plan, planLoading, refreshPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);