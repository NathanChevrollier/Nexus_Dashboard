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

    // Simple guard: if the socket host is localhost and we're in production-like env
    // don't aggressively auto-connect; wait for a manual connect or until a later retry.
    const unsafeLocalHost = url.includes("localhost") || url.includes("127.0.0.1");

    // Dynamically import socket.io-client so the server build doesn't try to resolve it
    (async () => {
      try {
        const mod = await import("socket.io-client");
        const io = (mod && (mod.io || mod.default || mod)) as any;
        if (!io) return;
        // If socket is local and server likely unavailable in production, disable autoConnect
        const socket = io(url, { autoConnect: !unsafeLocalHost });
        socketRef.current = socket;

        socket.on("connect", () => {
          if (session?.user?.id) socket.emit("identify", session.user.id);
        });

        // If we disabled autoConnect for local host, attempt a single connect pass after short delay
        if (unsafeLocalHost) {
          setTimeout(() => {
            try {
              socket.connect?.();
            } catch (e) {
              // ignore connect errors; avoids repeated failed polling attempts
              console.debug("Socket connect attempt skipped/failed for localhost", e);
            }
          }, 2000);
        }
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
