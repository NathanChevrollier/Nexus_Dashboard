"use client";

import React, { useEffect, useState } from "react";
import { useSocket } from "@/components/ui/socket-provider";

export default function NotificationBell() {
  const socket = useSocket();
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    if (!socket) return;

    const onCreated = (payload: any) => {
      const msg = `Invitation reçue pour le dashboard ${payload.dashboardId}`;
      setItems((s) => [msg, ...s]);
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Nouvelle invitation', { body: msg });
        }
      } catch (e) {}
    };

    const onAccepted = (payload: any) => {
      const msg = `Votre invitation a été acceptée par ${payload.targetUserId}`;
      setItems((s) => [msg, ...s]);
    };

    const onRejected = (payload: any) => {
      const msg = `Votre invitation a été refusée par ${payload.targetUserId}`;
      setItems((s) => [msg, ...s]);
    };

    socket.on('share:created', onCreated);
    socket.on('share:accepted', onAccepted);
    socket.on('share:rejected', onRejected);

    return () => {
      socket.off('share:created', onCreated);
      socket.off('share:accepted', onAccepted);
      socket.off('share:rejected', onRejected);
    };
  }, [socket]);

  if (!items.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {items.slice(0, 5).map((it, idx) => (
        <div key={idx} className="rounded-md bg-slate-800 text-white px-3 py-2 text-sm shadow">
          {it}
        </div>
      ))}
    </div>
  );
}
