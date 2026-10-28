// ============================================================================
// hooks/useSocket.ts — Socket.io connection management hook
//
// Handles connecting/disconnecting, joining/leaving rooms, and listening
// for real-time events from other users.
// ============================================================================

import { useEffect, useCallback, useRef } from 'react';
import socket, { connectSocket, disconnectSocket } from '../lib/socket';
import { useRoomStore } from '../store/roomStore';
import { useCircuitStore } from '../store/circuitStore';
import { useUIStore } from '../store/uiStore';

/**
 * Hook to manage Socket.io connection for a room.
 * Call this in the room editor component.
 */
export function useSocket(roomId: string | undefined) {
  const setRoom = useRoomStore(s => s.setRoom);
  const setConnected = useRoomStore(s => s.setConnected);
  const setJoining = useRoomStore(s => s.setJoining);
  const setError = useRoomStore(s => s.setError);
  const addUser = useRoomStore(s => s.addUser);
  const removeUser = useRoomStore(s => s.removeUser);
  const setUsers = useRoomStore(s => s.setUsers);
  const updateCursor = useRoomStore(s => s.updateCursor);
  const leaveRoom = useRoomStore(s => s.leaveRoom);

  const setCircuit = useCircuitStore(s => s.setCircuit);
  const setSimulationResults = useCircuitStore(s => s.setSimulationResults);

  const addNotification = useUIStore(s => s.addNotification);

  const hasJoined = useRef(false);

  // Join the room on mount
  useEffect(() => {
    if (!roomId || hasJoined.current) return;

    const username = sessionStorage.getItem('cc_username') || `User ${Math.floor(Math.random() * 1000)}`;
    
    setJoining(true);
    connectSocket();

    // ---- Socket event listeners ----

    socket.on('connect', () => {
      setConnected(true);
      // Join room once connected
      socket.emit('join-room', { roomId, username });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('room-joined', ({ room, userId }) => {
      setRoom(room.id, userId);
      setUsers(room.users);
      setJoining(false);
      hasJoined.current = true;

      // Load existing circuit state from the room
      if (room.nodes.length > 0 || room.edges.length > 0) {
        // Convert server CircuitNode/CircuitEdge to React Flow format
        const flowNodes = room.nodes.map((n: any) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        }));
        const flowEdges = room.edges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: 'smoothstep',
          style: { stroke: '#06b6d4', strokeWidth: 2 },
        }));
        setCircuit(flowNodes, flowEdges);
      }

      // Load existing simulation results
      if (room.simulationResults) {
        setSimulationResults(room.simulationResults);
      }

      addNotification(`Joined room ${room.id}`, 'success');
    });

    socket.on('room-error', ({ message }) => {
      setError(message);
      setJoining(false);
      addNotification(message, 'error');
    });

    socket.on('user-joined', ({ user }) => {
      addUser(user);
      addNotification(`${user.username} joined`, 'info');
    });

    socket.on('user-left', ({ userId }) => {
      const users = useRoomStore.getState().connectedUsers;
      const user = users.find(u => u.id === userId);
      removeUser(userId);
      if (user) addNotification(`${user.username} left`, 'info');
    });

    // Circuit sync from other users
    socket.on('circuit-updated', ({ nodes, edges, userId }) => {
      const flowNodes = nodes.map((n: any) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      }));
      const flowEdges = edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: 'smoothstep',
        style: { stroke: '#06b6d4', strokeWidth: 2 },
      }));
      setCircuit(flowNodes, flowEdges);
    });

    // Remote cursor updates
    socket.on('cursor-updated', ({ userId, cursor }) => {
      updateCursor(userId, cursor);
    });

    // Simulation results from server
    socket.on('simulation-results', (results) => {
      setSimulationResults(results);
      addNotification('Simulation updated', 'success');
    });

    // Cleanup on unmount
    return () => {
      if (roomId) {
        socket.emit('leave-room', { roomId });
      }
      socket.removeAllListeners();
      disconnectSocket();
      leaveRoom();
      hasJoined.current = false;
    };
  }, [roomId]);

  // Broadcast circuit changes to the room (debounced)
  const broadcastCircuit = useCallback(
    debounce(() => {
      if (!roomId) return;
      const { nodes, edges } = useCircuitStore.getState();
      
      // Convert React Flow nodes/edges to server format
      const serverNodes = nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      }));
      const serverEdges = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || '',
        targetHandle: e.targetHandle || '',
      }));

      socket.emit('circuit-update', { roomId, nodes: serverNodes, edges: serverEdges });
    }, 100),
    [roomId]
  );

  // Broadcast cursor position (throttled to ~30fps)
  const broadcastCursor = useCallback(
    throttle((x: number, y: number) => {
      if (!roomId) return;
      socket.emit('cursor-move', { roomId, cursor: { x, y } });
    }, 33),
    [roomId]
  );

  return { broadcastCircuit, broadcastCursor };
}

/** Simple debounce utility */
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/** Simple throttle utility */
function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let lastCall = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}
