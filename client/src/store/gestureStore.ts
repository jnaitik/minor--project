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

interface GestureState {
  // Gesture mode
  gestureEnabled: boolean;
  isInitialized: boolean;
  isDetecting: boolean;

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
