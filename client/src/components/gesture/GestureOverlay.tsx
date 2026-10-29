// ============================================================================
// GestureOverlay.tsx — Virtual cursor and gesture feedback overlay
//
// Renders a glowing cursor on the canvas that follows the hand,
// with visual feedback for gestures:
//   - Point: Cursor positioning with confirmation radial ring
//   - Pinch/Drag: Green ring with grabbing feedback
//   - Fist: Red delete indicator
//   - Open Palm: Amber canvas panning
//   - Thumbs Up: Purple simulation trigger
//   - Victory: Pink tool switch
// ============================================================================

import React from 'react';
import { useGestureStore } from '../../store/gestureStore';
import GestureDiagnosticsHUD from './GestureDiagnosticsHUD';

const GESTURE_LABELS: Record<string, string> = {
  pinch: '🤏 Grab / Select',
  drag: '🤏 Dragging Component',
  pan: '🖐️ Panning Canvas',
  point: '👆 Pointing / Hover',
  thumbs_up: '👍 Run Simulation',
  fist: '✊ Delete Component',
  victory: '✌️ Switch Component',
  none: '',
};

const GESTURE_COLORS: Record<string, { ring: string; glow: string; bg: string }> = {
  pinch: { ring: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', bg: 'rgba(34, 197, 94, 0.15)' },
  drag: { ring: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', bg: 'rgba(34, 197, 94, 0.15)' },
  pan: { ring: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', bg: 'rgba(245, 158, 11, 0.15)' },
  point: { ring: '#3b82f6', glow: 'rgba(59, 130, 246, 0.45)', bg: 'rgba(59, 130, 246, 0.15)' },
  thumbs_up: { ring: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)', bg: 'rgba(139, 92, 246, 0.15)' },
  fist: { ring: '#ef4444', glow: 'rgba(239, 68, 68, 0.45)', bg: 'rgba(239, 68, 68, 0.15)' },
  victory: { ring: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)', bg: 'rgba(236, 72, 153, 0.15)' },
  none: { ring: '#64748b', glow: 'transparent', bg: 'transparent' },
};

const GestureOverlay: React.FC = () => {
  const gestureEnabled = useGestureStore(s => s.gestureEnabled);
  const isDetecting = useGestureStore(s => s.isDetecting);
  const currentGesture = useGestureStore(s => s.currentGesture);
  const cursorPosition = useGestureStore(s => s.cursorPosition);
  const confidence = useGestureStore(s => s.confidence);
  const grabbedNodeId = useGestureStore(s => s.grabbedNodeId);
  const gestureProgress = useGestureStore(s => s.gestureProgress);

  if (!gestureEnabled || !isDetecting) return null;

  const isGrabbing = Boolean(grabbedNodeId);
  const effectiveGesture = isGrabbing ? 'drag' : currentGesture;
  const colors = GESTURE_COLORS[effectiveGesture] || GESTURE_COLORS.none;
  const label = isGrabbing ? '🤏 Dragging Component' : (GESTURE_LABELS[currentGesture] || '');

  // Progress ring circumference for r=14
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - gestureProgress * circumference;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
    >
      {/* Virtual cursor */}
      <div
        className="absolute transition-transform duration-75"
        style={{
          left: cursorPosition.x,
          top: cursorPosition.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Outer radial glow */}
        <div
          className="absolute -inset-5 rounded-full animate-pulse"
          style={{
            background: `radial-gradient(circle, ${colors.glow}, transparent 70%)`,
          }}
        />

        {/* Hold Confirmation Circular Progress Ring */}
        {gestureProgress > 0 && (
          <svg
            className="absolute -inset-3 w-11 h-11 -rotate-90 pointer-events-none"
            viewBox="0 0 36 36"
          >
            <circle
              cx="18"
              cy="18"
              r={radius}
              fill="none"
              stroke={colors.ring}
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>
        )}

        {/* Main cursor dot */}
        <div
          className="relative w-5 h-5 rounded-full border-2 transition-all duration-150 flex items-center justify-center"
          style={{
            borderColor: colors.ring,
            backgroundColor: colors.bg,
            boxShadow: `0 0 10px ${colors.glow}, 0 0 20px ${colors.glow}`,
          }}
        >
          {/* Inner dot */}
          <div
            className="w-1.5 h-1.5 rounded-full transition-transform"
            style={{
              backgroundColor: colors.ring,
              transform: isGrabbing ? 'scale(1.5)' : 'scale(1)',
            }}
          />
        </div>

        {/* Gesture label tooltip */}
        {label && (
          <div
            className="absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] font-medium backdrop-blur-md animate-fade-in shadow-xl flex items-center gap-1.5"
            style={{
              backgroundColor: 'rgba(10, 14, 26, 0.90)',
              color: colors.ring,
              border: `1px solid ${colors.ring}50`,
            }}
          >
            <span>{label}</span>
            {confidence > 0 && (
              <span className="text-dark-400 text-[9px] font-mono">
                {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Real-time Diagnostics Telemetry HUD */}
      <GestureDiagnosticsHUD />
    </div>
  );
};

export default GestureOverlay;
