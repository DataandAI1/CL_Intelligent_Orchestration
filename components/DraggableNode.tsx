
import React, { useEffect, useRef } from 'react';
import { NodeData, NodeType } from '../types';
import { NodeIcon } from './Icons';

interface DraggableNodeProps {
  node: NodeData;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  onConnectStart: (e: React.MouseEvent, nodeId: string) => void;
  onConnectEnd: (e: React.MouseEvent, nodeId: string) => void;
  onResize?: (id: string, width: number, height: number) => void;
}

export const DraggableNode: React.FC<DraggableNodeProps> = ({ 
  node, 
  isSelected, 
  onMouseDown, 
  onSelect,
  onConnectStart,
  onConnectEnd,
  onResize
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!nodeRef.current || !onResize) return;
    
    const observer = new ResizeObserver(() => {
        if (nodeRef.current) {
            const { offsetWidth, offsetHeight } = nodeRef.current;
            if (offsetWidth !== node.width || offsetHeight !== node.height) {
                onResize(node.id, offsetWidth, offsetHeight);
            }
        }
    });
    
    observer.observe(nodeRef.current);
    return () => observer.disconnect();
  }, [node.id, node.width, node.height, onResize]);

  // Context Lattice 2025 Node Styles
  const getTypeStyles = (type: NodeType) => {
    switch (type) {
      case NodeType.AGENT: 
        return {
           bg: 'bg-[#1A3F5C]/80', 
           border: 'border-[#2A5F8C]', 
           header: 'bg-[#2A5F8C]/30',
           text: 'text-white'
        };
      case NodeType.TOOL: 
        return {
           bg: 'bg-[#2A2A2A]/80', 
           border: 'border-[#4A4A4A]', 
           header: 'bg-[#333333]/50',
           text: 'text-[#E8E8E8]'
        };
      case NodeType.DATA: 
        return {
           bg: 'bg-[#1A1A1A]/80', 
           border: 'border-[#333333]', 
           header: 'bg-[#333333]/30',
           text: 'text-[#B8B8B8]'
        };
      case NodeType.GOAL: 
        return {
           bg: 'bg-[#D4B980]/90', 
           border: 'border-[#C4A870]', 
           header: 'bg-[#C4A870]/30',
           text: 'text-[#1A1A1A]' // Dark text on gold
        };
      case NodeType.HUMAN: 
        return {
           bg: 'bg-[#C62828]/80', 
           border: 'border-[#E53935]', 
           header: 'bg-[#E53935]/30',
           text: 'text-white'
        };
      default: 
        return {
           bg: 'bg-[#2A2A2A]', 
           border: 'border-[#333333]', 
           header: 'bg-[#333333]',
           text: 'text-white'
        };
    }
  };

  const style = getTypeStyles(node.type);

  // Connection Handles
  const Handle = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div 
        className={`absolute w-3 h-3 bg-[#1A1A1A] border-2 border-[#D4B980] rounded-full hover:bg-[#D4B980] hover:scale-125 transition-all cursor-crosshair z-50 shadow-md ${className}`}
        onMouseDown={(e) => {
            e.stopPropagation();
            onConnectStart(e, node.id);
        }}
        onMouseUp={(e) => {
            e.stopPropagation();
             onConnectEnd(e, node.id);
        }}
        {...props}
    />
  );

  return (
    <div
      ref={nodeRef}
      className={`draggable-node absolute flex flex-col w-64 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.2)] cursor-move border backdrop-blur-md transition-all duration-200 select-none
        ${style.bg} ${style.border} ${isSelected ? 'ring-2 ring-[#D4B980] scale-[1.02] z-50 shadow-[0_0_20px_rgba(212,185,128,0.3)]' : 'hover:border-[#D4B980]/50 z-10'}`}
      style={{
        left: node.position.x,
        top: node.position.y,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(e, node.id);
        onSelect(node.id);
      }}
      onMouseUp={(e) => {
          // REMOVED e.stopPropagation() to allow dragging to stop via parent handler
          onConnectEnd(e, node.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
    >
      <div className={`p-3 border-b border-black/10 flex items-center gap-3 rounded-t-xl ${style.header} ${style.text}`}>
        <span className="text-lg filter drop-shadow-sm">
            <NodeIcon type={node.type} className="w-5 h-5" />
        </span>
        <span className="font-bold text-xs truncate tracking-wider uppercase opacity-90">{node.label}</span>
      </div>
      
      <div className={`p-4 text-xs leading-relaxed opacity-90 min-h-[4rem] font-medium ${node.type === NodeType.GOAL ? 'text-[#1A1A1A]' : 'text-[#E8E8E8]'}`}>
        {node.description || node.type}
      </div>
      
      {/* Connection Handles */}
      <Handle className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <Handle className="top-full left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <Handle className="top-1/2 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Handle className="top-1/2 left-full -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
};
