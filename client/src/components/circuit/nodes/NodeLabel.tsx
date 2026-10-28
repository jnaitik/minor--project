// ============================================================================
// NodeLabel.tsx — Smart, orientation-aware label badge for circuit components
//
// Automatically positions labels to avoid obscuring electrical terminals:
//   - Rotation 0° / 180°: Handles are Left/Right -> Label sits on Top
//   - Rotation 90°: Handles are Top/Bottom -> Label sits on Right
//   - Rotation 270°: Handles are Top/Bottom -> Label sits on Left
// ============================================================================

import React from 'react';

interface NodeLabelProps {
  label: string;
  valueText?: string;
  statusBadge?: string;
  statusColor?: string;
  rotation?: number;
}

export const NodeLabel: React.FC<NodeLabelProps> = ({
  label,
  valueText,
  statusBadge,
  statusColor,
  rotation = 0,
}) => {
  const normRot = ((rotation % 360) + 360) % 360;

  // Compute position based on component orientation to never block terminals
  let placementClass = '-top-6 left-1/2 -translate-x-1/2'; // Default: Above

  if (normRot === 90) {
    placementClass = 'top-1/2 left-full translate-x-3 -translate-y-1/2'; // Right of body
  } else if (normRot === 270) {
    placementClass = 'top-1/2 right-full -translate-x-3 -translate-y-1/2'; // Left of body
  }

  return (
    <div
      className={`absolute pointer-events-none flex items-center gap-1 z-30 transition-all duration-200 whitespace-nowrap ${placementClass}`}
    >
      {/* Reference Designator (e.g., R1, V1, C1) */}
      <span className="text-[10px] font-mono font-bold text-dark-100 bg-dark-950/95 border border-dark-600/70 px-1.5 py-0.5 rounded shadow-md tracking-tight">
        {label}
      </span>

      {/* Component Value (e.g., 1kΩ, 5V, 10µF) */}
      {valueText && (
        <span className="text-[10px] font-mono font-medium text-electric-amber bg-dark-950/95 border border-dark-600/70 px-1.5 py-0.5 rounded shadow-md">
          {valueText}
        </span>
      )}

      {/* Status Badge (e.g. ON / OFF / CLOSED) */}
      {statusBadge && (
        <span
          className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded shadow-md border ${
            statusColor || 'bg-electric-green/20 text-electric-green border-electric-green/40'
          }`}
        >
          {statusBadge}
        </span>
      )}
    </div>
  );
};

export default NodeLabel;
