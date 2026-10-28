import React from 'react';
import { Hand } from 'lucide-react';

const GestureInstructions: React.FC = () => {
  return (
    <div className="w-56 bg-dark-800/80 backdrop-blur-md border-l border-t border-dark-600/50 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-dark-600/50">
        <h2 className="text-sm font-semibold text-dark-100 tracking-wide uppercase flex items-center gap-2">
          <Hand size={14} className="text-electric-violet" />
          Gesture Controls
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        <InstructionItem icon="🤏" name="Pinch" action="Select / Drag" />
        <InstructionItem icon="✋" name="Open Palm" action="Pan Canvas" />
        <InstructionItem icon="☝️" name="Pointing" action="Place Node" />
        <InstructionItem icon="✊" name="Fist" action="Delete Selected" />
        <InstructionItem icon="👍" name="Thumbs Up" action="Run Simulation" />
        <InstructionItem icon="✌️" name="Victory" action="Switch Tool" />
      </div>
    </div>
  );
};

const InstructionItem = ({ icon, name, action }: { icon: string; name: string; action: string }) => (
  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-dark-700/30 border border-dark-600/20 hover:bg-dark-700/50 transition-colors">
    <div className="text-xl flex-shrink-0">{icon}</div>
    <div className="flex flex-col min-w-0">
      <span className="text-[11px] font-bold text-dark-200 truncate">{name}</span>
      <span className="text-[10px] text-dark-400 truncate">{action}</span>
    </div>
  </div>
);

export default GestureInstructions;
