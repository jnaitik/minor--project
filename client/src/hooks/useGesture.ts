// ============================================================================
// hooks/useGesture.ts — High-performance decoupled gesture interaction engine
//
// Implements an explicit, rock-solid gesture state machine:
//   IDLE → PINCH_DETECTED → COMPONENT_GRABBED → DRAGGING → RELEASED
//
// Features:
//   - Precise hit-testing: Selects components genuinely under the pinch point
//   - Zero downward drift: Index-anchored contact point + locked grab offset
//   - Hysteresis & grace periods: Eliminates drops from 1-frame landmark flicker
//   - Full diagnostic telemetry: Records coordinates at every pipeline stage
// ============================================================================

import type { GestureType, Position, ComponentType } from '../types';
import { useCircuitStore } from '../store/circuitStore';
import {
  useGestureStore,
  type GestureStateMachineState,
  type GestureDiagnosticData,
} from '../store/gestureStore';
import { useUIStore } from '../store/uiStore';
import { useRoomStore } from '../store/roomStore';
import { solveCircuitLocal } from '../lib/circuitSolver';
import socket from '../lib/socket';
import { findComponentUnderCursor, getComponentBounds } from '../lib/collision';
import type { GestureResult } from '../lib/gestureRecognizer';

// Authoritative State Machine State (persists across animation frames)
let stateMachineState: GestureStateMachineState = 'IDLE';
let grabbedNodeId: string | null = null;
let grabOffset = { x: 0, y: 0 };
let grabInitialPos = { x: 0, y: 0 };
let prevPalm: Position | null = null;
const lastActionTimes: Record<string, number> = {};

// Sustained discrete gesture confirmation (Point, Fist, Thumbs Up, Victory)
let activeCandidateGesture: GestureType = 'none';
let gestureFrameCount = 0;
const REQUIRED_CONFIRM_FRAMES = 4; // ~130ms confirmation window to prevent accidental triggers

// Hand loss grace period (prevents dropping components during camera flickers)
let handLostTimeout: any = null;

// Release cooldown (prevents accidental immediate re-grab while opening fingers)
let releaseCooldownUntil = 0;

// Consecutive release frames required before confirming drop
let consecutiveReleaseFrames = 0;

function canAct(action: string, cooldownMs: number = 600): boolean {
  const now = Date.now();
  const last = lastActionTimes[action] || 0;
  if (now - last < cooldownMs) return false;
  lastActionTimes[action] = now;
  return true;
}

/**
 * High-speed frame processor called on every MediaPipe detection frame.
 * Directly updates canvas components and viewport with zero React re-render overhead.
 */
