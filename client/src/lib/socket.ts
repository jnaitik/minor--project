// ============================================================================
// lib/socket.ts — Socket.io client singleton
//
// Provides a single shared socket connection to the backend server.
// The socket connects lazily when first imported and auto-reconnects.
// ============================================================================

import { io, Socket } from 'socket.io-client';

// In development, Vite proxy handles routing /socket.io to the backend.
// In production, the frontend and backend would be on the same domain.
const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL || '';

/**
 * Singleton Socket.io client instance.
 * Connects to the server with auto-reconnection enabled.
 */
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,       // Don't connect until explicitly called
  reconnection: true,       // Auto-reconnect on disconnect
  reconnectionAttempts: 10, // Try up to 10 times
  reconnectionDelay: 1000,  // Start with 1s delay
  reconnectionDelayMax: 5000, // Max 5s between attempts
  timeout: 10000,           // Connection timeout
});

/**
 * Connect the socket to the server.
 * Safe to call multiple times — will only connect if disconnected.
 */
export function connectSocket(): void {
  if (!socket.connected) {
    socket.connect();
  }
}

/**
 * Disconnect the socket from the server.
 */
export function disconnectSocket(): void {
  if (socket.connected) {
    socket.disconnect();
  }
}

export default socket;
