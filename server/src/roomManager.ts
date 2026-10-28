// ============================================================================
// roomManager.ts — In-memory room storage and management
//
// Handles room lifecycle: creation, joining, leaving, and state synchronization.
// Rooms are stored in memory and are lost when the server restarts.
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import type { Room, User, CircuitNode, CircuitEdge, SimulationResults } from './types.js';

/** In-memory store of all active rooms */
const rooms: Map<string, Room> = new Map();

/** Random color palette for user avatars/cursors */
const USER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // purple
];

/**
 * Generate a short, human-readable room code (6 uppercase alphanumeric chars).
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for clarity
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a new collaboration room.
 * @returns The newly created Room object
 */
export function createRoom(): Room {
  let roomId = generateRoomCode();
  // Ensure uniqueness (extremely unlikely collision, but let's be safe)
  while (rooms.has(roomId)) {
    roomId = generateRoomCode();
  }

  const room: Room = {
    id: roomId,
    nodes: [],
    edges: [],
    users: [],
    createdAt: Date.now(),
  };

  rooms.set(roomId, room);
  console.log(`[RoomManager] Created room: ${roomId}`);
  return room;
}

/**
 * Get a room by its ID.
 * @returns The Room or undefined if not found
 */
export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId.toUpperCase());
}

/**
 * Add a user to a room.
 * @returns The created User object, or null if the room doesn't exist
 */
export function joinRoom(
  roomId: string,
  socketId: string,
  username: string
): { room: Room; user: User } | null {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return null;

  // Assign a color from the palette (cycling through)
  const colorIndex = room.users.length % USER_COLORS.length;
  
  const user: User = {
    id: socketId,
    username: username || `User ${room.users.length + 1}`,
    color: USER_COLORS[colorIndex],
  };

  room.users.push(user);
  console.log(`[RoomManager] User "${user.username}" (${socketId}) joined room ${roomId}`);
  return { room, user };
}

/**
 * Remove a user from a room. Deletes the room if empty.
 * @returns The removed User, or null
 */
export function leaveRoom(
  roomId: string,
  socketId: string
): User | null {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return null;

  const userIndex = room.users.findIndex(u => u.id === socketId);
  if (userIndex === -1) return null;

  const [removedUser] = room.users.splice(userIndex, 1);
  console.log(`[RoomManager] User "${removedUser.username}" left room ${roomId}`);

  // Clean up empty rooms after a delay (give time for reconnection)
  if (room.users.length === 0) {
    setTimeout(() => {
      const currentRoom = rooms.get(roomId.toUpperCase());
      if (currentRoom && currentRoom.users.length === 0) {
        rooms.delete(roomId.toUpperCase());
        console.log(`[RoomManager] Deleted empty room: ${roomId}`);
      }
    }, 60000); // 1 minute grace period
  }

  return removedUser;
}

/**
 * Update the circuit state (nodes and edges) for a room.
 */
export function updateCircuit(
  roomId: string,
  nodes: CircuitNode[],
  edges: CircuitEdge[]
): boolean {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return false;

  room.nodes = nodes;
  room.edges = edges;
  return true;
}

/**
 * Store simulation results for a room.
 */
export function setSimulationResults(
  roomId: string,
  results: SimulationResults
): boolean {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return false;

  room.simulationResults = results;
  return true;
}

/**
 * Find which room a user (socket) is currently in.
 * Used during disconnect to clean up.
 */
export function findUserRoom(socketId: string): { roomId: string; user: User } | null {
  for (const [roomId, room] of rooms) {
    const user = room.users.find(u => u.id === socketId);
    if (user) return { roomId, user };
  }
  return null;
}

/**
 * Get all active rooms (for debugging/admin).
 */
export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}
