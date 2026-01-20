"use client";

import React from "react";
import { X, MessageCircle } from "lucide-react";
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
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/6">
                {a.icon ? (
                  <span className="text-current">{a.icon}</span>
                ) : (
                  <MessageCircle className="h-5 w-5" />
                )}
              </div>
            </div>

            <div className="flex-1">
              {a.subject ? (
                <div className="text-sm font-semibold truncate">{a.subject}</div>
              ) : null}
              <div className={`text-xs ${a.subject ? 'text-muted-foreground' : 'font-semibold'}`}>{a.title}</div>
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
