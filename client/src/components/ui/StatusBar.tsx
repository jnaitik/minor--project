// ============================================================================
// StatusBar.tsx — Bottom status bar with connection info and notifications
// ============================================================================

import React from 'react';
import { Wifi, WifiOff, Hand, Cpu } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { useGestureStore } from '../../store/gestureStore';
import { useCircuitStore } from '../../store/circuitStore';
import { useUIStore } from '../../store/uiStore';

const StatusBar: React.FC = () => {
  const isConnected = useRoomStore(s => s.isConnected);
  const roomId = useRoomStore(s => s.roomId);
  const connectedUsers = useRoomStore(s => s.connectedUsers);
  const gestureEnabled = useGestureStore(s => s.gestureEnabled);
  const currentGesture = useGestureStore(s => s.currentGesture);
  const isDetecting = useGestureStore(s => s.isDetecting);
  const nodes = useCircuitStore(s => s.nodes);
  const edges = useCircuitStore(s => s.edges);
  const notifications = useUIStore(s => s.notifications);

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
      <div className="h-6 bg-dark-800/90 border-t border-dark-600/50 flex items-center px-3 gap-4 text-[10px] shrink-0">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <>
              <Wifi size={10} className="text-electric-green" />
              <span className="text-dark-400">Connected</span>
            </>
          ) : roomId ? (
            <>
              <WifiOff size={10} className="text-red-400" />
              <span className="text-dark-500">Disconnected</span>
            </>
          ) : (
            <span className="text-dark-500">Solo mode</span>
          )}
        </div>

        {/* Room info */}
        {roomId && (
          <div className="flex items-center gap-1.5 text-dark-400">
            Room: <span className="font-mono text-electric-cyan">{roomId}</span>
            · {connectedUsers.length} user{connectedUsers.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Gesture status */}
        {gestureEnabled && (
          <div className="flex items-center gap-1.5">
            <Hand size={10} className={isDetecting ? 'text-electric-violet' : 'text-dark-500'} />
            <span className={isDetecting ? 'text-electric-violet' : 'text-dark-500'}>
              {isDetecting ? `Gesture: ${currentGesture}` : 'No hand detected'}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Component count */}
        <div className="flex items-center gap-1.5 text-dark-500">
          <Cpu size={10} />
          {nodes.length} components · {edges.length} wires
        </div>
      </div>
    </>
  );
};

export default StatusBar;
