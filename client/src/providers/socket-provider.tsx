"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";
import { useDispatch } from "react-redux";
import { logout } from "@/features/auth/authSlice";
import { toast } from "sonner";

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { accessToken, isAuthenticated, activeOrgId } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const baseUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "http://localhost:5001";
    const socketUrl = baseUrl.replace(/\/api\/v1\/?$/, "");

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      auth: { token: accessToken },
      query: activeOrgId ? { organizationId: activeOrgId } : undefined,
    });

    socketRef.current = socket;

    socket.on("auth:force-logout", () => {
      toast.error("You have been logged out from all devices.", {
        description: "Your session was invalidated remotely.",
        duration: 5000,
      });
      dispatch(logout());
      window.location.href = "/login";
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, isAuthenticated, activeOrgId, dispatch]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
};
