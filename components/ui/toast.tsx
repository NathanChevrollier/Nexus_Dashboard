"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number; // ms
}

interface ToastContextValue {
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = generateId();
    const toast: Toast = { id, ...t };
    setToasts((s) => [toast, ...s]);
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        setToasts((s) => s.filter((tt) => tt.id !== id));
      }, toast.duration);
    } else {
      // default 4s
      setTimeout(() => setToasts((s) => s.filter((tt) => tt.id !== id)), 4000);
    }
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id));
  }, []);

  const value = { push, dismiss };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof window !== "undefined" && createPortal(<ToastViewport toasts={toasts} onDismiss={dismiss} />, document.body)}
    </ToastContext.Provider>
  );
};

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  // simple container top-right
  return (
    <div className="fixed right-4 top-4 z-[9999] flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`w-full rounded-lg shadow-lg p-3 border overflow-hidden flex items-start gap-3 transition-transform duration-150 `}
          role="status"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${t.type === "success" ? "text-emerald-600" : t.type === "error" ? "text-red-600" : "text-sky-600"}`}>
                  {t.title}
                </span>
              </div>
              <button className="text-muted-foreground hover:text-foreground p-1" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
            {t.description && <div className="mt-1 text-sm text-muted-foreground leading-relaxed break-words">{t.description}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
