// ============================================================================
// CircuitEditor.tsx — Main workspace page (inside a room)
//
// Combines all the major components with responsive layout:
//   - Toolbar (top)
//   - ComponentPalette (left sidebar — collapsible / drawer on mobile)
//   - CircuitCanvas (center)
//   - PropertiesPanel (right sidebar — collapsible / bottom sheet on mobile)
//   - SimulationResults (bottom)
//   - GestureEngine + GestureOverlay + WebcamPreview (gesture layer)
//   - StatusBar (bottom bar)
//   - Socket.io connection management
//   - Mobile FABs for accessing sidebars
// ============================================================================

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { LayoutGrid, Settings2, X } from 'lucide-react';

import CircuitCanvas from './components/circuit/CircuitCanvas';
import ComponentPalette from './components/circuit/ComponentPalette';
import PropertiesPanel from './components/circuit/PropertiesPanel';
import SimulationResults from './components/circuit/SimulationResults';
import Toolbar from './components/ui/Toolbar';
import StatusBar from './components/ui/StatusBar';
// Lazy-load gesture tracking components so MediaPipe and vision models are only
// downloaded and executed if the user explicitly enables gesture control
const HandTracker = React.lazy(() => import('./components/gesture/HandTracker'));
const GestureOverlay = React.lazy(() => import('./components/gesture/GestureOverlay'));
const GestureInstructions = React.lazy(() => import('./components/gesture/GestureInstructions'));

import { useSocket } from './hooks/useSocket';
import { useGestureStore } from './store/gestureStore';
import { useCircuitStore } from './store/circuitStore';
import { useUIStore } from './store/uiStore';

