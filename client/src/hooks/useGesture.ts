// ============================================================================
// hooks/useGesture.ts — High-performance decoupled gesture interaction engine
//
// Translates hand tracking frames directly into smooth circuit simulator actions:
//   - Pinch / Pick on Palette: Spawns any component and drags it smoothly
//   - Pinch / Pick on Canvas: Grabs & moves existing components with collision safety
//   - Open Palm: Smooth canvas panning
//   - Point (sustained): Position cursor & place component
//   - Fist (sustained): Delete selected component
//   - Thumbs Up (sustained): Run circuit simulation
//   - Victory (sustained): Cycle component palette
// ============================================================================

import type { GestureType, Position, ComponentType } from '../types';
import { useCircuitStore } from '../store/circuitStore';
import { useGestureStore } from '../store/gestureStore';
import { useRoomStore } from '../store/roomStore';
import { useUIStore } from '../store/uiStore';
import { COMPONENTS } from '../types';
import { solveCircuitLocal } from '../lib/circuitSolver';
import socket from '../lib/socket';

// Internal tracking state (persists across animation frames without re-rendering React)
let grabbedNodeId: string | null = null;
let grabOffset = { x: 0, y: 0 };
let prevPalm: Position | null = null;
let componentCycleIndex = 0;
const lastActionTimes: Record<string, number> = {};

// Sustained gesture confirmation
let activeCandidateGesture: GestureType = 'none';
let gestureFrameCount = 0;
const REQUIRED_CONFIRM_FRAMES = 4; // ~130ms confirmation window to prevent accidental triggers

// Hand loss grace period (prevents dropping components during 1-frame camera flickers)
let handLostTimeout: any = null;

function canAct(action: string, cooldownMs: number = 600): boolean {
  const now = Date.now();
  const last = lastActionTimes[action] || 0;
  if (now - last < cooldownMs) return false;
  lastActionTimes[action] = now;
  return true;
}

/**
 * Finds the nearest node to the cursor in canvas coordinates.
 */
function findNearestFlowComponent(
  nodes: any[],
  flowCursor: { x: number; y: number },
  maxDistance: number = 110
) {
  let nearest: any = null;
  let minDist = maxDistance;

  for (const node of nodes) {
    const left = node.position.x;
    const top = node.position.y;
    const width = 110;
    const height = 60;
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    // 1. Direct hit on component with comfortable padding
    const isDirectHit =
      flowCursor.x >= left - 15 &&
      flowCursor.x <= left + width + 15 &&
      flowCursor.y >= top - 15 &&
      flowCursor.y <= top + height + 15;

    if (isDirectHit) {
      return node;
    }

    // 2. Proximity test to component center
    const dist = Math.hypot(centerX - flowCursor.x, centerY - flowCursor.y);
    if (dist < minDist) {
      minDist = dist;
      nearest = node;
    }
  }

  return nearest;
}

/**
 * High-speed frame processor called on every MediaPipe detection frame.
 * Directly updates canvas components and viewport with zero React re-render overhead.
 */
