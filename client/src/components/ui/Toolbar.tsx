// ============================================================================
// Toolbar.tsx — Top toolbar with actions for the circuit editor
// ============================================================================

import React from 'react';
import {
  MousePointer,
  Minus,
  Trash2,
  Play,
  Hand,
  Save,
  FolderOpen,
  HelpCircle,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { useCircuitStore } from '../../store/circuitStore';
import { useRoomStore } from '../../store/roomStore';
import { useGestureStore } from '../../store/gestureStore';
import { useUIStore } from '../../store/uiStore';
import UserPresence from '../collaboration/UserPresence';
import { solveCircuitLocal } from '../../lib/circuitSolver';
import socket from '../../lib/socket';

const Toolbar: React.FC = () => {
  const toolMode = useCircuitStore(s => s.toolMode);
  const setToolMode = useCircuitStore(s => s.setToolMode);
  const setPlacingComponent = useCircuitStore(s => s.setPlacingComponent);
  const nodes = useCircuitStore(s => s.nodes);
  const edges = useCircuitStore(s => s.edges);
  const setSimulationResults = useCircuitStore(s => s.setSimulationResults);
  const setIsSimulating = useCircuitStore(s => s.setIsSimulating);
  const clearCircuit = useCircuitStore(s => s.clearCircuit);

  const roomId = useRoomStore(s => s.roomId);
  const gestureEnabled = useGestureStore(s => s.gestureEnabled);
  const toggleGesture = useGestureStore(s => s.toggleGesture);
  
  const toggleSimResults = useUIStore(s => s.toggleSimResults);
  const showSimResults = useUIStore(s => s.showSimResults);
  const addNotification = useUIStore(s => s.addNotification);

  const [copied, setCopied] = React.useState(false);

  const handleSetTool = (mode: 'select' | 'wire' | 'delete') => {
    setToolMode(mode);
    setPlacingComponent(null);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    
    if (roomId) {
      // In a room — use server-side solver and broadcast results
      socket.emit('run-simulation', { roomId });
    } else {
      // Solo — use client-side solver
      const results = solveCircuitLocal(nodes, edges);
      setSimulationResults(results);
      if (results.isValid) {
        addNotification('Simulation complete: Node voltages and currents calculated', 'success');
      } else {
        addNotification(`Simulation error: ${results.errors[0] || 'Invalid circuit configuration'}`, 'error');
      }
    }
    
    setIsSimulating(false);
    if (!showSimResults) toggleSimResults();
  };

  const handleCopyRoomCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      addNotification(`Room code ${roomId} copied!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClearCircuit = () => {
    if (nodes.length > 0 && !confirm('Clear all components? This cannot be undone.')) return;
    clearCircuit();
    addNotification('Circuit cleared', 'info');
  };

  return (
    <div className="h-12 bg-dark-800/90 backdrop-blur-md border-b border-dark-600/50 flex items-center px-3 gap-2 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3 pr-3 border-r border-dark-600/50">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-electric-blue to-electric-violet flex items-center justify-center">
          <span className="text-white text-xs font-bold">CC</span>
        </div>
        <span className="text-sm font-semibold text-dark-200 hidden md:block">CircuitCollab</span>
      </div>

      {/* Tool buttons */}
      <div className="flex items-center gap-0.5 bg-dark-700/50 rounded-lg p-0.5 border border-dark-600/30">
        <ToolButton
          icon={<MousePointer size={15} />}
          label="Select"
          active={toolMode === 'select'}
          onClick={() => handleSetTool('select')}
          shortcut="V"
        />
        <ToolButton
          icon={<Minus size={15} />}
          label="Wire"
          active={toolMode === 'wire'}
          onClick={() => handleSetTool('wire')}
          shortcut="W"
        />
        <ToolButton
          icon={<Trash2 size={15} />}
          label="Delete"
          active={toolMode === 'delete'}
          onClick={() => handleSetTool('delete')}
          shortcut="D"
          danger
        />
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-dark-600/50 mx-1" />

      {/* Run Simulation */}
      <button
        onClick={handleRunSimulation}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-electric-green/15 hover:bg-electric-green/25 text-electric-green rounded-lg text-sm font-medium transition-all border border-electric-green/30 hover:shadow-lg hover:shadow-electric-green/10"
      >
        <Play size={14} />
        <span className="hidden sm:inline">Simulate</span>
      </button>

      {/* Gesture toggle */}
      <button
        onClick={toggleGesture}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
          gestureEnabled
            ? 'bg-electric-violet/15 text-electric-violet border-electric-violet/30 shadow-lg shadow-electric-violet/10'
            : 'bg-dark-700/50 text-dark-400 border-dark-600/30 hover:text-dark-200 hover:bg-dark-600/50'
        }`}
      >
        <Hand size={14} />
        <span className="hidden sm:inline">{gestureEnabled ? 'Gesture ON' : 'Gesture'}</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Room code */}
      {roomId && (
        <button
          onClick={handleCopyRoomCode}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700/50 rounded-lg border border-dark-600/30 hover:bg-dark-600/50 transition-all group"
        >
          <Share2 size={12} className="text-dark-400" />
          <span className="font-mono text-sm text-electric-cyan tracking-wider">{roomId}</span>
          {copied ? (
            <Check size={12} className="text-electric-green" />
          ) : (
            <Copy size={12} className="text-dark-500 group-hover:text-dark-300" />
          )}
        </button>
      )}

      {/* User presence */}
      <UserPresence />

      {/* More actions */}
      <div className="flex items-center gap-0.5 ml-2">
        <button
          onClick={handleClearCircuit}
          className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-600/50 transition-all"
          title="Clear circuit"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
};

/** Individual tool button */
const ToolButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  shortcut?: string;
  danger?: boolean;
}> = ({ icon, label, active, onClick, shortcut, danger }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm transition-all ${
      active
        ? danger
          ? 'bg-red-500/20 text-red-400'
          : 'bg-electric-blue/20 text-electric-blue'
        : 'text-dark-400 hover:text-dark-200 hover:bg-dark-600/50'
    }`}
    title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
  >
    {icon}
    <span className="hidden md:inline text-[12px]">{label}</span>
  </button>
);

export default Toolbar;
