// ============================================================================
// SimulationResults.tsx — Panel displaying DC simulation results
// Shows node voltages, branch currents, and component power
// ============================================================================

import React from 'react';
import { X, Zap, Activity } from 'lucide-react';
import { useCircuitStore } from '../../store/circuitStore';
import { useUIStore } from '../../store/uiStore';

const SimulationResults: React.FC = () => {
  const simulationResults = useCircuitStore(s => s.simulationResults);
  const nodes = useCircuitStore(s => s.nodes);
  const isSimulating = useCircuitStore(s => s.isSimulating);
  const toggleSimResults = useUIStore(s => s.toggleSimResults);

  if (!simulationResults) {
    return (
      <div className="bg-dark-800/90 backdrop-blur-md border-t border-dark-600/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
            <Activity size={14} className="text-electric-cyan" />
            Simulation Results
          </h3>
          <button onClick={toggleSimResults} className="p-1 rounded hover:bg-dark-600 text-dark-400 hover:text-dark-200 transition-colors">
            <X size={14} />
          </button>
        </div>
        <p className="text-sm text-dark-400 text-center py-4">
          {isSimulating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⚡</span> Running simulation...
            </span>
          ) : (
            'Click "Run Simulation" or 👍 gesture to analyze the circuit'
          )}
        </p>
      </div>
    );
  }

  // Group results by component
  const componentResults = nodes.map(node => {
    const data = node.data as Record<string, unknown>;
    const label = (data.label as string) || node.id;
    const type = node.type || '';
    
    // Get voltages at terminals
    const handles = type === 'voltage_source' ? ['positive', 'negative'] :
                    type === 'ground' ? ['top'] : ['left', 'right'];
    const voltages = handles.map(h => ({
      handle: h,
      voltage: simulationResults.nodeVoltages[`${node.id}:${h}`] ?? null,
    }));
    
    const current = simulationResults.branchCurrents[node.id];
    const power = simulationResults.componentPower[node.id];
    const ledState = simulationResults.ledStates[node.id];

    return { id: node.id, label, type, voltages, current, power, ledState };
  });

  return (
    <div className="bg-dark-800/90 backdrop-blur-md border-t border-dark-600/50 max-h-64 overflow-y-auto">
      <div className="px-4 py-2 border-b border-dark-600/50 flex items-center justify-between sticky top-0 bg-dark-800/90 backdrop-blur-md z-10">
        <h3 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
          <Activity size={14} className="text-electric-cyan" />
          Simulation Results
          {!simulationResults.isValid && (
            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
              Errors
            </span>
          )}
        </h3>
        <button onClick={toggleSimResults} className="p-1 rounded hover:bg-dark-600 text-dark-400 hover:text-dark-200 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Error messages */}
      {simulationResults.errors.length > 0 && (
        <div className="px-4 py-2 border-b border-red-500/20">
          {simulationResults.errors.map((err, i) => (
            <p key={i} className="text-[11px] text-red-400 flex items-start gap-1">
              <span>⚠️</span> {err}
            </p>
          ))}
        </div>
      )}

      {/* Results table */}
      <div className="px-4 py-2">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-dark-400 border-b border-dark-600/30">
              <th className="text-left py-1.5 font-medium">Component</th>
              <th className="text-right py-1.5 font-medium">V₁</th>
              <th className="text-right py-1.5 font-medium">V₂</th>
              <th className="text-right py-1.5 font-medium">Current</th>
              <th className="text-right py-1.5 font-medium">Power</th>
            </tr>
          </thead>
          <tbody>
            {componentResults.map(comp => (
              <tr key={comp.id} className="border-b border-dark-700/30 hover:bg-dark-700/30 transition-colors">
                <td className="py-1.5 font-mono text-dark-200 flex items-center gap-1.5">
                  <Zap size={10} className="text-electric-amber" />
                  {comp.label}
                  {comp.ledState !== undefined && (
                    <span className={`ml-1 w-2 h-2 rounded-full ${comp.ledState ? 'bg-electric-green animate-pulse' : 'bg-dark-500'}`} />
                  )}
                </td>
                <td className="py-1.5 text-right font-mono text-electric-cyan">
                  {comp.voltages[0]?.voltage !== null ? `${comp.voltages[0].voltage}V` : '—'}
                </td>
                <td className="py-1.5 text-right font-mono text-electric-cyan">
                  {comp.voltages[1]?.voltage !== null ? `${comp.voltages[1].voltage}V` : '—'}
                </td>
                <td className="py-1.5 text-right font-mono text-electric-green">
                  {comp.current !== undefined ? `${(comp.current * 1000).toFixed(2)}mA` : '—'}
                </td>
                <td className="py-1.5 text-right font-mono text-electric-amber">
                  {comp.power !== undefined ? `${(Math.abs(comp.power) * 1000).toFixed(2)}mW` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SimulationResults;
