declare module 'socket.io' {
  interface Socket {
    userId?: string;
    organizationId?: string | null;
    role?: string | null;
  }
}

export {};
