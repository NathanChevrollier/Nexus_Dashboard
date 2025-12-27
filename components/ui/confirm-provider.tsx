"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DialogMode = "confirm" | "alert" | "prompt";

type ContextType = {
  confirm: (message: string, title?: string) => Promise<boolean>;
  alert: (message: string, title?: string) => Promise<void>;
  prompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
};

const ModalContext = createContext<ContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<DialogMode>("confirm");
  const [promptValue, setPromptValue] = useState("");
  const [resolver, setResolver] = useState<((v: any) => void) | null>(null);

  const confirm = (msg: string, t?: string) => {
    setMessage(msg);
    setTitle(t);
    setMode("confirm");
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  };

  const alert = (msg: string, t?: string) => {
    setMessage(msg);
    setTitle(t);
    setMode("alert");
    setOpen(true);
    return new Promise<void>((resolve) => {
      setResolver(() => {
        resolve();
      });
    });
  };

  const prompt = (msg: string, defaultValue = "", t?: string) => {
    setMessage(msg);
    setTitle(t);
    setMode("prompt");
    setPromptValue(defaultValue);
    setOpen(true);
    return new Promise<string | null>((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleClose = (result: any) => {
    setOpen(false);
    if (resolver) {
      resolver(result);
      setResolver(null);
    }
  };

  return (
    <ModalContext.Provider value={{ confirm, alert, prompt }}>
      {children}
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(mode === "alert" ? undefined : mode === "prompt" ? null : false); setOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{title || (mode === "alert" ? "Information" : mode === "prompt" ? "Entrée requise" : "Confirmer")}</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>

          {mode === "prompt" && (
            <Input
              autoFocus
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleClose(promptValue);
                if (e.key === "Escape") handleClose(null);
              }}
              className="mt-4"
            />
          )}

          <div className={`flex gap-2 mt-4 ${mode === "alert" ? "justify-end" : "justify-end"}`}>
            {mode === "confirm" && (
              <Button variant="outline" onClick={() => handleClose(false)}>Annuler</Button>
            )}
            {mode === "prompt" && (
              <Button variant="outline" onClick={() => handleClose(null)}>Annuler</Button>
            )}
            <Button onClick={() => handleClose(mode === "prompt" ? promptValue : true)}>
              {mode === "alert" ? "OK" : mode === "prompt" ? "Valider" : "Confirmer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ModalContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}

export function useAlert() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useAlert must be used within ConfirmProvider");
  return ctx.alert;
}

export function usePrompt() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("usePrompt must be used within ConfirmProvider");
  return ctx.prompt;
}
