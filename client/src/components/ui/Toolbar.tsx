// ============================================================================
// Toolbar.tsx — Top toolbar with actions for the circuit editor
//
// Features:
//   - Tool selector: Select (V), Wire (W), Delete (D)
//   - Prominent Simulate button with loading state & MNA execution
//   - Simulation Results panel toggle
//   - Canvas grid snap toggle
//   - Clear circuit button
//   - Room code copy & collaboration presence
// ============================================================================

import React from 'react';
import {
  MousePointer,
  Minus,
  Trash2,
  Play,
  Loader2,
  Activity,
  Grid,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { useCircuitStore } from '../../store/circuitStore';
import { useRoomStore } from '../../store/roomStore';
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
  const isSimulating = useCircuitStore(s => s.isSimulating);
  const setIsSimulating = useCircuitStore(s => s.setIsSimulating);
  const setSimulationResults = useCircuitStore(s => s.setSimulationResults);
  const clearCircuit = useCircuitStore(s => s.clearCircuit);
  const gridSnap = useCircuitStore(s => s.gridSnap);
  const toggleGridSnap = useCircuitStore(s => s.toggleGridSnap);

  const roomId = useRoomStore(s => s.roomId);

  const toggleSimResults = useUIStore(s => s.toggleSimResults);
  const showSimResults = useUIStore(s => s.showSimResults);
  const setShowSimResults = useUIStore(s => s.setShowSimResults);
  const addNotification = useUIStore(s => s.addNotification);

  const [copied, setCopied] = React.useState(false);

  const handleSetTool = (mode: 'select' | 'wire' | 'delete') => {
    setPlacingComponent(null);
    setToolMode(mode);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setShowSimResults(true);

    const isSocketReady = Boolean(roomId && socket && socket.connected);

    if (isSocketReady) {
      // In a room with an active socket connection — send current circuit state & request simulation
      const serverNodes = nodes.map(n => ({
        id: n.id,
        type: n.type as any,
        position: n.position,
        data: n.data as any,
      }));
      const serverEdges = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || '',
        targetHandle: e.targetHandle || '',
      }));

      socket.emit('run-simulation', { roomId, nodes: serverNodes, edges: serverEdges });

      // Fallback timer: if server does not respond within 2.5 seconds, solve locally
      setTimeout(() => {
        if (useCircuitStore.getState().isSimulating) {
          console.warn('[Simulation] Server response timed out; executing local solver fallback.');
          const currentNodes = useCircuitStore.getState().nodes;
          const currentEdges = useCircuitStore.getState().edges;
          const results = solveCircuitLocal(currentNodes, currentEdges);
          setSimulationResults(results);
          setIsSimulating(false);

          if (results.isValid) {
            addNotification('Simulation complete (local fallback)', 'info');
          } else {
            addNotification(`Simulation notice: ${results.errors[0] || 'Check circuit configuration'}`, 'warning');
          }
        }
      }, 2500);
    } else {
      // Solo mode or offline: solve locally
      try {
        const results = solveCircuitLocal(nodes, edges);
        setSimulationResults(results);
        setIsSimulating(false);

        if (results.isValid) {
          addNotification('Simulation complete: Node voltages and currents calculated', 'success');
        } else {
          addNotification(`Simulation notice: ${results.errors[0] || 'Check circuit configuration'}`, 'warning');
        }
      } catch (err: any) {
        console.error('[Simulation] Local solver error:', err);
        setSimulationResults({
          nodeVoltages: {},
          branchCurrents: {},
          componentPower: {},
          ledStates: {},
          isValid: false,
          errors: [`Simulation error: ${err?.message || 'Solver failed'}`],
        });
        setIsSimulating(false);
        addNotification('Simulation failed', 'error');
      }
    }
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
    addNotification('Circuit canvas cleared', 'info');
  };

  return (
    <header className="h-12 bg-dark-800/95 backdrop-blur-md border-b border-dark-600/50 flex items-center px-3 gap-2.5 shrink-0 z-20">
      {/* App Branding */}
      <div className="flex items-center gap-2 mr-2 pr-3 border-r border-dark-600/50 select-none">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-electric-blue via-cyan-500 to-electric-violet flex items-center justify-center shadow-md shadow-electric-blue/20">
          <span className="text-white text-xs font-black tracking-tight">CC</span>
        </div>
        <div className="hidden sm:flex flex-col">
          <span className="text-xs font-bold tracking-tight text-dark-100 leading-tight">CircuitCollab</span>
          <span className="text-[9px] text-dark-400 font-medium leading-none">DC Circuit Simulator</span>
        </div>
      </div>

      {/* Primary Tool Buttons: Select, Wire, Delete */}
      <div className="flex items-center gap-0.5 bg-dark-900/60 rounded-lg p-0.5 border border-dark-700/60 shadow-inner">
        <ToolButton
          icon={<MousePointer size={14} />}
          label="Select"
          active={toolMode === 'select'}
          onClick={() => handleSetTool('select')}
          shortcut="V"
        />
        <ToolButton
          icon={<Minus size={14} />}
          label="Wire"
          active={toolMode === 'wire'}
          onClick={() => handleSetTool('wire')}
          shortcut="W"
        />
        <ToolButton
          icon={<Trash2 size={14} />}
          label="Delete"
          active={toolMode === 'delete'}
          onClick={() => handleSetTool('delete')}
          shortcut="D"
          danger
        />
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-dark-600/50 mx-0.5" />

      {/* Prominent Simulate Button */}
      <button
        onClick={handleRunSimulation}
        disabled={isSimulating}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
          isSimulating
            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 cursor-wait'
            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 hover:shadow-emerald-500/10 active:scale-95'
        }`}
        title="Run Modified Nodal Analysis (MNA) simulation"
      >
        {isSimulating ? (
          <Loader2 size={14} className="animate-spin text-emerald-400" />
        ) : (
          <Play size={13} className="fill-current text-emerald-400" />
        )}
        <span>{isSimulating ? 'Simulating...' : 'Simulate'}</span>
      </button>

      {/* Results Panel Toggle */}
      <button
        onClick={toggleSimResults}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
          showSimResults
            ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
            : 'bg-dark-900/40 text-dark-400 border-dark-700/60 hover:text-dark-200 hover:bg-dark-700/50'
        }`}
        title="Toggle simulation results panel"
      >
        <Activity size={13} />
        <span className="hidden md:inline">Results</span>
      </button>

      {/* Grid Snap Toggle */}
      <button
        onClick={toggleGridSnap}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
          gridSnap
            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
            : 'bg-dark-900/40 text-dark-500 border-dark-700/60 hover:text-dark-300 hover:bg-dark-700/50'
        }`}
        title={`Grid Snap: ${gridSnap ? 'ON (16px)' : 'OFF'}`}
      >
        <Grid size={13} />
        <span className="hidden lg:inline">{gridSnap ? 'Snap ON' : 'Snap OFF'}</span>
      </button>

      {/* Clear Canvas Button */}
      <button
        onClick={handleClearCircuit}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-dark-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
        title="Clear entire circuit canvas"
      >
        <Trash2 size={13} />
        <span className="hidden xl:inline">Clear</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Room code sharing */}
      {roomId && (
        <button
          onClick={handleCopyRoomCode}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-900/60 hover:bg-dark-700/60 rounded-lg border border-dark-700/60 hover:border-dark-600 transition-all group"
          title="Click to copy room code"
        >
          <Share2 size={11} className="text-dark-400 group-hover:text-electric-cyan" />
          <span className="font-mono text-xs text-electric-cyan font-semibold tracking-wider">{roomId}</span>
          {copied ? (
            <Check size={12} className="text-emerald-400" />
          ) : (
            <Copy size={11} className="text-dark-500 group-hover:text-dark-300" />
          )}
        </button>
      )}

      {/* User presence avatars */}
      <UserPresence />
    </header>
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
    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
      active
        ? danger
          ? 'bg-red-500/20 text-red-400 font-semibold'
          : 'bg-electric-blue/20 text-electric-blue font-semibold shadow-sm'
        : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
    }`}
    title={`${label}${shortcut ? ` (Shortcut: ${shortcut})` : ''}`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default Toolbar;
