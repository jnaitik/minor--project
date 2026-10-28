// ============================================================================
// store/roomStore.ts — Zustand store for collaboration/room state
//
// Manages room info, connected users, remote cursors, and connection status.
// ============================================================================

import { create } from 'zustand';
import type { User, Position } from '../types';

interface RoomState {
  // Room info
  roomId: string | null;
  userId: string | null;
  username: string;
  userColor: string;
  isConnected: boolean;
  isJoining: boolean;
  error: string | null;
  
  // Other users
  connectedUsers: User[];
  remoteCursors: Record<string, Position>;
  
  // Actions
  setRoom: (roomId: string, userId: string) => void;
  setUsername: (username: string) => void;
  setUserColor: (color: string) => void;
  setConnected: (connected: boolean) => void;
  setJoining: (joining: boolean) => void;
  setError: (error: string | null) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  setUsers: (users: User[]) => void;
  updateCursor: (userId: string, cursor: Position) => void;
  leaveRoom: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  roomId: null,
  userId: null,
  username: '',
  userColor: '#3b82f6',
  isConnected: false,
  isJoining: false,
  error: null,
  connectedUsers: [],
  remoteCursors: {},

  setRoom: (roomId, userId) => set({ roomId, userId, error: null }),
  setUsername: (username) => set({ username }),
  setUserColor: (color) => set({ userColor: color }),
  setConnected: (connected) => set({ isConnected: connected }),
  setJoining: (joining) => set({ isJoining: joining }),
  setError: (error) => set({ error }),

  addUser: (user) => {
    const existing = get().connectedUsers;
    if (!existing.find(u => u.id === user.id)) {
      set({ connectedUsers: [...existing, user] });
    }
  },

  removeUser: (userId) => {
    set({
      connectedUsers: get().connectedUsers.filter(u => u.id !== userId),
      remoteCursors: Object.fromEntries(
        Object.entries(get().remoteCursors).filter(([id]) => id !== userId)
      ),
    });
  },

  setUsers: (users) => set({ connectedUsers: users }),

  updateCursor: (userId, cursor) => {
    set({
      remoteCursors: { ...get().remoteCursors, [userId]: cursor },
    });
  },

  leaveRoom: () => set({
    roomId: null,
    userId: null,
    isConnected: false,
    connectedUsers: [],
    remoteCursors: {},
    error: null,
  }),
}));