const CircuitEditor: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const showSimResults = useUIStore(s => s.showSimResults);
  const isMobile = useUIStore(s => s.isMobile);
  const isDesktop = useUIStore(s => s.isDesktop);
  const paletteCollapsed = useUIStore(s => s.paletteCollapsed);
  const propertiesCollapsed = useUIStore(s => s.propertiesCollapsed);
  const mobilePaletteOpen = useUIStore(s => s.mobilePaletteOpen);
  const mobilePropertiesOpen = useUIStore(s => s.mobilePropertiesOpen);
  const setMobilePaletteOpen = useUIStore(s => s.setMobilePaletteOpen);
  const setMobilePropertiesOpen = useUIStore(s => s.setMobilePropertiesOpen);
  const togglePaletteCollapsed = useUIStore(s => s.togglePaletteCollapsed);
  const togglePropertiesCollapsed = useUIStore(s => s.togglePropertiesCollapsed);

  // Socket.io connection + real-time sync
  const { broadcastCircuit, broadcastCursor } = useSocket(roomId);

  const gestureEnabled = useGestureStore(s => s.gestureEnabled);

  // Broadcast circuit changes when nodes/edges change
  const nodes = useCircuitStore(s => s.nodes);
  const edges = useCircuitStore(s => s.edges);
  const selectedNodeId = useCircuitStore(s => s.selectedNodeId);

  useEffect(() => {
    if (roomId) {
      broadcastCircuit();
    }
  }, [nodes, edges, roomId, broadcastCircuit]);

  // Track mouse/gesture cursor for presence broadcast
  useEffect(() => {
    if (!roomId) return;

    const handleMouseMove = (e: MouseEvent) => {
      broadcastCursor(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [roomId, broadcastCursor]);

  // Ensure username is present (assign friendly Guest ID if direct link)
  useEffect(() => {
    let username = sessionStorage.getItem('cc_username');
    if (!username) {
      username = `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
      sessionStorage.setItem('cc_username', username);
    }
  }, []);

  // Auto-open properties on mobile when a node is selected
  useEffect(() => {
    if (isMobile && selectedNodeId) {
      setMobilePropertiesOpen(true);
    }
  }, [isMobile, selectedNodeId, setMobilePropertiesOpen]);

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-dark-900 overflow-hidden">
        {/* Top toolbar */}
        <Toolbar />

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* === Left sidebar — Component Palette === */}
          {!isMobile && (
            <div
              className={`sidebar-transition flex flex-col overflow-hidden border-r border-dark-600/50 bg-dark-800/80 backdrop-blur-md ${
                paletteCollapsed ? 'w-14 min-w-[3.5rem]' : 'w-56 min-w-[14rem]'
              }`}
            >
              <ComponentPalette collapsed={paletteCollapsed} onToggleCollapse={togglePaletteCollapsed} />
            </div>
          )}

          {/* Center — Circuit canvas + simulation results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <CircuitCanvas />
            {showSimResults && <SimulationResults />}
          </div>

          {/* === Right sidebar — Properties + Gesture Instructions === */}
          {!isMobile && (
            <div
              className={`sidebar-transition flex flex-col h-full border-l border-dark-600/50 bg-dark-800/80 backdrop-blur-md ${
                propertiesCollapsed ? 'w-14 min-w-[3.5rem]' : 'w-56 min-w-[14rem]'
              }`}
            >
              <PropertiesPanel collapsed={propertiesCollapsed} onToggleCollapse={togglePropertiesCollapsed} />
              {gestureEnabled && !propertiesCollapsed && (
                <React.Suspense fallback={null}>
                  <GestureInstructions />
                </React.Suspense>
              )}
            </div>
          )}
        </div>

        {/* Bottom status bar */}
        <StatusBar />

        {/* === Mobile Floating Action Buttons === */}
        {isMobile && (
          <>
            {/* Left FAB — Open palette */}
            <button
              onClick={() => setMobilePaletteOpen(true)}
              className="fab bottom-20 left-4 bg-dark-700/90 text-electric-cyan border-electric-cyan/30 hover:bg-dark-600"
              title="Components"
            >
              <LayoutGrid size={20} />
            </button>

            {/* Right FAB — Open properties */}
            <button
              onClick={() => setMobilePropertiesOpen(true)}
              className="fab bottom-20 right-4 bg-dark-700/90 text-electric-blue border-electric-blue/30 hover:bg-dark-600"
              title="Properties"
            >
              <Settings2 size={20} />
            </button>
          </>
        )}

        {/* === Mobile Drawer — Palette (left) === */}
        {isMobile && mobilePaletteOpen && (
          <>
            <div className="drawer-overlay" onClick={() => setMobilePaletteOpen(false)} />
            <div className="drawer-left w-72">
              <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600/50">
                <h2 className="text-sm font-semibold text-dark-100 uppercase tracking-wide">Components</h2>
                <button
                  onClick={() => setMobilePaletteOpen(false)}
                  className="p-1.5 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-600/50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <ComponentPalette collapsed={false} onToggleCollapse={() => {}} onItemClick={() => setMobilePaletteOpen(false)} />
            </div>
          </>
        )}

        {/* === Mobile Bottom Sheet — Properties === */}
        {isMobile && mobilePropertiesOpen && (
          <>
            <div className="drawer-overlay" onClick={() => setMobilePropertiesOpen(false)} />
            <div className="bottom-sheet">
              <div className="bottom-sheet-handle" />
              <div className="max-h-[70vh] overflow-y-auto">
                <PropertiesPanel collapsed={false} onToggleCollapse={() => {}} />
                {gestureEnabled && (
                  <React.Suspense fallback={null}>
                    <GestureInstructions />
                  </React.Suspense>
                )}
              </div>
            </div>
          </>
        )}

        {/* Gesture layer (non-blocking, only mounted if gesture tracking is active) */}
        {gestureEnabled && (
          <React.Suspense fallback={null}>
            <HandTracker />
            <GestureOverlay />
          </React.Suspense>
        )}
      </div>
    </ReactFlowProvider>
  );
};

export default CircuitEditor;
