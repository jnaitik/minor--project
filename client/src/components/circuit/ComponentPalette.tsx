// ============================================================================
// ComponentPalette.tsx — Sidebar with draggable circuit components
//
// Shows all available component types as cards. Users can:
//   - Drag a card onto the canvas to place the component
//   - Click a card to enter "place" mode (click on canvas to place)
// ============================================================================

import React from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { COMPONENTS, type ComponentType } from '../../types';

// SVG icons for each component type (simplified schematic symbols)
const ComponentIcon: React.FC<{ type: ComponentType; className?: string }> = ({ type, className }) => {
  const cls = className || 'w-8 h-8';
  
  switch (type) {
    case 'resistor':
      return (
        <svg className={cls} viewBox="0 0 32 32" fill="none">
          <polyline points="4,16 8,8 14,24 20,8 26,24 28,16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case 'capacitor':
      return (
        <svg className={cls} viewBox="0 0 32 32" fill="none">
          <line x1="4" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth="2" />
          <line x1="19" y1="16" x2="28" y2="16" stroke="currentColor" strokeWidth="2" />
          <line x1="13" y1="8" x2="13" y2="24" stroke="currentColor" strokeWidth="2.5" />
          <line x1="19" y1="8" x2="19" y2="24" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      );
    case 'inductor':
      return (
        <svg className={cls} viewBox="0 0 32 32" fill="none">
          <path d="M4,16 C4,10 10,10 10,16 C10,10 16,10 16,16 C16,10 22,10 22,16 C22,10 28,10 28,16" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'voltage_source':
      return (
        <svg className={cls} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="2" />
          <line x1="11" y1="16" x2="15" y2="16" stroke="currentColor" strokeWidth="2" />
          <line x1="13" y1="14" x2="13" y2="18" stroke="currentColor" strokeWidth="2" />
          <line x1="17" y1="16" x2="21" y2="16" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'ground':
      return (
        <svg className={cls} viewBox="0 0 32 32" fill="none">
          <line x1="16" y1="4" x2="16" y2="12" stroke="currentColor" strokeWidth="2" />
          <line x1="6" y1="12" x2="26" y2="12" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="18" x2="22" y2="18" stroke="currentColor" strokeWidth="1.5" />
          <line x1="13" y1="24" x2="19" y2="24" stroke="currentColor" strokeWidth="1" />
        </svg>
      );
    case 'led':
      return (
        <svg className={cls} viewBox="0 0 32 32" fill="none">
          <polygon points="10,8 10,24 24,16" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="24" y1="8" x2="24" y2="24" stroke="currentColor" strokeWidth="2" />
          <line x1="20" y1="6" x2="24" y2="2" stroke="currentColor" strokeWidth="1.5" />
          <line x1="24" y1="6" x2="28" y2="2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'switch':
      return (
        <svg className={cls} viewBox="0 0 32 32" fill="none">
          <circle cx="8" cy="20" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="24" cy="20" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          <line x1="10" y1="19" x2="22" y2="10" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    default:
      return null;
  }
};

export interface ComponentPaletteProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onItemClick?: () => void;
}

const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  collapsed = false,
  onToggleCollapse,
  onItemClick,
}) => {
  const placingComponentType = useCircuitStore(s => s.placingComponentType);
  const setPlacingComponent = useCircuitStore(s => s.setPlacingComponent);
  const toolMode = useCircuitStore(s => s.toolMode);

  // Drag start handler — sets the component type in the drag data
  const onDragStart = (event: React.DragEvent, type: ComponentType) => {
    event.dataTransfer.setData('application/circuit-component', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Click handler — enters "place" mode
  const onClick = (type: ComponentType) => {
    if (placingComponentType === type) {
      setPlacingComponent(null); // Toggle off
    } else {
      setPlacingComponent(type);
    }
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`border-b border-dark-600/50 flex items-center justify-between ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
        {!collapsed ? (
          <div>
            <h2 className="text-sm font-semibold text-dark-100 tracking-wide uppercase">
              Components
            </h2>
            <p className="text-[11px] text-dark-400 mt-0.5">
              Drag or click to place
            </p>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <span className="text-[10px] font-bold text-dark-400 uppercase tracking-tighter">PARTS</span>
          </div>
        )}
      </div>

      {/* Component list */}
      <div className={`flex-1 overflow-y-auto space-y-1.5 scrollbar-thin ${collapsed ? 'p-1.5' : 'p-2'}`}>
        {COMPONENTS.map((comp) => {
          const isSelected = placingComponentType === comp.type;
          return (
            <div
              key={comp.type}
              data-component-type={comp.type}
              draggable
              onDragStart={(e) => onDragStart(e, comp.type)}
              onClick={() => onClick(comp.type)}
              title={`${comp.label}: ${comp.description}`}
              className={`group flex items-center rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 border ${
                collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'
              } ${
                isSelected
                  ? 'bg-electric-blue/15 border-electric-blue/40 shadow-lg shadow-electric-blue/10 text-electric-blue'
                  : 'bg-dark-700/50 border-dark-600/30 hover:bg-dark-700 hover:border-dark-500 text-dark-200'
              }`}
            >
              {/* Icon */}
              <div
                className={`flex items-center justify-center rounded-lg transition-colors ${
                  collapsed ? 'w-8 h-8' : 'w-9 h-9'
                } ${
                  isSelected
                    ? 'bg-electric-blue/20 text-electric-blue'
                    : 'bg-dark-600/50 text-dark-300 group-hover:text-electric-cyan'
                }`}
              >
                <ComponentIcon type={comp.type} className={collapsed ? 'w-6 h-6' : 'w-7 h-7'} />
              </div>

              {/* Label and description (hidden when collapsed) */}
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-dark-100 truncate">
                    {comp.label}
                  </div>
                  <div className="text-[10px] text-dark-400 truncate">
                    {comp.description}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      {!collapsed && (
        <div className="px-4 py-2 border-t border-dark-600/50">
          <p className="text-[10px] text-dark-500 text-center">
            {toolMode === 'place' ? '🎯 Click canvas to place' : '📦 Drag onto canvas'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ComponentPalette;
