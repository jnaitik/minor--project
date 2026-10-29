// ============================================================================
// GestureDiagnosticsHUD.tsx — Live Diagnostic Overlay for Gesture Coordinate Pipeline
//
// Displays real-time telemetry answering all diagnostic questions:
//   - Raw MediaPipe landmarks (thumb tip, index tip)
//   - Calculated pinch point in normalized & webcam pixel coordinates
//   - Mapped screen clientX/clientY & React Flow canvas coordinates
//   - State Machine State (IDLE -> PINCH_DETECTED -> COMPONENT_GRABBED -> DRAGGING -> RELEASED)
//   - Selected component ID, type, grab offset, and distance to hit region
//   - Real-time hit-test bounding box table for nearby components
// ============================================================================

import React, { useState } from 'react';
import { useGestureStore } from '../../store/gestureStore';
import { Activity, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

const GestureDiagnosticsHUD: React.FC = () => {
  const showDiagnostics = useGestureStore(s => s.showDiagnostics);
  const toggleDiagnostics = useGestureStore(s => s.toggleDiagnostics);
  const diagnostics = useGestureStore(s => s.diagnostics);
  const stateMachineState = useGestureStore(s => s.stateMachineState);
  const [collapsed, setCollapsed] = useState(false);

  if (!showDiagnostics) {
    return (
      <button
        onClick={toggleDiagnostics}
        className="fixed bottom-8 left-4 z-50 pointer-events-auto bg-dark-900/90 border border-electric-blue/40 text-electric-blue text-[10px] font-mono px-2.5 py-1 rounded-md shadow-lg backdrop-blur-md flex items-center gap-1.5 hover:bg-dark-800 transition-colors"
        title="Show Gesture Diagnostics"
      >
        <Activity size={12} />
        <span>DIAGNOSTICS</span>
      </button>
    );
  }

  const d = diagnostics;

  return (
    <div className="fixed top-14 left-4 z-50 pointer-events-auto font-mono text-[10px] max-w-sm w-96 bg-dark-950/95 border border-dark-600/80 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden transition-all text-dark-200">
      {/* Header */}
      <div className="bg-dark-900/90 px-3 py-1.5 border-b border-dark-700/70 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity size={13} className="text-electric-cyan animate-pulse" />
          <span className="font-bold text-dark-100 uppercase tracking-wider text-[10px]">
            Gesture Diagnostics
          </span>
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
            stateMachineState === 'DRAGGING'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : stateMachineState === 'COMPONENT_GRABBED'
              ? 'bg-electric-blue/20 text-electric-blue border border-electric-blue/40'
              : stateMachineState === 'PINCH_DETECTED'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'bg-dark-800 text-dark-400'
          }`}>
            {stateMachineState}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-dark-400 hover:text-dark-100 hover:bg-dark-800"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
          <button
            onClick={toggleDiagnostics}
            className="p-1 rounded text-dark-400 hover:text-dark-100 hover:bg-dark-800"
            title="Hide Diagnostics"
          >
            <EyeOff size={13} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2.5 max-h-[75vh] overflow-y-auto scrollbar-thin">
          {/* Coordinates Grid */}
          <div className="grid grid-cols-2 gap-1.5 bg-dark-900/60 p-2 rounded-lg border border-dark-800/80">
            <div>
              <span className="text-dark-400 text-[9px] uppercase block">Raw Thumb Tip (L4)</span>
              <span className="text-electric-cyan">
                {d ? `(${d.rawThumbTip.x.toFixed(3)}, ${d.rawThumbTip.y.toFixed(3)})` : '--'}
              </span>
            </div>
            <div>
              <span className="text-dark-400 text-[9px] uppercase block">Raw Index Tip (L8)</span>
              <span className="text-electric-cyan">
                {d ? `(${d.rawIndexTip.x.toFixed(3)}, ${d.rawIndexTip.y.toFixed(3)})` : '--'}
              </span>
            </div>
            <div>
              <span className="text-dark-400 text-[9px] uppercase block">Pinch Point (Norm)</span>
              <span className="text-dark-100">
                {d ? `(${d.calculatedPinchPoint.x.toFixed(3)}, ${d.calculatedPinchPoint.y.toFixed(3)})` : '--'}
              </span>
            </div>
            <div>
              <span className="text-dark-400 text-[9px] uppercase block">Webcam Pixels</span>
              <span className="text-dark-100">
                {d ? `${Math.round(d.webcamPixels.x)}x${Math.round(d.webcamPixels.y)} (${d.webcamPixels.videoWidth}x${d.webcamPixels.videoHeight})` : '--'}
              </span>
            </div>
            <div>
              <span className="text-dark-400 text-[9px] uppercase block">Screen (Client)</span>
              <span className="text-amber-400">
                {d ? `(${Math.round(d.screenCoordinates.x)}, ${Math.round(d.screenCoordinates.y)})` : '--'}
              </span>
            </div>
            <div>
              <span className="text-dark-400 text-[9px] uppercase block">Flow Canvas</span>
              <span className="text-emerald-400 font-semibold">
                {d ? `(${Math.round(d.canvasCoordinates.x)}, ${Math.round(d.canvasCoordinates.y)})` : '--'}
              </span>
            </div>
          </div>

          {/* Current Selection / Drag Target */}
          <div className="bg-dark-900/60 p-2 rounded-lg border border-dark-800/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-dark-400 text-[9px] uppercase">Selected Component:</span>
              <span className="font-semibold text-electric-blue">
                {d?.selectedComponentId ? `${d.selectedComponentType} (${d.selectedComponentId})` : 'None (Canvas)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-400 text-[9px] uppercase">Grab Offset:</span>
              <span className="text-dark-200">
                {d?.grabOffset ? `Δx: ${Math.round(d.grabOffset.x)}px, Δy: ${Math.round(d.grabOffset.y)}px` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-400 text-[9px] uppercase">Current Drag Pos:</span>
              <span className="text-dark-200">
                {d?.currentDragTargetPos ? `(${Math.round(d.currentDragTargetPos.x)}, ${Math.round(d.currentDragTargetPos.y)})` : 'N/A'}
              </span>
            </div>
            {d?.distanceToHitRegion !== null && d?.distanceToHitRegion !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-dark-400 text-[9px] uppercase">Distance to Center:</span>
                <span className="text-emerald-400 font-semibold">{d.distanceToHitRegion.toFixed(1)}px</span>
              </div>
            )}
          </div>

          {/* Nearby Components Hit-Test Table */}
          {d?.nearbyComponents && d.nearbyComponents.length > 0 && (
            <div className="space-y-1">
              <div className="text-[9px] font-semibold text-dark-400 uppercase tracking-wider">
                Nearby Components Hit Test ({d.nearbyComponents.length})
              </div>
              <div className="space-y-1">
                {d.nearbyComponents.map((c) => (
                  <div
                    key={c.id}
                    className={`px-2 py-1 rounded border text-[9px] flex items-center justify-between ${
                      c.isInsideHitRegion
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-bold'
                        : 'bg-dark-900/40 border-dark-800 text-dark-400'
                    }`}
                  >
                    <div>
                      <span className="uppercase">{c.label || c.type}</span>
                      <span className="text-[8px] text-dark-400 ml-1">
                        [{Math.round(c.bounds.x)}, {Math.round(c.bounds.y)}]
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>dist: {Math.round(c.distToCenter)}px</span>
                      <span className={`px-1 py-0.2 rounded text-[8px] ${
                        c.isInsideHitRegion ? 'bg-emerald-500 text-dark-950 font-bold' : 'text-dark-500'
                      }`}>
                        {c.isInsideHitRegion ? 'HIT' : 'MISS'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Log Message */}
          {d?.logMessage && (
            <div className="text-[9px] text-amber-300 bg-amber-500/10 border border-amber-500/30 p-1.5 rounded">
              {d.logMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GestureDiagnosticsHUD;
