import { io, type Socket } from "socket.io-client";

const SOCKET_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"
).replace(/\/api(?:\/v1)?\/?$/, "");

let socket: Socket | null = null;

export function connectSocket(token?: string): Socket {
  if (
    socket?.connected &&
    (!token ||
      (socket.auth && (socket.auth as { token?: string }).token === token))
  ) {
    return socket;
  }
  if (socket) {
    socket.disconnect();
  }
  socket = io(SOCKET_URL, {
    auth: token ? { token } : undefined,
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
