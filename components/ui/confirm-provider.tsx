"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmContextType = {
  confirm: (message: string, title?: string) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = (msg: string, t?: string) => {
    setMessage(msg);
    setTitle(t);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleClose = (result: boolean) => {
    setOpen(false);
    if (resolver) {
      resolver(result);
      setResolver(null);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(false); setOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{title || "Confirmer"}</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => handleClose(false)}>Annuler</Button>
            <Button onClick={() => handleClose(true)}>Confirmer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}
