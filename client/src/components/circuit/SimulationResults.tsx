// ============================================================================
// SimulationResults.tsx — Panel displaying DC simulation results
//
// Implements robust simulation states:
//   1. Idle: Simulation has not started yet
//   2. Running: Active MNA solver loading indicator
//   3. Success: Valid simulation results table with voltages, currents, & power
//   4. Error: Useful error message and actionable circuit diagnostics
//
// Guaranteed crash-proof rendering:
//   - Safe handle indexing (handles components with 1, 2, or more terminals)
//   - Safe number checks with unit scaling (V, mV, mA, µA, nA, mW, µW)
//   - Does not crash or unmount the application
// ============================================================================

import React from 'react';
import { X, Zap, Activity, AlertCircle, AlertTriangle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { useCircuitStore } from '../../store/circuitStore';
import { useUIStore } from '../../store/uiStore';

/** Safely format terminal voltage */
function formatVoltage(value: unknown): string {
  if (typeof value === 'number' && !isNaN(value)) {
    return `${value.toFixed(2)}V`;
  }
  return '—';
}

/** Safely format branch current with SI unit scaling */
function formatCurrent(value: unknown): string {
  if (typeof value !== 'number' || isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs === 0) return '0.00 mA';
  if (abs < 1e-6) return `${(value * 1e9).toFixed(1)} nA`;
  if (abs < 1e-3) return `${(value * 1e6).toFixed(1)} µA`;
  if (abs < 1) return `${(value * 1e3).toFixed(2)} mA`;
  return `${value.toFixed(3)} A`;
}

/** Safely format power dissipation with SI unit scaling */
function formatPower(value: unknown): string {
  if (typeof value !== 'number' || isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs === 0) return '0.00 mW';
  if (abs < 1e-6) return `${(abs * 1e9).toFixed(1)} nW`;
  if (abs < 1e-3) return `${(abs * 1e6).toFixed(1)} µW`;
  if (abs < 1) return `${(abs * 1e3).toFixed(2)} mW`;
  return `${abs.toFixed(3)} W`;
}

const SimulationResults: React.FC = () => {
  const simulationResults = useCircuitStore(s => s.simulationResults);
  const nodes = useCircuitStore(s => s.nodes);
  const isSimulating = useCircuitStore(s => s.isSimulating);
  const toggleSimResults = useUIStore(s => s.toggleSimResults);

  // ---- State 1 & 2: Running state ----
  if (isSimulating) {
    return (
      <div className="bg-dark-800/95 backdrop-blur-md border-t border-dark-600/50 p-4 animate-fadeIn">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
            <Activity size={15} className="text-electric-cyan animate-pulse" />
            Simulation Analysis
          </h3>
          <button
            onClick={toggleSimResults}
            className="p-1 rounded hover:bg-dark-600 text-dark-400 hover:text-dark-200 transition-colors"
            title="Close Panel"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex items-center justify-center gap-3 py-6 bg-dark-900/60 rounded-lg border border-dark-700/50">
          <Loader2 size={18} className="animate-spin text-electric-cyan" />
          <span className="text-sm text-dark-200 font-medium">
            Running Modified Nodal Analysis (MNA) solver...
          </span>
        </div>
      </div>
    );
  }

  // ---- State 1: Idle state (Simulation not started) ----
  if (!simulationResults) {
    return (
      <div className="bg-dark-800/95 backdrop-blur-md border-t border-dark-600/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
            <Activity size={15} className="text-electric-cyan" />
            Simulation Results
          </h3>
          <button
            onClick={toggleSimResults}
            className="p-1 rounded hover:bg-dark-600 text-dark-400 hover:text-dark-200 transition-colors"
            title="Close Panel"
          >
            <X size={14} />
          </button>
        </div>
        <div className="text-center py-6 px-4 bg-dark-900/40 rounded-lg border border-dark-700/30">
          <p className="text-sm text-dark-300 font-medium">
            Simulation is idle
          </p>
          <p className="text-xs text-dark-500 mt-1">
            Click the <span className="text-electric-green font-semibold">"Simulate"</span> button in the top toolbar to calculate node voltages, branch currents, and component power dissipation.
          </p>
        </div>
      </div>
    );
  }

  // Safe extract results maps
  const nodeVoltages = simulationResults.nodeVoltages || {};
  const branchCurrents = simulationResults.branchCurrents || {};
  const componentPower = simulationResults.componentPower || {};
  const ledStates = simulationResults.ledStates || {};
  const rawErrors = Array.isArray(simulationResults.errors) ? simulationResults.errors : [];

  const fatalErrors = rawErrors.filter(e => !e.startsWith('Warning:') && !e.startsWith('Notice:'));
  const warningMessages = rawErrors.filter(e => e.startsWith('Warning:'));
  const noticeMessages = rawErrors.filter(e => e.startsWith('Notice:'));

  const isSuccess = simulationResults.isValid && fatalErrors.length === 0;

  // Group results safely by component
  const componentResults = nodes.map(node => {
    const data = (node.data || {}) as Record<string, unknown>;
    const label = (data.label as string) || node.id;
    const type = node.type || '';

    const handles =
      type === 'voltage_source' ? ['positive', 'negative'] :
      type === 'ground' ? ['top'] :
      ['left', 'right'];

    const voltages = handles.map(h => ({
      handle: h,
      voltage: nodeVoltages[`${node.id}:${h}`],
    }));

    const current = branchCurrents[node.id];
    const power = componentPower[node.id];
    const ledState = ledStates[node.id];

    return { id: node.id, label, type, handles, voltages, current, power, ledState };
  });

  // Calculate total power consumed by components
  const totalPower = Object.values(componentPower)
    .filter((p): p is number => typeof p === 'number' && !isNaN(p) && p > 0)
    .reduce((sum, p) => sum + p, 0);

  return (
    <div className="bg-dark-800/95 backdrop-blur-md border-t border-dark-600/50 max-h-72 overflow-y-auto">
      {/* Header bar */}
      <div className="px-4 py-2 border-b border-dark-600/50 flex items-center justify-between sticky top-0 bg-dark-800/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <Activity size={15} className={isSuccess ? 'text-electric-green' : 'text-red-400'} />
          <h3 className="text-sm font-semibold text-dark-100">
            Simulation Results
          </h3>

          {/* State Badges */}
          {isSuccess ? (
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
              <CheckCircle2 size={10} /> Converged (DC)
            </span>
          ) : (
            <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
              <AlertCircle size={10} /> Validation Error
            </span>
          )}

          {nodes.length > 0 && isSuccess && (
            <span className="text-[10px] text-dark-400 font-mono hidden sm:inline">
              · {nodes.length} components · Total Dissipation: {formatPower(totalPower)}
            </span>
          )}
        </div>

        <button
          onClick={toggleSimResults}
          className="p-1 rounded hover:bg-dark-600 text-dark-400 hover:text-dark-200 transition-colors"
          title="Close Panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* ---- State 4: Error State Messages ---- */}
      {fatalErrors.length > 0 && (
        <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/30 space-y-1">
          <div className="text-xs font-semibold text-red-400 flex items-center gap-1.5 mb-1">
            <AlertCircle size={13} className="shrink-0" />
            Circuit Configuration Issue:
          </div>
          {fatalErrors.map((err, i) => (
            <p key={`fatal-${i}`} className="text-xs text-red-300 pl-4 font-mono leading-relaxed">
              • {err}
            </p>
          ))}
          <p className="text-[11px] text-red-400/80 pl-4 pt-1 italic">
            Check wire connections and ensure a Ground component is connected to establish reference voltage (0V).
          </p>
        </div>
      )}

      {/* Warnings & Notices */}
      {(warningMessages.length > 0 || noticeMessages.length > 0) && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 space-y-1">
          {warningMessages.map((warn, i) => (
            <p key={`warn-${i}`} className="text-[11px] text-amber-300 flex items-start gap-1 font-mono">
              <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-400" />
              <span>{warn.replace(/^Warning:\s*/, '')}</span>
            </p>
          ))}
          {noticeMessages.map((notice, i) => (
            <p key={`notice-${i}`} className="text-[11px] text-electric-cyan flex items-start gap-1 font-mono">
              <Info size={12} className="shrink-0 mt-0.5 text-electric-cyan" />
              <span>{notice}</span>
            </p>
          ))}
        </div>
      )}

      {/* ---- State 3: Results Table (Rendered safely for both success & partial/unsolved state) ---- */}
      {componentResults.length === 0 ? (
        <div className="py-6 text-center text-xs text-dark-400">
          No components on canvas. Drag components from the left palette to build a circuit.
        </div>
      ) : (
        <div className="px-4 py-2 overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="text-dark-400 border-b border-dark-600/40 select-none">
                <th className="text-left py-1.5 font-medium">Component</th>
                <th className="text-right py-1.5 font-medium">V₁ (Lead 1)</th>
                <th className="text-right py-1.5 font-medium">V₂ (Lead 2)</th>
                <th className="text-right py-1.5 font-medium">Current (I)</th>
                <th className="text-right py-1.5 font-medium">Power (P)</th>
              </tr>
            </thead>
            <tbody>
              {componentResults.map(comp => {
                const v1 = comp.voltages[0]?.voltage;
                const v2 = comp.voltages.length > 1 ? comp.voltages[1]?.voltage : undefined;

                return (
                  <tr
                    key={comp.id}
                    className="border-b border-dark-700/30 hover:bg-dark-700/30 transition-colors"
                  >
                    <td className="py-1.5 font-mono text-dark-200 flex items-center gap-1.5">
                      <Zap size={11} className="text-electric-amber shrink-0" />
                      <span className="font-semibold">{comp.label}</span>
                      <span className="text-[9px] text-dark-400 capitalize">({comp.type.replace('_', ' ')})</span>
                      {comp.ledState !== undefined && (
                        <span
                          className={`ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            comp.ledState
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                              : 'bg-dark-700 text-dark-500 border border-dark-600'
                          }`}
                        >
                          {comp.ledState ? 'LIT' : 'OFF'}
                        </span>
                      )}
                    </td>

                    {/* V1 Terminal Voltage */}
                    <td className="py-1.5 text-right font-mono text-electric-cyan">
                      {formatVoltage(v1)}
                    </td>

                    {/* V2 Terminal Voltage (Dash if single terminal like Ground) */}
                    <td className="py-1.5 text-right font-mono text-electric-cyan">
                      {comp.voltages.length > 1 ? formatVoltage(v2) : '—'}
                    </td>

                    {/* Branch Current */}
                    <td className="py-1.5 text-right font-mono text-electric-green">
                      {formatCurrent(comp.current)}
                    </td>

                    {/* Power Dissipation */}
                    <td className="py-1.5 text-right font-mono text-electric-amber">
                      {formatPower(comp.power)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SimulationResults;
