// ============================================================================
// CircuitCanvas.tsx — Main circuit editor canvas using React Flow
//
// This is the primary workspace where users place and connect circuit
// components. It handles:
//   - Drag-and-drop from the component palette with cursor-centered placement
//   - Wire connections between component terminals with junction dots
//   - Node selection, deletion, collision-free repositioning, and movement
//   - Gesture-driven interactions (via gesture store)
//   - Accurate screen-to-canvas coordinate transformations invariant to zoom/pan
//   - Remote user cursor display
// ============================================================================

import React, { useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ConnectionMode,
  type ReactFlowInstance,
  Panel,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodes';
import { useCircuitStore } from '../../store/circuitStore';
import { useRoomStore } from '../../store/roomStore';
import { checkCollision, findNearestValidPosition, getComponentCenterOffset } from '../../lib/collision';
import type { ComponentType } from '../../types';

const CircuitCanvas: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Circuit store
  const nodes = useCircuitStore(s => s.nodes);
  const edges = useCircuitStore(s => s.edges);
  const onNodesChange = useCircuitStore(s => s.onNodesChange);
  const onEdgesChange = useCircuitStore(s => s.onEdgesChange);
  const onConnect = useCircuitStore(s => s.onConnect);
  const addNode = useCircuitStore(s => s.addNode);
  const repositionNodeSafely = useCircuitStore(s => s.repositionNodeSafely);
  const setSelectedNode = useCircuitStore(s => s.setSelectedNode);
  const setSelectedEdge = useCircuitStore(s => s.setSelectedEdge);
  const toolMode = useCircuitStore(s => s.toolMode);
  const placingComponentType = useCircuitStore(s => s.placingComponentType);
  const setPlacingComponent = useCircuitStore(s => s.setPlacingComponent);
  const removeNode = useCircuitStore(s => s.removeNode);
  const removeEdge = useCircuitStore(s => s.removeEdge);
  const gridSnap = useCircuitStore(s => s.gridSnap);
  const gridSize = useCircuitStore(s => s.gridSize);

  // Remote cursors
  const remoteCursors = useRoomStore(s => s.remoteCursors);
  const connectedUsers = useRoomStore(s => s.connectedUsers);

  // Handle React Flow initialization
  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    useCircuitStore.getState().setReactFlowInstance(instance);
  }, []);

  // Handle drag-and-drop from component palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/circuit-component') as ComponentType;
      if (!type || !reactFlowInstance.current) return;

      // Convert screen coordinates to canvas coordinates
      const flowPos = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // addNode centers the component at flowPos automatically
      addNode(type, flowPos, false, true);
    },
    [addNode]
  );

  // Handle canvas click (place component in "place" mode)
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (toolMode === 'place' && placingComponentType && reactFlowInstance.current) {
        const flowPos = reactFlowInstance.current.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        addNode(placingComponentType, flowPos, false, true);
        // Keep placing mode active for rapid placement
      } else {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    },
    [toolMode, placingComponentType, addNode, setSelectedNode, setSelectedEdge]
  );

  // Handle node drag stop: safely resolve collisions so components never overlap
  const onNodeDragStop = useCallback(
    (_event: any, node: Node) => {
      repositionNodeSafely(node.id, node.position);
    },
    [repositionNodeSafely]
  );

  // Handle node click (selection)
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      if (toolMode === 'delete') {
        removeNode(node.id);
      } else {
        setSelectedNode(node.id);
      }
    },
    [toolMode, setSelectedNode, removeNode]
  );

  // Handle edge click
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: { id: string }) => {
      if (toolMode === 'delete') {
        removeEdge(edge.id);
      } else {
        setSelectedEdge(edge.id);
      }
    },
    [toolMode, setSelectedEdge, removeEdge]
  );

  // Handle keyboard shortcuts
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodeId = useCircuitStore.getState().selectedNodeId;
        const selectedEdgeId = useCircuitStore.getState().selectedEdgeId;
        if (selectedNodeId) removeNode(selectedNodeId);
        if (selectedEdgeId) removeEdge(selectedEdgeId);
      }
      if (event.key === 'Escape') {
        setPlacingComponent(null);
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    },
    [removeNode, removeEdge, setPlacingComponent, setSelectedNode, setSelectedEdge]
  );

  // Default edge style: distinct electric cyan wires with responsive hover
  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep',
      style: { stroke: '#06b6d4', strokeWidth: 2.2 },
      animated: false,
    }),
    []
  );

  const placementPreview = useCircuitStore(s => s.placementPreview);
  const setPlacementPreview = useCircuitStore(s => s.setPlacementPreview);

  // Update placement preview on mouse move over canvas when in 'place' mode
  const onMouseMove = useCallback((event: React.MouseEvent) => {
    if (toolMode !== 'place' || !placingComponentType || !reactFlowInstance.current) {
      if (placementPreview) setPlacementPreview(null);
      return;
    }

    const flowPos = reactFlowInstance.current.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const offset = getComponentCenterOffset(placingComponentType);
    const centeredPos = {
      x: flowPos.x - offset.x,
      y: flowPos.y - offset.y,
    };

    const snappedX = Math.round(centeredPos.x / gridSize) * gridSize;
    const snappedY = Math.round(centeredPos.y / gridSize) * gridSize;

    const collision = checkCollision(
      placingComponentType,
      { x: snappedX, y: snappedY },
      nodes
    );

    let suggestedPos: { x: number; y: number } | undefined;
    if (collision) {
      const nearest = findNearestValidPosition(placingComponentType, { x: snappedX, y: snappedY }, nodes);
      suggestedPos = { x: nearest.x, y: nearest.y };
    }

    setPlacementPreview({
      x: snappedX,
      y: snappedY,
      isValid: !collision,
      type: placingComponentType,
      suggestedX: suggestedPos?.x,
      suggestedY: suggestedPos?.y,
    });
  }, [toolMode, placingComponentType, nodes, gridSize, placementPreview, setPlacementPreview]);

  // Screen positioning helper for the preview overlay
  const previewScreenPos = useMemo(() => {
    if (!placementPreview || !reactFlowInstance.current || !reactFlowWrapper.current) return null;
    const wrapperRect = reactFlowWrapper.current.getBoundingClientRect();
    const screenCoord = reactFlowInstance.current.flowToScreenPosition({
      x: placementPreview.x,
      y: placementPreview.y,
    });
    return {
      x: screenCoord.x - wrapperRect.left,
      y: screenCoord.y - wrapperRect.top,
      zoom: reactFlowInstance.current.getZoom(),
    };
  }, [placementPreview]);

  const suggestedScreenPos = useMemo(() => {
    if (
      !placementPreview ||
      placementPreview.isValid ||
      placementPreview.suggestedX === undefined ||
      placementPreview.suggestedY === undefined ||
      !reactFlowInstance.current ||
      !reactFlowWrapper.current
    ) {
      return null;
    }
    const wrapperRect = reactFlowWrapper.current.getBoundingClientRect();
    const screenCoord = reactFlowInstance.current.flowToScreenPosition({
      x: placementPreview.suggestedX,
      y: placementPreview.suggestedY,
    });
    return {
      x: screenCoord.x - wrapperRect.left,
      y: screenCoord.y - wrapperRect.top,
      zoom: reactFlowInstance.current.getZoom(),
    };
  }, [placementPreview]);

  return (
    <div
      ref={reactFlowWrapper}
      className="flex-1 h-full relative"
      onKeyDown={onKeyDown}
      onMouseMove={onMouseMove}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        connectionMode={ConnectionMode.Loose}
        isValidConnection={(conn) => conn.source !== conn.target}
        onInit={onInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        snapToGrid={gridSnap}
        snapGrid={[gridSize, gridSize]}
        minZoom={0.2}
        maxZoom={4}
        className="circuit-canvas"
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={['Delete', 'Backspace']}
      >
        {/* Grid background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={gridSize}
          size={1.2}
          color="#1e293b"
        />

        {/* Zoom/pan controls */}
        <Controls
          className="!bg-dark-700/80 !border-dark-600 !rounded-lg !shadow-xl [&>button]:!bg-dark-700 [&>button]:!border-dark-600 [&>button]:!fill-dark-200 [&>button:hover]:!bg-dark-600"
        />

        {/* Minimap */}
        <MiniMap
          className="!bg-dark-800/90 !border-dark-600 !rounded-lg"
          nodeColor="#3b82f6"
          maskColor="rgba(10, 14, 26, 0.7)"
        />

        {/* Remote cursors overlay */}
        {Object.entries(remoteCursors).map(([userId, cursor]) => {
          const user = connectedUsers.find(u => u.id === userId);
          if (!user) return null;
          return (
            <Panel key={userId} position="top-left" style={{
              position: 'absolute',
              left: cursor.x,
              top: cursor.y,
              pointerEvents: 'none',
              transform: 'translate(-50%, -50%)',
              zIndex: 50,
            }}>
              <div className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-lg animate-cursor-blink"
                  style={{ backgroundColor: user.color }}
                />
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white shadow-lg whitespace-nowrap"
                  style={{ backgroundColor: user.color }}
                >
                  {user.username}
                </span>
              </div>
            </Panel>
          );
        })}

        {/* Placing mode indicator banner */}
        {toolMode === 'place' && placingComponentType && (
          <Panel position="top-center">
            <div className="bg-electric-blue/20 border border-electric-blue/40 text-electric-blue px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm animate-slide-down flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-electric-cyan animate-ping" />
              Click on canvas to place {placingComponentType.replace('_', ' ')} · Press ESC to cancel
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Accurate placement preview ghost boxes overlaid relative to wrapper */}
      {toolMode === 'place' && placementPreview && previewScreenPos && (
        <div
          className="pointer-events-none absolute z-30 transition-all duration-75"
          style={{
            left: previewScreenPos.x,
            top: previewScreenPos.y,
            transform: `scale(${previewScreenPos.zoom})`,
            transformOrigin: 'top left',
          }}
        >
          <div
            className={`rounded-lg border-2 border-dashed px-3 py-2 flex items-center justify-center transition-all ${
              placementPreview.isValid
                ? 'border-electric-green/90 bg-electric-green/15 text-electric-green shadow-lg shadow-electric-green/20'
                : 'border-red-500/90 bg-red-500/15 text-red-400 shadow-lg shadow-red-500/20'
            }`}
            style={{ width: 110, height: 60 }}
          >
            <span className="text-[10px] font-mono font-semibold">
              {placementPreview.isValid ? `✓ Place ${placementPreview.type}` : '✗ Occupied'}
            </span>
          </div>
        </div>
      )}

      {/* Suggested available position ghost box when candidate spot is occupied */}
      {toolMode === 'place' && placementPreview && !placementPreview.isValid && suggestedScreenPos && (
        <div
          className="pointer-events-none absolute z-30 transition-all duration-150 animate-pulse"
          style={{
            left: suggestedScreenPos.x,
            top: suggestedScreenPos.y,
            transform: `scale(${suggestedScreenPos.zoom})`,
            transformOrigin: 'top left',
          }}
        >
          <div
            className="rounded-lg border-2 border-dashed border-electric-cyan/80 bg-electric-cyan/10 text-electric-cyan shadow-lg shadow-electric-cyan/20 px-3 py-2 flex items-center justify-center"
            style={{ width: 110, height: 60 }}
          >
            <span className="text-[10px] font-mono font-semibold">
              💡 Suggested Slot
            </span>
          </div>
        </div>
      )}

      {/* Canvas cursor style */}
      <style>{`
        .circuit-canvas {
          background-color: #0a0e1a !important;
        }
        .circuit-canvas .react-flow__node {
          cursor: ${toolMode === 'delete' ? 'crosshair' : 'grab'};
        }
        .circuit-canvas .react-flow__node:active {
          cursor: grabbing;
        }
        .react-flow__edge-path {
          cursor: pointer;
        }
        .react-flow__edge-path:hover {
          stroke: #38bdf8 !important;
          stroke-width: 3.5px !important;
          filter: drop-shadow(0 0 4px #06b6d4);
        }
      `}</style>
    </div>
  );
};

export default CircuitCanvas;
