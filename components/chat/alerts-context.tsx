"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type Alert = {
  id: string;
  type?: "info" | "error" | "warning" | "success";
  title: string;
  message?: string;
  ttl?: number; // milliseconds
};

type AlertsContextValue = {
  alerts: Alert[];
  addAlert: (a: Omit<Alert, "id">) => string;
  removeAlert: (id: string) => void;
};

const AlertsContext = createContext<AlertsContextValue | undefined>(undefined);

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = (a: Omit<Alert, "id">) => {
    const id = Math.random().toString(36).slice(2, 9);
    const alert: Alert = { id, ...a };
    setAlerts((s) => [alert, ...s]);

    if (alert.ttl && alert.ttl > 0) {
      setTimeout(() => setAlerts((s) => s.filter((x) => x.id !== id)), alert.ttl);
    }

    return id;
  };

  const removeAlert = (id: string) => setAlerts((s) => s.filter((a) => a.id !== id));

  const value = useMemo(() => ({ alerts, addAlert, removeAlert }), [alerts]);

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertsProvider");
  return ctx;
}

export type { Alert };
