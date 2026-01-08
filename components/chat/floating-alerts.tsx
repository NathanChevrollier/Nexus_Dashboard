"use client";

import React from "react";
import { X } from "lucide-react";
import { useAlerts } from "./alerts-context";

export default function FloatingAlerts() {
  const { alerts, removeAlert } = useAlerts();

  if (!alerts.length) return null;

  return (
    <div style={{ position: "fixed", right: 20, bottom: 96, zIndex: 9999 }}>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`max-w-sm w-full rounded-xl p-3 shadow-lg flex items-start gap-3 ${
              a.type === "error" ? "bg-red-600 text-white" : a.type === "warning" ? "bg-yellow-600 text-black" : a.type === "success" ? "bg-green-600 text-white" : "bg-zinc-900 text-white"
            }`}
          >
            <div className="flex-1">
              <div className="font-semibold">{a.title}</div>
              {a.message && <div className="text-sm opacity-90 mt-1">{a.message}</div>}
            </div>
            <button onClick={() => removeAlert(a.id)} className="p-1 opacity-80 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