export function processGestureInteraction(
  gesture: GestureType,
  cursorPosition: Position,
  palmCenter: Position,
  gestureResult?: GestureResult,
  videoDimensions?: { videoWidth: number; videoHeight: number }
) {
  const circuitStore = useCircuitStore.getState();
  const gestureStore = useGestureStore.getState();
  const reactFlow = circuitStore.reactFlowInstance;
  const now = Date.now();

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
          console.log(`[GESTURE DIAGNOSTIC] Hand lost grace expired -> Released ${grabbedNodeId}`);
          grabbedNodeId = null;
          stateMachineState = 'IDLE';
          gestureStore.setGrabbedNodeId(null);
          gestureStore.setStateMachineState('IDLE');
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

  // Perform hit testing against canvas components with a precise, tight touch buffer
  const hitTestResult = findComponentUnderCursor(circuitStore.nodes, flowCursor, 10);
  const targetUnderCursor = hitTestResult.targetNode;

  let currentDragTargetPos: { x: number; y: number } | null = null;
  let logMessage: string | undefined;

  // ══════════════════════════════════════════════════════════════════════════
  // EXPLICIT GESTURE STATE MACHINE:
  // IDLE → PINCH_DETECTED → COMPONENT_GRABBED → DRAGGING → RELEASED
  // ══════════════════════════════════════════════════════════════════════════

  if (isPinching) {
    consecutiveReleaseFrames = 0;

    // ── STATE 1: IDLE / PINCH_DETECTED -> Try Grab ──
    if (!grabbedNodeId) {
      if (now > releaseCooldownUntil) {
        stateMachineState = 'PINCH_DETECTED';

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
          // Spawn component directly from the palette and immediately lock grab
          const newNode = circuitStore.addNode(paletteComponentType, flowCursor, false, true);
          if (newNode) {
            grabbedNodeId = newNode.id;
            grabOffset = { x: 0, y: 0 };
            grabInitialPos = { ...newNode.position };
            stateMachineState = 'COMPONENT_GRABBED';

            gestureStore.setGrabbedNodeId(newNode.id);
            circuitStore.setSelectedNode(newNode.id);
            useUIStore.getState().addNotification(`🤏 Grabbed ${newNode.data?.label || paletteComponentType}`, 'info');

            logMessage = `SPAWNED & GRABBED ${paletteComponentType} (${newNode.id})`;
            console.log(`[GESTURE DIAGNOSTIC] ${logMessage}`);
          }
        } else if (targetUnderCursor) {
          // Genuinely under a canvas component -> GRAB & LOCK IT
          grabbedNodeId = targetUnderCursor.id;
          grabOffset = {
            x: targetUnderCursor.position.x - flowCursor.x,
            y: targetUnderCursor.position.y - flowCursor.y,
          };
          grabInitialPos = { ...targetUnderCursor.position };
          stateMachineState = 'COMPONENT_GRABBED';

          gestureStore.setGrabbedNodeId(targetUnderCursor.id);
          circuitStore.setSelectedNode(targetUnderCursor.id);

          logMessage = `GRABBED ${targetUnderCursor.data?.label || targetUnderCursor.type} (${targetUnderCursor.id}) | dist: ${hitTestResult.minDistance?.toFixed(1)}px | offset: (${Math.round(grabOffset.x)}, ${Math.round(grabOffset.y)})`;
          console.log(`[GESTURE DIAGNOSTIC] ${logMessage}`);
        } else {
          // Pinch occurred in empty canvas space -> Do NOT grab random or distant components!
          stateMachineState = 'PINCH_DETECTED';
        }
      }
    } else {
      // ── STATE 2: DRAGGING ──
      stateMachineState = 'DRAGGING';

      // Use LOCKED grabOffset established at pinch start.
      // NEVER recalculate grabOffset mid-drag to prevent artificial downward drift!
      const targetX = flowCursor.x + grabOffset.x;
      const targetY = flowCursor.y + grabOffset.y;

      // Snap smoothly to grid
      const gridSize = circuitStore.gridSnap ? circuitStore.gridSize : 4;
      const snappedX = Math.round(targetX / gridSize) * gridSize;
      const snappedY = Math.round(targetY / gridSize) * gridSize;

      currentDragTargetPos = { x: snappedX, y: snappedY };
      circuitStore.updateNodePosition(grabbedNodeId, { x: snappedX, y: snappedY });
    }
  } else {
    // ── STATE 3: RELEASE DETECTION & HYSTERESIS ──
    if (grabbedNodeId) {
      consecutiveReleaseFrames++;

      // Require 2 consecutive frames of release to drop, preventing accidental release on 1-frame glitches
      if (consecutiveReleaseFrames >= 2) {
        stateMachineState = 'RELEASED';
        const node = circuitStore.nodes.find(n => n.id === grabbedNodeId);
        if (node) {
          circuitStore.repositionNodeSafely(grabbedNodeId, node.position);
        }

        logMessage = `RELEASED ${grabbedNodeId} at (${Math.round(node?.position.x || 0)}, ${Math.round(node?.position.y || 0)})`;
        console.log(`[GESTURE DIAGNOSTIC] ${logMessage}`);

        grabbedNodeId = null;
        gestureStore.setGrabbedNodeId(null);
        releaseCooldownUntil = now + 180; // 180ms cooldown to avoid re-grabbing while fingers open
        stateMachineState = 'IDLE';
      }
    } else {
      stateMachineState = 'IDLE';
    }
  }

  gestureStore.setStateMachineState(stateMachineState);

  // ══════════════════════════════════════════════════════════════════════════
  // TELEMETRY HUD & DIAGNOSTIC RECORDING
  // ══════════════════════════════════════════════════════════════════════════
  if (gestureResult) {
    const videoW = videoDimensions?.videoWidth || 640;
    const videoH = videoDimensions?.videoHeight || 480;

    const nearbyComponents = hitTestResult.candidates.map(c => ({
      id: c.node.id,
      type: c.node.type || 'resistor',
      label: (c.node.data?.label as string) || c.node.id,
      bounds: {
        x: c.bounds.left,
        y: c.bounds.top,
        width: c.bounds.width,
        height: c.bounds.height,
      },
      distToCenter: c.distanceToCenter,
      isInsideHitRegion: c.isInside,
    }));

    const diagnosticData: GestureDiagnosticData = {
      rawThumbTip: gestureResult.rawThumbTip,
      rawIndexTip: gestureResult.rawIndexTip,
      calculatedPinchPoint: gestureResult.pinchPointNorm,
      webcamPixels: {
        x: gestureResult.pinchPointNorm.x * videoW,
        y: gestureResult.pinchPointNorm.y * videoH,
        videoWidth: videoW,
        videoHeight: videoH,
      },
      screenCoordinates: {
        x: cursorPosition.x,
        y: cursorPosition.y,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      },
      canvasCoordinates: flowCursor,
      gestureState: stateMachineState,
      selectedComponentId: grabbedNodeId,
      selectedComponentType: (circuitStore.nodes.find(n => n.id === grabbedNodeId)?.type as string) || null,
      distanceToHitRegion: hitTestResult.minDistance,
      grabOffset: grabbedNodeId ? grabOffset : null,
      currentDragTargetPos,
      nearbyComponents,
      logMessage,
    };

    gestureStore.setDiagnostics(diagnosticData);
  }

  // ── 2. OPEN PALM: Smooth Canvas Pan ──
  if (gesture === 'pan' && palmCenter.x !== 0 && palmCenter.y !== 0 && !grabbedNodeId) {
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

      if (gesture === 'point' && canAct('point', 500)) {
        if (circuitStore.toolMode === 'place' && circuitStore.placingComponentType) {
          circuitStore.addNode(circuitStore.placingComponentType, flowCursor, false, true);
          useUIStore.getState().addNotification(`👆 Placed ${circuitStore.placingComponentType}`, 'success');
        }
      } else if (gesture === 'fist' && canAct('fist', 800)) {
        const selectedId = circuitStore.selectedNodeId;
        if (selectedId) {
          circuitStore.removeNode(selectedId);
          useUIStore.getState().addNotification('✊ Deleted selected component', 'info');
        }
      } else if (gesture === 'thumbs_up' && canAct('thumbs_up', 1200)) {
        circuitStore.setIsSimulating(true);
        const roomId = useRoomStore.getState().roomId;
        if (roomId) {
          socket.emit('run-simulation', { roomId });
        } else {
          const results = solveCircuitLocal(circuitStore.nodes, circuitStore.edges);
          circuitStore.setSimulationResults(results);
          if (results.isValid) {
            useUIStore.getState().addNotification('👍 Simulation complete', 'success');
          } else {
            useUIStore.getState().addNotification(`Simulation error: ${results.errors[0] || 'Invalid'}`, 'error');
          }
        }
        circuitStore.setIsSimulating(false);
      } else if (gesture === 'victory' && canAct('victory', 600)) {
        const types: ComponentType[] = ['resistor', 'capacitor', 'inductor', 'voltage_source', 'ground', 'led', 'switch'];
        const currentType = circuitStore.placingComponentType || 'resistor';
        const nextIdx = (types.indexOf(currentType) + 1) % types.length;
        const nextType = types[nextIdx];
        circuitStore.setPlacingComponent(nextType);
        useUIStore.getState().addNotification(`✌️ Selected ${nextType.replace('_', ' ')}`, 'info');
      }
    }
  } else if (!isDiscreteGesture) {
    gestureFrameCount = 0;
    activeCandidateGesture = 'none';
    gestureStore.setGestureProgress(0);
  }
}
