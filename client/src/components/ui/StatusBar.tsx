// ============================================================================
// StatusBar.tsx — Bottom status bar with connection info and notifications
// ============================================================================

import React from 'react';
import { Wifi, WifiOff, Cpu, Layers } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { useCircuitStore } from '../../store/circuitStore';
import { useUIStore } from '../../store/uiStore';

const StatusBar: React.FC = () => {
  const isConnected = useRoomStore(s => s.isConnected);
  const roomId = useRoomStore(s => s.roomId);
  const connectedUsers = useRoomStore(s => s.connectedUsers);
  const nodes = useCircuitStore(s => s.nodes);
  const edges = useCircuitStore(s => s.edges);
  const selectedNodeId = useCircuitStore(s => s.selectedNodeId);
  const notifications = useUIStore(s => s.notifications);

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  return (
    <>
      {/* Toast notifications */}
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-1.5 pointer-events-none items-center max-w-md w-full px-4">
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-2xl backdrop-blur-md animate-slide-down border flex items-center gap-2 pointer-events-auto ${
              notif.type === 'success' ? 'bg-dark-900/90 text-electric-green border-electric-green/40 shadow-electric-green/10' :
              notif.type === 'error' ? 'bg-dark-900/90 text-red-400 border-red-500/40 shadow-red-500/10' :
              notif.type === 'warning' ? 'bg-dark-900/90 text-electric-amber border-electric-amber/40 shadow-electric-amber/10' :
              'bg-dark-900/90 text-electric-blue border-electric-blue/40 shadow-electric-blue/10'
            }`}
          >
            <span>
              {notif.type === 'success' ? '✓' :
               notif.type === 'error' ? '⚠️' :
               notif.type === 'warning' ? '⚡' : 'ℹ️'}
            </span>
            <span>{notif.message}</span>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <footer className="h-6 bg-dark-800/95 border-t border-dark-600/50 flex items-center px-3 gap-4 text-[10px] shrink-0 select-none">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <>
              <Wifi size={10} className="text-electric-green" />
              <span className="text-dark-300 font-medium">Connected</span>
            </>
          ) : roomId ? (
            <>
              <WifiOff size={10} className="text-red-400" />
              <span className="text-dark-400">Disconnected</span>
            </>
          ) : (
            <span className="text-dark-400 font-medium">Solo mode</span>
          )}
        </div>

        {/* Room info */}
        {roomId && (
          <div className="flex items-center gap-1.5 text-dark-400">
            Room: <span className="font-mono text-electric-cyan font-semibold">{roomId}</span>
            · {connectedUsers.length} collaborator{connectedUsers.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Selected Component hint */}
        {selectedNode && (
          <div className="hidden sm:flex items-center gap-1 text-electric-blue">
            <Layers size={10} />
            <span>Selected: {(selectedNode.data?.label as string) || selectedNode.id} ({selectedNode.type})</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Component count */}
        <div className="flex items-center gap-2 text-dark-400">
          <span className="flex items-center gap-1">
            <Cpu size={10} />
            {nodes.length} component{nodes.length !== 1 ? 's' : ''}
          </span>
          <span>·</span>
          <span>{edges.length} wire{edges.length !== 1 ? 's' : ''}</span>
        </div>
      </footer>
    </>
  );
};

export default StatusBar;
