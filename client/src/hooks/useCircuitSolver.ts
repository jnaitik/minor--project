// ============================================================================
// hooks/useCircuitSolver.ts — Hook for running circuit simulation
// ============================================================================

import { useCallback } from 'react';
import { useCircuitStore } from '../store/circuitStore';
import { useRoomStore } from '../store/roomStore';
import { useUIStore } from '../store/uiStore';
import { solveCircuitLocal } from '../lib/circuitSolver';
import socket from '../lib/socket';

export function useCircuitSolver() {
  const nodes = useCircuitStore(s => s.nodes);
  const edges = useCircuitStore(s => s.edges);
  const setSimulationResults = useCircuitStore(s => s.setSimulationResults);
  const setIsSimulating = useCircuitStore(s => s.setIsSimulating);
  const roomId = useRoomStore(s => s.roomId);
  const addNotification = useUIStore(s => s.addNotification);

  const runSimulation = useCallback(() => {
    setIsSimulating(true);

    try {
      if (roomId) {
        // In a collaborative room — let server handle it
        socket.emit('run-simulation', { roomId });
      } else {
        // Solo mode — run locally
        const results = solveCircuitLocal(nodes, edges);
        setSimulationResults(results);
        
        if (results.isValid) {
          addNotification('Simulation complete ✓', 'success');
        } else {
          addNotification(`Simulation errors: ${results.errors.join(', ')}`, 'warning');
        }
      }
    } catch (error) {
      addNotification('Simulation failed', 'error');
    } finally {
      setIsSimulating(false);
    }
  }, [nodes, edges, roomId, setSimulationResults, setIsSimulating, addNotification]);

  return { runSimulation };
}
