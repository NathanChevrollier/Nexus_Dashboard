"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const SocketContext = createContext<any>(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const socketRef = useRef<any | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Récupère l'URL publique définie dans docker-compose ou utilise l'origine actuelle
    // En prod, cela devrait être "https://nexus.chevrolliernathan.fr"
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || window.location.origin;

    let socket: any = null;

    (async () => {
      try {
        const mod = await import("socket.io-client");
        const io = (mod && (mod.io || mod.default || mod)) as any;
        
        if (!io) return;

        // Connexion WebSocket standard
        socket = io(socketUrl, {
          path: "/socket.io", // IMPORTANT: doit matcher Nginx et le serveur
          transports: ["websocket"], // Force WebSocket pour éviter le polling long
          reconnectionAttempts: 5,
          withCredentials: true, // Nécessaire si cookies/session partagés
          autoConnect: true
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          // console.log("Socket connected via provider");
          if (session?.user?.id) {
            socket.emit("identify", session.user.id);
          }
        });

        socket.on("connect_error", (err: any) => {
          console.warn("Socket connection error:", err);
        });

      } catch (err) {
        console.error("Socket import failed", err);
      }
    })();

    return () => {
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [session?.user?.id]);

  return <SocketContext.Provider value={socketRef.current}>{children}</SocketContext.Provider>;
}