// ============================================================================
// PropertiesPanel.tsx — Right sidebar for editing selected component properties
// ============================================================================

import React, { useState } from 'react';
import { X, RotateCw, Trash2, Sliders, AlertCircle } from 'lucide-react';
import { useCircuitStore } from '../../store/circuitStore';

export interface PropertiesPanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ROTATION_OPTIONS = [0, 90, 180, 270];

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  collapsed = false,
  onToggleCollapse,
}) => {
  const nodes = useCircuitStore(s => s.nodes);
  const edges = useCircuitStore(s => s.edges);
  const selectedNodeId = useCircuitStore(s => s.selectedNodeId);
  const updateNodeData = useCircuitStore(s => s.updateNodeData);
  const removeNode = useCircuitStore(s => s.removeNode);
  const setSelectedNode = useCircuitStore(s => s.setSelectedNode);
  const simulationResults = useCircuitStore(s => s.simulationResults);

  const [labelError, setLabelError] = useState<string | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4 px-1 bg-dark-800/80 border-l border-dark-600/50">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-700 transition-colors"
          title="Expand Properties"
        >
          <Sliders size={18} />
        </button>
        <div className="mt-8 [writing-mode:vertical-rl] text-[10px] font-bold text-dark-400 tracking-wider uppercase">
          {selectedNode ? selectedNode.type : 'Properties'}
        </div>
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-dark-500 text-center">
          <div className="text-3xl mb-2">🔧</div>
          <p className="text-sm">Select a component to view properties</p>
          <p className="text-xs text-dark-500 mt-1">Click any circuit element or grab with pinch gesture</p>
        </div>
      </div>
    );
  }

  const data = selectedNode.data as Record<string, unknown>;
  const currentRotation = ((data.rotation as number) || 0) % 360;

  // Connected wires for this component
  const connectedEdges = edges.filter(
    e => e.source === selectedNode.id || e.target === selectedNode.id
  );

  // Live simulation data for this component
  const nodeCurrent = simulationResults?.branchCurrents[selectedNode.id];
  const nodePower = simulationResults?.componentPower[selectedNode.id];

  const handleValueChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      updateNodeData(selectedNode.id, { value: numValue });
    }
  };

  const handleLabelChange = (newLabel: string) => {
    const trimmed = newLabel.trim();
    // Check if another component already has this label
    const isDuplicate = nodes.some(
      n => n.id !== selectedNode.id && (n.data?.label as string)?.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setLabelError('Name already used');
    } else {
      setLabelError(null);
    }
    updateNodeData(selectedNode.id, { label: newLabel });
  };

  const handleRotate = (newRotation: number) => {
    updateNodeData(selectedNode.id, { rotation: newRotation });
  };

  const handleCycleRotate = () => {
    updateNodeData(selectedNode.id, { rotation: (currentRotation + 90) % 360 });
  };

  const handleToggle = () => {
    updateNodeData(selectedNode.id, { isOn: !(data.isOn as boolean) });
  };

  const handleDelete = () => {
    removeNode(selectedNode.id);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-600/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-dark-100 tracking-wide uppercase">
            Properties
          </h2>
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-electric-blue/15 text-electric-blue border border-electric-blue/30">
            Selected
          </span>
        </div>
        <button
          onClick={() => setSelectedNode(null)}
          className="p-1 rounded hover:bg-dark-600 text-dark-400 hover:text-dark-200 transition-colors"
          title="Close Properties"
        >
          <X size={14} />
        </button>
      </div>

      {/* Properties Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Component type */}
        <div>
          <label className="text-[11px] font-medium text-dark-400 uppercase tracking-wider">
            Type
          </label>
          <div className="mt-1 px-3 py-2 bg-dark-700/50 rounded-lg text-sm text-dark-200 border border-dark-600/30 capitalize flex items-center justify-between">
            <span>{(selectedNode.type || '').replace('_', ' ')}</span>
            <span className="text-[10px] font-mono text-dark-400">
              {connectedEdges.length} {connectedEdges.length === 1 ? 'wire' : 'wires'} connected
            </span>
          </div>
        </div>

        {/* Label */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-dark-400 uppercase tracking-wider">
              Reference Name
            </label>
            {labelError && (
              <span className="text-[10px] text-amber-400 flex items-center gap-1">
                <AlertCircle size={10} /> {labelError}
              </span>
            )}
          </div>
          <input
            type="text"
            value={(data.label as string) || ''}
            onChange={(e) => handleLabelChange(e.target.value)}
            className={`mt-1 w-full px-3 py-2 bg-dark-700/50 rounded-lg text-sm text-dark-100 border outline-none transition-all font-mono ${
              labelError
                ? 'border-amber-500/60 focus:border-amber-400'
                : 'border-dark-600/30 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue/30'
            }`}
          />
        </div>

        {/* Orientation / Rotation */}
        <div>
          <label className="text-[11px] font-medium text-dark-400 uppercase tracking-wider">
            Orientation
          </label>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {ROTATION_OPTIONS.map((deg) => (
              <button
                key={deg}
                onClick={() => handleRotate(deg)}
                className={`py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                  currentRotation === deg
                    ? 'bg-electric-blue/20 border-electric-blue text-electric-blue shadow-sm'
                    : 'bg-dark-700/40 border-dark-600/30 text-dark-300 hover:bg-dark-600/50 hover:text-dark-100'
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>

        {/* Value (for resistor, cap, inductor, voltage source, led) */}
        {selectedNode.type !== 'ground' && selectedNode.type !== 'switch' && (
          <div>
            <label className="text-[11px] font-medium text-dark-400 uppercase tracking-wider">
              Value ({data.unit as string})
            </label>
            <input
              type="number"
              value={data.value as number}
              onChange={(e) => handleValueChange(e.target.value)}
              min={0}
              step={
                selectedNode.type === 'capacitor'
                  ? 0.000001
                  : selectedNode.type === 'inductor'
                  ? 0.001
                  : 1
              }
              className="mt-1 w-full px-3 py-2 bg-dark-700/50 rounded-lg text-sm text-dark-100 border border-dark-600/30 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue/30 outline-none transition-all font-mono"
            />

            {/* Quick multiplier shortcuts for Resistor */}
            {selectedNode.type === 'resistor' && (
              <div className="mt-2 flex gap-1">
                {[100, 330, 1000, 4700, 10000, 100000].map((r) => (
                  <button
                    key={r}
                    onClick={() => updateNodeData(selectedNode.id, { value: r })}
                    className="flex-1 py-1 text-[10px] font-mono bg-dark-700/40 hover:bg-dark-600/60 text-dark-300 hover:text-electric-cyan rounded border border-dark-600/30 transition-colors"
                  >
                    {r >= 1000 ? `${r / 1000}k` : `${r}`}
                  </button>
                ))}
              </div>
            )}

            {/* Quick voltage shortcuts for DC Source */}
            {selectedNode.type === 'voltage_source' && (
              <div className="mt-2 flex gap-1">
                {[1.5, 3.3, 5, 9, 12, 24].map((v) => (
                  <button
                    key={v}
                    onClick={() => updateNodeData(selectedNode.id, { value: v })}
                    className="flex-1 py-1 text-[10px] font-mono bg-dark-700/40 hover:bg-dark-600/60 text-dark-300 hover:text-electric-cyan rounded border border-dark-600/30 transition-colors"
                  >
                    {v}V
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Switch toggle */}
        {selectedNode.type === 'switch' && (
          <div>
            <label className="text-[11px] font-medium text-dark-400 uppercase tracking-wider">
              State
            </label>
            <button
              onClick={handleToggle}
              className={`mt-1 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                (data.isOn as boolean) !== false
                  ? 'bg-electric-green/15 border-electric-green/40 text-electric-green'
                  : 'bg-red-500/15 border-red-500/40 text-red-400'
              }`}
            >
              {(data.isOn as boolean) !== false ? '✓ Closed (ON)' : '✗ Open (OFF)'}
            </button>
          </div>
        )}

        {/* Live Simulation Info (if available) */}
        {(nodeCurrent !== undefined || nodePower !== undefined) && (
          <div className="p-3 bg-dark-900/60 border border-electric-green/30 rounded-lg space-y-1.5">
            <div className="text-[11px] font-semibold text-electric-green uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-electric-green animate-pulse" />
              Live Simulation
            </div>
            {nodeCurrent !== undefined && (
              <div className="flex justify-between text-xs font-mono text-dark-200">
                <span className="text-dark-400">Current:</span>
                <span className="text-electric-cyan font-medium">
                  {Math.abs(nodeCurrent) < 0.001
                    ? `${(nodeCurrent * 1e6).toFixed(1)} µA`
                    : `${(nodeCurrent * 1e3).toFixed(2)} mA`}
                </span>
              </div>
            )}
            {nodePower !== undefined && (
              <div className="flex justify-between text-xs font-mono text-dark-200">
                <span className="text-dark-400">Power:</span>
                <span className="text-electric-amber font-medium">
                  {Math.abs(nodePower) < 0.001
                    ? `${(nodePower * 1e6).toFixed(1)} µW`
                    : `${(nodePower * 1e3).toFixed(2)} mW`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Node ID */}
        <div>
          <label className="text-[11px] font-medium text-dark-400 uppercase tracking-wider">
            Identifier
          </label>
          <div className="mt-1 px-3 py-2 bg-dark-700/30 rounded-lg text-[11px] text-dark-500 border border-dark-600/20 font-mono truncate">
            {selectedNode.id}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="p-3 border-t border-dark-600/50 flex gap-2">
        <button
          onClick={handleCycleRotate}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-dark-700/50 hover:bg-dark-600 rounded-lg text-sm text-dark-300 hover:text-dark-100 transition-all border border-dark-600/30"
          title="Rotate by +90°"
        >
          <RotateCw size={14} />
          Rotate
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-sm text-red-400 hover:text-red-300 transition-all border border-red-500/20"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
