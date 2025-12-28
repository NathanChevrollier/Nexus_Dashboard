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
    const rawEnvUrl = (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL as string) || "";
    const enableSockets = (process.env.NEXT_PUBLIC_ENABLE_SOCKETS || "true").toLowerCase() !== "false";

    if (!enableSockets) return;

    // Determine socket URL:
    // - prefer explicit NEXT_PUBLIC_SOCKET_SERVER_URL when provided
    // - otherwise default to same origin as the page (so we don't ship a hardcoded localhost)
    const url = rawEnvUrl.trim()
      ? rawEnvUrl.trim()
      : (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "");

    // If the url points at localhost/127.0.0.1 in production, avoid aggressive autoConnect
    const isProd = process.env.NODE_ENV === "production";
    const unsafeLocalHost = isProd && (url.includes("localhost") || url.includes("127.0.0.1"));

    // Dynamically import socket.io-client so the server build doesn't try to resolve it
    (async () => {
      try {
        const mod = await import("socket.io-client");
        const io = (mod && (mod.io || mod.default || mod)) as any;
        if (!io) return;
        if (!url) return;
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
