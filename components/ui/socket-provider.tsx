"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

// Use a generic any type so server bundling won't require socket.io-client at build-time
const SocketContext = createContext<any>(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const socketRef = useRef<any | null>(null);

  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return;

    let mounted = true;
    const url = (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL as string) || "http://localhost:4001";

    // Dynamically import socket.io-client so the server build doesn't try to resolve it
    (async () => {
      try {
        const mod = await import("socket.io-client");
        const io = (mod && (mod.io || mod.default || mod)) as any;
        if (!io) return;

        const socket = io(url, { autoConnect: true });
        socketRef.current = socket;

        socket.on("connect", () => {
          if (session?.user?.id) socket.emit("identify", session.user.id);
        });
      } catch (err) {
        // If socket.io-client is not installed, fail gracefully
        // The dev should run `npm install` to add socket.io-client
        console.warn("socket.io-client not available:", err);
      }
    })();

    return () => {
      mounted = false;
      try {
        socketRef.current?.disconnect?.();
      } catch (e) {}
      socketRef.current = null;
    };
  }, [session?.user?.id]);

  return <SocketContext.Provider value={socketRef.current}>{children}</SocketContext.Provider>;
}
