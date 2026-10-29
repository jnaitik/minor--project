// ============================================================================
// store/gestureStore.ts — Zustand store for hand gesture state
//
// Manages gesture mode on/off, current detected gesture, cursor position,
// webcam PiP position/size, gesture progress, and sensitivity settings.
// ============================================================================

import { create } from 'zustand';
import type { GestureType, Position } from '../types';

export type GestureSensitivity = 'low' | 'medium' | 'high';
export type WebcamSize = 'compact' | 'medium' | 'large';

export type GestureStateMachineState =
  | 'IDLE'
  | 'PINCH_DETECTED'
  | 'COMPONENT_GRABBED'
  | 'DRAGGING'
  | 'RELEASED';

export interface GestureDiagnosticData {
  rawThumbTip: { x: number; y: number; z?: number };
  rawIndexTip: { x: number; y: number; z?: number };
  calculatedPinchPoint: { x: number; y: number }; // normalized 0-1
  webcamPixels: { x: number; y: number; videoWidth: number; videoHeight: number };
  screenCoordinates: { x: number; y: number; innerWidth: number; innerHeight: number };
  canvasCoordinates: { x: number; y: number };
  gestureState: GestureStateMachineState;
  selectedComponentId: string | null;
  selectedComponentType: string | null;
  distanceToHitRegion: number | null;
  grabOffset: { x: number; y: number } | null;
  currentDragTargetPos: { x: number; y: number } | null;
  nearbyComponents: Array<{
    id: string;
    type: string;
    label: string;
    bounds: { x: number; y: number; width: number; height: number };
    distToCenter: number;
    isInsideHitRegion: boolean;
  }>;
  logMessage?: string;
}

interface GestureState {
  // Gesture mode
  gestureEnabled: boolean;
  isInitialized: boolean;
  isDetecting: boolean;

  // State machine state
  stateMachineState: GestureStateMachineState;
  setStateMachineState: (state: GestureStateMachineState) => void;

  // Diagnostics
  showDiagnostics: boolean;
  toggleDiagnostics: () => void;
  diagnostics: GestureDiagnosticData | null;
  setDiagnostics: (d: GestureDiagnosticData) => void;

  // Sensitivity configuration
  sensitivity: GestureSensitivity;
  setSensitivity: (s: GestureSensitivity) => void;

  // Current detection
  currentGesture: GestureType;
  confidence: number;
  cursorPosition: Position;
  palmCenter: Position;
  gestureProgress: number; // 0 to 1 for gesture hold/confirmation feedback

  // Previous state (for drag detection)
  previousCursorPosition: Position;
  isPinching: boolean;
  grabbedNodeId: string | null;

  // Webcam PiP configuration
  showWebcam: boolean;
  webcamPosition: { x: number; y: number } | null;
  webcamSize: WebcamSize;

  // Mouse conflict prevention
  isMouseDragging: boolean;

  // Actions
  toggleGesture: () => void;
  setGestureEnabled: (enabled: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setDetecting: (detecting: boolean) => void;
  setGesture: (gesture: GestureType, confidence: number) => void;
  setCursorPosition: (position: Position) => void;
  setPalmCenter: (position: Position) => void;
  setGestureProgress: (progress: number) => void;
  setIsPinching: (pinching: boolean) => void;
  setGrabbedNodeId: (id: string | null) => void;
  setMouseDragging: (dragging: boolean) => void;
  toggleWebcam: () => void;
  setWebcamPosition: (pos: { x: number; y: number } | null) => void;
  setWebcamSize: (size: WebcamSize) => void;
}

export const useGestureStore = create<GestureState>((set, get) => ({
  gestureEnabled: false,
  isInitialized: false,
  isDetecting: false,
  stateMachineState: 'IDLE',
  setStateMachineState: (stateMachineState) => set({ stateMachineState }),
  showDiagnostics: true, // Show diagnostics overlay for verification
  toggleDiagnostics: () => set({ showDiagnostics: !get().showDiagnostics }),
  diagnostics: null,
  setDiagnostics: (diagnostics) => set({ diagnostics }),
  sensitivity: 'medium',
  currentGesture: 'none',
  confidence: 0,
  cursorPosition: { x: 0, y: 0 },
  palmCenter: { x: 0, y: 0 },
  gestureProgress: 0,
  previousCursorPosition: { x: 0, y: 0 },
  isPinching: false,
  grabbedNodeId: null,
  showWebcam: true,
  webcamPosition: null, // null defaults to bottom-right
  webcamSize: 'medium',
  isMouseDragging: false,

  setSensitivity: (sensitivity) => set({ sensitivity }),

  toggleGesture: () => {
    const current = get().gestureEnabled;
    set({ gestureEnabled: !current });
  },

  setGestureEnabled: (enabled) => set({ gestureEnabled: enabled }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setDetecting: (detecting) => set({ isDetecting: detecting }),

  setGesture: (gesture, confidence) => {
    const prev = get();
    set({
      currentGesture: gesture,
      confidence,
      previousCursorPosition: prev.cursorPosition,
      isPinching: gesture === 'pinch' || gesture === 'drag',
    });
  },

  setCursorPosition: (position) => {
    set({
      previousCursorPosition: get().cursorPosition,
      cursorPosition: position,
    });
  },

  setPalmCenter: (position) => set({ palmCenter: position }),
  setGestureProgress: (gestureProgress) => set({ gestureProgress }),
  setIsPinching: (pinching) => set({ isPinching: pinching }),
  setGrabbedNodeId: (id) => set({ grabbedNodeId: id }),
  setMouseDragging: (dragging) => set({ isMouseDragging: dragging }),
  toggleWebcam: () => set({ showWebcam: !get().showWebcam }),
  setWebcamPosition: (webcamPosition) => set({ webcamPosition }),
  setWebcamSize: (webcamSize) => set({ webcamSize }),
}));
