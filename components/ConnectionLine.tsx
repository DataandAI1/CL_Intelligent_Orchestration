
import React from 'react';
import { Edge, NodeData } from '../types';

interface ConnectionLineProps {
  edge?: Edge;
  sourceNode?: NodeData;
  targetNode?: NodeData;
  // For drag preview
  sourcePos?: { x: number, y: number };
  targetPos?: { x: number, y: number };
}

const getHandles = (node: NodeData) => {
  const x = node.position.x;
  const y = node.position.y;
  const w = node.width || 256; // Fallback width (w-64 = 256px)
  const h = node.height || 120; // Fallback height

  return [
    { x: x + w / 2, y: y, dx: 0, dy: -1 },       // Top
    { x: x + w, y: y + h / 2, dx: 1, dy: 0 },    // Right
    { x: x + w / 2, y: y + h, dx: 0, dy: 1 },    // Bottom
    { x: x, y: y + h / 2, dx: -1, dy: 0 }        // Left
  ];
};

export const ConnectionLine: React.FC<ConnectionLineProps> = ({ edge, sourceNode, targetNode, sourcePos, targetPos }) => {
  let start = { x: 0, y: 0, dx: 0, dy: 0 };
  let end = { x: 0, y: 0, dx: 0, dy: 0 };

  if (sourceNode && targetNode) {
      // Connect two nodes - find closest handles
      const sHandles = getHandles(sourceNode);
      const tHandles = getHandles(targetNode);
      
      let minD = Infinity;
      
      sHandles.forEach(s => {
        tHandles.forEach(t => {
            const d = Math.hypot(s.x - t.x, s.y - t.y);
            if (d < minD) {
                minD = d;
                start = s;
                end = t;
            }
        });
      });
  } else if (sourceNode && targetPos) {
      // Dragging from node to mouse
      const sHandles = getHandles(sourceNode);
      let minD = Infinity;
      
      sHandles.forEach(s => {
          const d = Math.hypot(s.x - targetPos.x, s.y - targetPos.y);
          if (d < minD) {
              minD = d;
              start = s;
          }
      });
      end = { ...targetPos, dx: 0, dy: 0 };
  } else {
      return null;
  }

  // Bezier Curve Logic
  const dist = Math.hypot(end.x - start.x, end.y - start.y);
  // Dynamic control point distance based on distance between nodes
  const controlDist = Math.min(Math.max(dist * 0.4, 50), 150);

  // Calculate control points extending from the handles
  const cp1 = {
      x: start.x + start.dx * controlDist,
      y: start.y + start.dy * controlDist
  };

  let cp2 = { x: end.x, y: end.y };
  
  if (targetNode) {
      // Standard node-to-node connection
      cp2 = {
          x: end.x + end.dx * controlDist,
          y: end.y + end.dy * controlDist
      };
  } else {
      // Dragging to mouse - create a natural curve based on approach
      // If dragging vertically away, curve vertical. If horizontal, curve horizontal.
      // Simple heuristic: maintain the start direction flow until near the mouse
      cp2 = {
          x: end.x - start.dx * (controlDist * 0.5),
          y: end.y - start.dy * (controlDist * 0.5)
      };
  }

  const pathD = `M${start.x},${start.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${end.x},${end.y}`;

  // Calculate dynamic label width
  const labelText = edge?.label || '';
  const labelWidth = Math.max(40, labelText.length * 6 + 16);
  const labelX = -labelWidth / 2;

  return (
    <g>
      <path
        d={pathD}
        stroke={edge ? "#94a3b8" : "#60a5fa"} // Blue when dragging
        strokeWidth="2"
        strokeDasharray={edge ? "" : "5,5"} // Dashed when dragging
        fill="none"
        className={edge ? "opacity-60 hover:opacity-100 transition-opacity" : "opacity-80"}
        pointerEvents="visibleStroke"
      />
       {/* Arrowhead */}
       <circle cx={end.x} cy={end.y} r="3" fill={edge ? "#f8fafc" : "#60a5fa"} />
       <circle cx={start.x} cy={start.y} r="2" fill={edge ? "#f8fafc" : "#60a5fa"} />
       
       {/* Label */}
       {edge?.label && (
         <g transform={`translate(${(start.x + end.x) / 2}, ${(start.y + end.y) / 2})`}>
            <rect 
              x={labelX} 
              y="-10" 
              width={labelWidth} 
              height="20" 
              rx="4" 
              fill="#0f172a" 
              stroke="#334155" 
            />
            <text 
              x="0" 
              y="4" 
              textAnchor="middle" 
              fill="#e2e8f0" 
              fontSize="10" 
              fontFamily="sans-serif"
            >
              {edge.label}
            </text>
         </g>
       )}
    </g>
  );
};
