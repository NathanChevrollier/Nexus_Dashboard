"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";

const SocketContext = createContext<any>(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const socketRef = useRef<any | null>(null);
  const [socket, setSocket] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Récupère l'URL publique définie dans docker-compose ou utilise l'origine actuelle
    // En prod, cela devrait être "https://nexus.chevrolliernathan.fr"
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || window.location.origin;

    // Connexion WebSocket standard
    // Allow fallback transports and keep socket in state so consumers re-render
    const socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      withCredentials: true,
      autoConnect: true,
    });

    socketRef.current = socket;
    setSocket(socket);

    socket.on("connect", () => {
      // console.log("Socket connected via provider");
      if (session?.user?.id) {
        socket.emit("identify", session.user.id);
      }
    });

    socket.on("connect_error", (err: any) => {
      console.warn("Socket connection error:", err);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
      setSocket(null);
    };
  }, [session?.user?.id]);

  // provide the socket instance from state so consumers re-render when socket becomes available
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}