export function processGestureInteraction(
  gesture: GestureType,
  cursorPosition: Position,
  palmCenter: Position
) {
  const circuitStore = useCircuitStore.getState();
  const gestureStore = useGestureStore.getState();
  const reactFlow = circuitStore.reactFlowInstance;

  // React Flow instance must be mounted
  if (!reactFlow) return;

  // If a hand lost grace timer is active and hand returned, cancel it
  if (gesture !== 'none' && handLostTimeout) {
    clearTimeout(handLostTimeout);
    handLostTimeout = null;
  }

  // Handle hand loss with grace period
  if (gesture === 'none') {
    if (grabbedNodeId && !handLostTimeout) {
      handLostTimeout = setTimeout(() => {
        if (grabbedNodeId) {
          const node = circuitStore.nodes.find(n => n.id === grabbedNodeId);
          if (node) {
            circuitStore.repositionNodeSafely(grabbedNodeId, node.position);
          }
          grabbedNodeId = null;
          gestureStore.setGrabbedNodeId(null);
        }
        handLostTimeout = null;
      }, 350);
    }
    gestureStore.setGestureProgress(0);
    gestureFrameCount = 0;
    activeCandidateGesture = 'none';
    prevPalm = null;
    return;
  }

  // Screen to canvas coordinate conversion
  let flowCursor = { x: cursorPosition.x, y: cursorPosition.y };
  try {
    flowCursor = reactFlow.screenToFlowPosition({
      x: cursorPosition.x,
      y: cursorPosition.y,
    });
  } catch {
    return;
  }

  const isPinching = gesture === 'pinch' || gesture === 'drag';

  // ── 1. PINCH / PICK: Grab & Drag Any Component ──
  if (isPinching) {
    if (!grabbedNodeId) {
      // Check if pinching over the component palette on the sidebar (x < 240)
      let paletteComponentType: ComponentType | null = null;
      if (typeof document !== 'undefined' && cursorPosition.x < 240) {
        const el = document.elementFromPoint(cursorPosition.x, cursorPosition.y);
        const card = el?.closest('[data-component-type]');
        if (card) {
          paletteComponentType = card.getAttribute('data-component-type') as ComponentType;
        }
      }

      if (paletteComponentType) {
        // Spawn component directly from the palette and immediately grab it
        const newNode = circuitStore.addNode(paletteComponentType, flowCursor, false, true);
        if (newNode) {
          grabbedNodeId = newNode.id;
          grabOffset = { x: 0, y: 0 };
          gestureStore.setGrabbedNodeId(newNode.id);
          circuitStore.setSelectedNode(newNode.id);
          useUIStore.getState().addNotification(`🤏 Grabbed ${newNode.data?.label || paletteComponentType}`, 'info');
        }
      } else {
        // Otherwise, grab existing canvas component
        const target = findNearestFlowComponent(circuitStore.nodes, flowCursor);
        if (target) {
          grabbedNodeId = target.id;
          grabOffset = {
            x: target.position.x - flowCursor.x,
            y: target.position.y - flowCursor.y,
          };
          gestureStore.setGrabbedNodeId(target.id);
          circuitStore.setSelectedNode(target.id);
        }
      }
    } else {
      const targetX = flowCursor.x + grabOffset.x;
      const targetY = flowCursor.y + grabOffset.y;

      // Snap smoothly to grid increment during drag
      const gridSize = circuitStore.gridSnap ? circuitStore.gridSize : 4;
      const snappedX = Math.round(targetX / gridSize) * gridSize;
      const snappedY = Math.round(targetY / gridSize) * gridSize;

      circuitStore.updateNodePosition(grabbedNodeId, { x: snappedX, y: snappedY });
    }
  } else {
    // Released pinch: safely place and check collisions
    if (grabbedNodeId) {
      const node = circuitStore.nodes.find(n => n.id === grabbedNodeId);
      if (node) {
        circuitStore.repositionNodeSafely(grabbedNodeId, node.position);
      }
      grabbedNodeId = null;
      gestureStore.setGrabbedNodeId(null);
    }
  }

  // ── 2. OPEN PALM: Smooth Canvas Pan ──
  if (gesture === 'pan' && palmCenter.x !== 0 && palmCenter.y !== 0) {
    if (prevPalm) {
      const dx = palmCenter.x - prevPalm.x;
      const dy = palmCenter.y - prevPalm.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1.2 && dist < 160) {
        try {
          reactFlow.panBy({ x: dx * 1.1, y: dy * 1.1 });
        } catch {
          // ignore mid-frame boundary errors
        }
      }
    }
    prevPalm = { x: palmCenter.x, y: palmCenter.y };
  } else {
    prevPalm = null;
  }

  // ── 3. DISCRETE GESTURE CONFIRMATION (Point, Fist, Thumbs_up, Victory) ──
  const isDiscreteGesture = ['point', 'fist', 'thumbs_up', 'victory'].includes(gesture);

  if (isDiscreteGesture && !grabbedNodeId) {
    if (gesture === activeCandidateGesture) {
      gestureFrameCount++;
    } else {
      activeCandidateGesture = gesture;
      gestureFrameCount = 1;
    }

    const progress = Math.min(1, gestureFrameCount / REQUIRED_CONFIRM_FRAMES);
    gestureStore.setGestureProgress(progress);

    // If gesture held long enough, execute action
    if (gestureFrameCount >= REQUIRED_CONFIRM_FRAMES) {
      gestureFrameCount = 0;
      gestureStore.setGestureProgress(0);

      switch (gesture) {
        case 'point':
          if (canAct('place', 500)) {
            let hoveredPaletteType: ComponentType | null = null;
            if (typeof document !== 'undefined' && cursorPosition.x < 240) {
              const el = document.elementFromPoint(cursorPosition.x, cursorPosition.y);
              const card = el?.closest('[data-component-type]');
              if (card) {
                hoveredPaletteType = card.getAttribute('data-component-type') as ComponentType;
              }
            }

            if (hoveredPaletteType) {
              circuitStore.setPlacingComponent(hoveredPaletteType);
              const comp = COMPONENTS.find(c => c.type === hoveredPaletteType);
              useUIStore.getState().addNotification(`Selected ${comp?.label || hoveredPaletteType}`, 'info');
            } else {
              const activeType = circuitStore.placingComponentType || COMPONENTS[componentCycleIndex].type;
              const comp = COMPONENTS.find(c => c.type === activeType) || COMPONENTS[0];
              circuitStore.addNode(comp.type, flowCursor, false, true);
              useUIStore.getState().addNotification(`👆 Placed ${comp.label}`, 'success');
            }
          }
          break;

        case 'fist':
          if (canAct('delete', 800) && circuitStore.selectedNodeId) {
            circuitStore.removeNode(circuitStore.selectedNodeId);
          }
          break;

        case 'thumbs_up':
          if (canAct('simulate', 1500)) {
            const roomId = useRoomStore.getState().roomId;
            if (roomId) {
              socket.emit('run-simulation', { roomId });
            } else {
              const results = solveCircuitLocal(circuitStore.nodes, circuitStore.edges);
              circuitStore.setSimulationResults(results);
              if (results.isValid) {
                useUIStore.getState().addNotification('Simulation complete: All voltages computed', 'success');
              } else {
                useUIStore.getState().addNotification(`Simulation error: ${results.errors[0] || 'Invalid circuit'}`, 'error');
              }
              if (!useUIStore.getState().showSimResults) {
                useUIStore.getState().toggleSimResults();
              }
            }
          }
          break;

        case 'victory':
          if (canAct('cycle', 600)) {
            componentCycleIndex = (componentCycleIndex + 1) % COMPONENTS.length;
            const comp = COMPONENTS[componentCycleIndex];
            circuitStore.setPlacingComponent(comp.type);
            useUIStore.getState().addNotification(`✌️ Switched to: ${comp.label}`, 'info');
          }
          break;
      }
    }
  } else {
    gestureFrameCount = 0;
    activeCandidateGesture = 'none';
    gestureStore.setGestureProgress(0);
  }
}

/** Legacy hook export */
export function useGestureActions() {}
