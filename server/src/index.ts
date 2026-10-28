// ============================================================================
// index.ts — Main server entry point
//
// Sets up Express HTTP server with CORS, REST API endpoints for room management,
// and Socket.io for real-time collaboration (circuit sync, cursors, simulation).
// ============================================================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  updateCircuit,
  setSimulationResults,
  findUserRoom,
} from './roomManager.js';
import { solveCircuit } from './circuitSolver.js';
import type { ClientToServerEvents, ServerToClientEvents } from './types.js';

const PORT = process.env.PORT || 3001;

// ---- Express Setup ----
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

// ---- Socket.io Setup ----
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*', // In production, restrict to your frontend domain
    methods: ['GET', 'POST'],
  },
  // Ping timeout and interval for connection health
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ============================================================================
// REST API Endpoints
// ============================================================================

/** Health check endpoint */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

/** Create a new room */
app.post('/api/rooms', (_req, res) => {
  const room = createRoom();
  res.json({ roomId: room.id });
});

/** Get room info (check if room exists) */
app.get('/api/rooms/:id', (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({
    id: room.id,
    userCount: room.users.length,
    createdAt: room.createdAt,
  });
});

// ============================================================================
// Socket.io Event Handlers
// ============================================================================

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // ---- Join Room ----
  socket.on('join-room', ({ roomId, username }) => {
    const result = joinRoom(roomId, socket.id, username);
    
    if (!result) {
      socket.emit('room-error', { message: `Room "${roomId}" not found` });
      return;
    }

    const { room, user } = result;
    
    // Join the Socket.io room (for broadcasting)
    socket.join(roomId.toUpperCase());
    
    // Send the full room state to the joining user
    socket.emit('room-joined', { room, userId: user.id });
    
    // Notify other users in the room
    socket.to(roomId.toUpperCase()).emit('user-joined', { user });
    
    console.log(`[Socket] ${username} joined room ${roomId}`);
  });

  // ---- Leave Room ----
  socket.on('leave-room', ({ roomId }) => {
    const user = leaveRoom(roomId, socket.id);
    if (user) {
      socket.leave(roomId.toUpperCase());
      socket.to(roomId.toUpperCase()).emit('user-left', { userId: user.id });
    }
  });

  // ---- Circuit Update (node/edge changes) ----
  // This is the core collaboration event — broadcasts circuit changes to all
  // other users in the room. Debouncing is done on the client side.
  socket.on('circuit-update', ({ roomId, nodes, edges }) => {
    const updated = updateCircuit(roomId, nodes, edges);
    if (updated) {
      // Broadcast to all OTHER users in the room (not back to sender)
      socket.to(roomId.toUpperCase()).emit('circuit-updated', {
        nodes,
        edges,
        userId: socket.id,
      });
    }
  });

  // ---- Cursor Movement ----
  // Broadcasts cursor position to other users for presence awareness.
  // High-frequency event — clients should throttle to ~30fps.
  socket.on('cursor-move', ({ roomId, cursor }) => {
    socket.to(roomId.toUpperCase()).emit('cursor-updated', {
      userId: socket.id,
      cursor,
    });
  });

  // ---- Run Simulation ----
  // Runs the MNA circuit solver on the server and broadcasts results to ALL users.
  socket.on('run-simulation', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room) {
      socket.emit('room-error', { message: 'Room not found' });
      return;
    }

    console.log(`[Solver] Running simulation for room ${roomId}...`);
    const results = solveCircuit(room.nodes, room.edges);
    setSimulationResults(roomId, results);
    
    // Send results to ALL users in the room (including the requester)
    io.to(roomId.toUpperCase()).emit('simulation-results', results);
    
    console.log(`[Solver] Simulation complete. Valid: ${results.isValid}, Errors: ${results.errors.length}`);
  });

  // ---- Chat Message ----
  socket.on('chat-message', ({ roomId, message }) => {
    const userInfo = findUserRoom(socket.id);
    if (!userInfo) return;
    
    io.to(roomId.toUpperCase()).emit('chat-message', {
      userId: socket.id,
      username: userInfo.user.username,
      message,
      timestamp: Date.now(),
    });
  });

  // ---- Disconnect ----
  // Clean up when a user disconnects (closes browser, loses connection, etc.)
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
    
    const userInfo = findUserRoom(socket.id);
    if (userInfo) {
      const { roomId, user } = userInfo;
      leaveRoom(roomId, socket.id);
      io.to(roomId.toUpperCase()).emit('user-left', { userId: user.id });
    }
  });
});

// ============================================================================
// Start Server
// ============================================================================

httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║   Circuit Collab Server                                  ║
║   Running on http://localhost:${PORT}                        ║
║   Socket.io ready for connections                        ║
╚══════════════════════════════════════════════════════════╝
  `);
});
