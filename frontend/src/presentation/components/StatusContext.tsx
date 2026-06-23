"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface StatusMapping {
  none: string;     // Mapping for "미컨택"
  contact: string;  // Mapping for "컨택"
  done: string;     // Mapping for "완료"
}

interface StatusContextType {
  statusLabels: StatusMapping;
  updateStatusLabel: (key: keyof StatusMapping, newLabel: string) => void;
  getDisplayLabel: (dbStatus: string | undefined) => string;
}

const defaultMapping: StatusMapping = {
  none: "미연락",
  contact: "컨택",
  done: "완료",
};

const StatusContext = createContext<StatusContextType | undefined>(undefined);

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const [statusLabels, setStatusLabels] = useState<StatusMapping>(defaultMapping);

  useEffect(() => {
    const saved = localStorage.getItem("statusLabels");
    if (saved) {
      try {
        setStatusLabels(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load statusLabels", e);
      }
    }
  }, []);

  const updateStatusLabel = (key: keyof StatusMapping, newLabel: string) => {
    if (!newLabel.trim()) return;
    setStatusLabels((prev) => {
      const next = { ...prev, [key]: newLabel };
      localStorage.setItem("statusLabels", JSON.stringify(next));
      return next;
    });
  };

  const getDisplayLabel = (dbStatus: string | undefined): string => {
    const status = dbStatus || "미컨택";
    if (status === "컨택") return statusLabels.contact;
    if (status === "완료") return statusLabels.done;
    return statusLabels.none;
  };

  return (
    <StatusContext.Provider value={{ statusLabels, updateStatusLabel, getDisplayLabel }}>
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  const context = useContext(StatusContext);
  if (!context) {
    throw new Error("useStatus must be used within a StatusProvider");
  }
  return context;
}
