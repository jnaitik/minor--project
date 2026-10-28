// ============================================================================
// TerminalHandle.tsx — Interactive connection handle with visual feedback
//
// Features:
//   - High-contrast visual terminal with snap highlights
//   - Clear junction indicator dot when a wire is connected
//   - Tooltips identifying terminal polarity / function
//   - Generous target hit area for both mouse and hand gesture wiring
// ============================================================================

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useCircuitStore } from '../../../store/circuitStore';

interface TerminalHandleProps {
  nodeId: string;
  handleId: string;
  type: 'source' | 'target';
  position: Position;
  title?: string;
  colorClass?: string;
}

export const TerminalHandle: React.FC<TerminalHandleProps> = ({
  nodeId,
  handleId,
  type,
  position,
  title,
  colorClass = '!bg-electric-cyan',
}) => {
  const edges = useCircuitStore(s => s.edges);

  // Check if at least one wire connects to this terminal
  const isConnected = edges.some(
    e => (e.source === nodeId && e.sourceHandle === handleId) ||
         (e.target === nodeId && e.targetHandle === handleId)
  );

  return (
    <div className="relative group/handle">
      <Handle
        type={type}
        position={position}
        id={handleId}
        title={title || `Terminal: ${handleId}`}
        className={`!w-4 !h-4 ${colorClass} !border-2 !border-dark-900 transition-all duration-150 hover:!scale-150 hover:!brightness-125 z-20 shadow-sm cursor-crosshair`}
      />

      {/* Junction marker dot when wire is connected */}
      {isConnected && (
        <span
          className="pointer-events-none absolute w-1.5 h-1.5 bg-white rounded-full z-30 shadow"
          style={{
            left: position === Position.Left ? -11 : position === Position.Right ? 11 : 0,
            top: position === Position.Top ? -11 : position === Position.Bottom ? 11 : 0,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
    </div>
  );
};

export default TerminalHandle;
