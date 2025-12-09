
import React, { useState, useEffect, useRef } from 'react';
import { ProjectRequirements, NodeData, Edge, NodeType, AgentDesignResponse, ArchitectureAnalysis, SimulationStep, PatternComparisonResponse } from '../types';
import { generateArchitecture, simulateAgentRun, optimizeArchitecture, compareOrchestrationPatterns } from '../services/geminiService';
import { DraggableNode } from '../components/DraggableNode';
import { ConnectionLine } from '../components/ConnectionLine';
import { NodeIcon, LatticeIcon, RoadmapIcon, CompareIcon, PlayIcon, TableIcon, GraphIcon, BuildIcon } from '../components/Icons';

interface Props {
  requirements: ProjectRequirements;
  onBack: () => void;
  onNext: (nodes: NodeData[], edges: Edge[]) => void;
}

interface QuickAddMenuState {
  x: number;
  y: number;
  sourceId: string;
}

interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

const ORCHESTRATION_PATTERNS = [
  "Sequential Process",
  "Hierarchical Crews",
  "Router / Gateway",
  "Dynamic Network",
  "Evaluator / Optimizer",
  "Human-in-the-Loop Hybrid",
  "Custom Architecture"
];

export const DesignView: React.FC<Props> = ({ requirements, onBack, onNext }) => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [generationError, setGenerationError] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [detectedPattern, setDetectedPattern] = useState<{name: string, desc: string} | null>(null);
  
  // View States
  const [viewMode, setViewMode] = useState<'canvas' | 'table'>('canvas');
  const [isPatternPanelOpen, setIsPatternPanelOpen] = useState(false);

  // Viewport / Canvas State
  const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Node Drag State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Connection Drag State
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState({ x: 0, y: 0 });
  const [quickAddMenu, setQuickAddMenu] = useState<QuickAddMenuState | null>(null);

  // Simulator State
  const [showSimulator, setShowSimulator] = useState(false);
  const [simScenario, setSimScenario] = useState("");
  const [simResult, setSimResult] = useState<SimulationStep[] | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Optimizer State
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<ArchitectureAnalysis | null>(null);
  const [optLoading, setOptLoading] = useState(false);

  // Comparison State
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<PatternComparisonResponse | null>(null);
  const [compLoading, setCompLoading] = useState(false);
  const [applyingPattern, setApplyingPattern] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Clean up any stray characters that might slip into the canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const walker = document.createTreeWalker(
      canvasRef.current,
      NodeFilter.SHOW_TEXT
    );

    const strayNodes: Text[] = [];

    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      if (textNode.nodeValue?.trim() === ';(') {
        strayNodes.push(textNode);
      }
    }

    strayNodes.forEach(node => node.remove());
  }, [viewMode, nodes, edges, loading]);

  // Initial Generation
  useEffect(() => {
    initArchitecture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initArchitecture = async () => {
    setLoading(true);
    setGenerationError(false);
    const design = await generateArchitecture(requirements);
    if (design && design.nodes.length > 0) {
      setDetectedPattern({ name: design.pattern || "Custom Architecture", desc: design.patternDescription || "User generated architecture" });
      autoLayout(design);
    } else {
      setNodes([]);
      setDetectedPattern({ name: "Custom Architecture", desc: "Manually created." });
      // If result is null or empty, it might be an error or just empty requirements
      if (!design) setGenerationError(true);
    }
    setLoading(false);
  };

  // Coordinate Conversion Helpers
  const screenToWorld = (screenX: number, screenY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      return {
          x: (screenX - rect.left - viewport.x) / viewport.zoom,
          y: (screenY - rect.top - viewport.y) / viewport.zoom
      };
  };

  const autoLayout = (design: AgentDesignResponse) => {
    const newNodes: NodeData[] = [];
    const newEdges: Edge[] = [];
    
    const typeGroups: Record<string, any[]> = {
      [NodeType.DATA]: [],
      [NodeType.TOOL]: [],
      [NodeType.AGENT]: [],
      [NodeType.GOAL]: [],
      [NodeType.HUMAN]: [],
    };

    (design.nodes || []).forEach(n => {
      const type = n.type as NodeType;
      if (typeGroups[type]) typeGroups[type].push(n);
      else if (typeGroups[NodeType.AGENT]) typeGroups[NodeType.AGENT].push(n);
    });

    // Layout Data & Tools on Left
    [...typeGroups[NodeType.DATA], ...typeGroups[NodeType.TOOL]].forEach((n, i) => {
      newNodes.push({
        id: `n-${Date.now()}-${i}`,
        label: n.label,
        description: n.description,
        type: n.type as NodeType,
        position: { x: 100, y: 100 + i * 200 },
        instructions: n.instructions
      });
    });

    // Layout Agents & Humans in Middle
    [...typeGroups[NodeType.AGENT], ...typeGroups[NodeType.HUMAN]].forEach((n, i) => {
      newNodes.push({
        id: `n-${Date.now()}-${i + 100}`,
        label: n.label,
        description: n.description,
        type: n.type as NodeType,
        position: { x: 600, y: 100 + i * 250 },
        instructions: n.instructions
      });
    });

    // Layout Goals on Right
    typeGroups[NodeType.GOAL].forEach((n, i) => {
      newNodes.push({
        id: `n-${Date.now()}-${i + 200}`,
        label: n.label,
        description: n.description,
        type: n.type as NodeType,
        position: { x: 1100, y: 200 + i * 200 },
        instructions: n.instructions
      });
    });

    setNodes(newNodes);

    // Create edges
    (design.connections || []).forEach((conn, i) => {
        const source = newNodes.find(n => n.label === conn.from);
        const target = newNodes.find(n => n.label === conn.to);
        if (source && target) {
            newEdges.push({
                id: `e-${Date.now()}-${i}`,
                source: source.id,
                target: target.id,
                label: conn.relation
            });
        }
    });
    setEdges(newEdges);
    
    // Center the view
    setViewport({ x: 50, y: 50, zoom: 0.8 });
  };

  // Node Management
  const handleAddNode = (type: NodeType, pos?: {x: number, y: number}, label?: string, desc?: string, instructions?: string) => {
    const position = pos || { x: -viewport.x / viewport.zoom + 400, y: -viewport.y / viewport.zoom + 300 };
    const newNode: NodeData = {
      id: `n-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      label: label || `New ${type}`,
      description: desc || 'Description here...',
      position,
      instructions: instructions || (type === NodeType.AGENT ? 'You are a helpful agent...' : undefined)
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    return newNode;
  };

  const handleQuickAdd = (type: NodeType) => {
    if (!quickAddMenu) return;
    const newNode = handleAddNode(type, { x: quickAddMenu.x, y: quickAddMenu.y });
    
    setEdges(prev => [...prev, {
        id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: quickAddMenu.sourceId,
        target: newNode.id,
        label: 'connects to'
    }]);
    
    setQuickAddMenu(null);
  };

  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const handleUpdateNode = (id: string, field: keyof NodeData, value: any) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const handleNodeResize = (id: string, width: number, height: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, width, height } : n));
  };

  const handleRemoveConnection = (edgeId: string) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
  };

  const handleUpdateEdge = (edgeId: string, label: string) => {
    setEdges(prev => prev.map(e => e.id === edgeId ? { ...e, label } : e));
  };

  const handleExport = () => {
    const patternName = detectedPattern?.name || "Custom Architecture";
    const patternDesc = detectedPattern?.desc || "No description available.";

    let content = `# Agent Context Lattice Blueprint\n\n`;
    content += `**Project:** ${requirements.projectName}\n`;
    content += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;
    content += `## Orchestration Pattern: ${patternName}\n`;
    content += `> ${patternDesc}\n\n`;

    content += `## Lattice Nodes\n\n`;
    
    nodes.forEach(node => {
        content += `### [${node.type}] ${node.label}\n`;
        content += `- **Description:** ${node.description || 'N/A'}\n`;
        if(node.instructions) content += `- **System Prompt / Instructions:**\n\`\`\`\n${node.instructions}\n\`\`\`\n`;
        content += `\n`;
    });

    content += `## Connectivity\n\n`;
    edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        if (source && target) {
            content += `- **${source.label}** --(${edge.label || 'connects'})--> **${target.label}**\n`;
        }
    });
    
    content += `\n---\nDesigned with Context Lattice`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Agent_Context_Lattice.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Canvas Interaction Handlers ---

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
      if (viewMode !== 'canvas') return;
      if (e.button === 0 || e.button === 1) { 
          setIsPanning(true);
          setLastMousePos({ x: e.clientX, y: e.clientY });
          setSelectedNodeId(null);
          setQuickAddMenu(null);
      }
  };

  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    if (viewMode !== 'canvas') return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    setDragOffset({
      x: worldPos.x - node.position.x,
      y: worldPos.y - node.position.y
    });
    setDraggedNodeId(nodeId);
    setQuickAddMenu(null);
  };

  const handleConnectStart = (e: React.MouseEvent, nodeId: string) => {
      setConnectingNodeId(nodeId);
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setMouseWorldPos(worldPos);
      setQuickAddMenu(null);
  };

  const handleConnectEnd = (e: React.MouseEvent, targetId: string) => {
      // Capture the source ID from state
      const sourceId = connectingNodeId;
      
      if (sourceId && sourceId !== targetId) {
          setEdges(prevEdges => {
              const exists = prevEdges.some(e => e.source === sourceId && e.target === targetId);
              if (exists) return prevEdges;

              return [...prevEdges, {
                  id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  source: sourceId,
                  target: targetId,
                  label: 'connects to'
              }];
          });
      }
      setConnectingNodeId(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (viewMode !== 'canvas') return;
    if (isPanning) {
        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;
        setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        setLastMousePos({ x: e.clientX, y: e.clientY });
        return;
    }

    const worldPos = screenToWorld(e.clientX, e.clientY);
    setMouseWorldPos(worldPos);

    if (draggedNodeId) {
      setNodes(prev => prev.map(n => 
        n.id === draggedNodeId ? { ...n, position: { x: worldPos.x - dragOffset.x, y: worldPos.y - dragOffset.y } } : n
      ));
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (viewMode !== 'canvas') return;
    
    if (isPanning) {
        setIsPanning(false);
    }
    
    // Always clear dragged node state to prevent sticky nodes
    setDraggedNodeId(null);

    // Only open QuickAdd if we dropped on the canvas, NOT on an existing node
    // We check this by seeing if the target is part of a draggable node
    const isOverNode = (e.target as Element).closest('.draggable-node');

    if (connectingNodeId && !isOverNode) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        setQuickAddMenu({ x: worldPos.x - 100, y: worldPos.y - 50, sourceId: connectingNodeId });
    }
    
    setConnectingNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
      if (viewMode !== 'canvas') return;
      const zoomSpeed = 0.001;
      const newZoom = Math.min(Math.max(viewport.zoom - e.deltaY * zoomSpeed, 0.1), 3);
      setViewport(prev => ({ ...prev, zoom: newZoom }));
  };
  
  const handleZoomIn = () => {
    setViewport(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.1, 3) }));
  };

  const handleZoomOut = () => {
    setViewport(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.1, 0.1) }));
  };

  const handleFitView = () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  };

  // Services
  const runSimulation = async () => {
    if (!simScenario.trim()) return;
    setSimLoading(true);
    setSimResult(null);
    const result = await simulateAgentRun(nodes, edges, simScenario);
    setSimResult(result);
    setSimLoading(false);
  };

  const runOptimization = async () => {
    setOptLoading(true);
    setShowOptimizer(true);
    const result = await optimizeArchitecture(nodes, requirements);
    setOptimizationResult(result);
    setOptLoading(false);
  };

  const runComparison = async () => {
      setCompLoading(true);
      setShowComparison(true);
      const result = await compareOrchestrationPatterns(requirements, nodes, edges);
      setComparisonResult(result);
      setCompLoading(false);
  };

  const handleApplyPattern = async (patternName: string) => {
      setApplyingPattern(patternName);
      const design = await generateArchitecture(requirements, patternName);
      
      if (design && design.nodes.length > 0) {
          setDetectedPattern({ name: design.pattern, desc: design.patternDescription });
          autoLayout(design);
          setShowComparison(false);
      } else {
          alert("Failed to apply the pattern. Please try again.");
      }
      setApplyingPattern(null);
  };
  
  const getScoreColor = (score: number) => {
      if (score >= 80) return 'text-[#2E7D32] border-[#2E7D32]';
      if (score >= 60) return 'text-[#F57C00] border-[#F57C00]';
      return 'text-[#C62828] border-[#C62828]';
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex h-screen w-full bg-[#1A1A1A] overflow-hidden relative font-sans text-sm">
      {/* Sidebar / Toolbar */}
      <div className="w-80 bg-[#2A2A2A] border-r border-[#333333] flex flex-col z-30 shadow-2xl h-full" onMouseUp={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-[#333333] flex items-center justify-between shrink-0">
          <span className="font-bold text-[#FFFFFF] text-xs tracking-widest uppercase">Design Studio</span>
          <button onClick={onBack} className="text-[#808080] hover:text-white text-xs">Exit</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {loading ? (
                 <div className="flex flex-col items-center justify-center h-40 space-y-4">
                     <div className="w-8 h-8 border-2 border-[#D4B980] border-t-transparent rounded-full animate-spin"></div>
                     <p className="text-[#808080] text-xs animate-pulse">Generating Architecture...</p>
                 </div>
            ) : selectedNode ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-200">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#D4B980] uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D4B980]"></span> Selected Node
                        </span>
                        <button 
                            onClick={() => handleDeleteNode(selectedNode.id)}
                            className="text-[#C62828] hover:text-red-400 text-xs font-medium"
                        >
                            Delete
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-[#808080] font-semibold">Label</label>
                            <input 
                                type="text" 
                                value={selectedNode.label}
                                onChange={(e) => handleUpdateNode(selectedNode.id, 'label', e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-white focus:border-[#2A5F8C] outline-none"
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-xs text-[#808080] font-semibold">Type</label>
                            <select 
                                value={selectedNode.type}
                                onChange={(e) => handleUpdateNode(selectedNode.id, 'type', e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-white focus:border-[#2A5F8C] outline-none"
                            >
                                {Object.values(NodeType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-[#808080] font-semibold">Description</label>
                            <textarea 
                                value={selectedNode.description || ''}
                                onChange={(e) => handleUpdateNode(selectedNode.id, 'description', e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-[#B8B8B8] focus:border-[#2A5F8C] outline-none min-h-[80px]"
                            />
                        </div>

                        {selectedNode.type === NodeType.AGENT && (
                            <div className="space-y-1">
                                <label className="text-xs text-[#808080] font-semibold">System Instructions</label>
                                <textarea 
                                    value={selectedNode.instructions || ''}
                                    onChange={(e) => handleUpdateNode(selectedNode.id, 'instructions', e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-[#D4B980] font-mono text-xs focus:border-[#D4B980] outline-none min-h-[150px]"
                                    placeholder="Define agent persona and rules..."
                                />
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-[#333333]">
                        <label className="block text-xs font-bold text-[#808080] uppercase tracking-wider mb-3">Outgoing Edges</label>
                        <div className="space-y-2">
                            {(edges || []).filter(e => e.source === selectedNode.id).map(edge => {
                                const target = nodes.find(n => n.id === edge.target);
                                return (
                                    <div key={edge.id} className="bg-[#1A1A1A] p-3 rounded border border-[#333333]">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-[#FFFFFF]">→ {target?.label}</span>
                                            <button onClick={() => handleRemoveConnection(edge.id)} className="text-[#808080] hover:text-[#C62828]">×</button>
                                        </div>
                                        <input 
                                            type="text"
                                            value={edge.label || ''}
                                            onChange={(e) => handleUpdateEdge(edge.id, e.target.value)}
                                            className="w-full bg-[#2A2A2A] border border-[#333333] rounded px-2 py-1 text-xs text-[#B8B8B8] focus:border-[#D4B980] outline-none"
                                            placeholder="Relation..."
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    <div>
                        <h3 className="text-xs font-bold text-[#808080] uppercase tracking-wider mb-4">Lattice Components</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[NodeType.AGENT, NodeType.TOOL, NodeType.DATA, NodeType.GOAL, NodeType.HUMAN].map(type => (
                                <button
                                    key={type}
                                    onClick={() => handleAddNode(type)}
                                    className="flex flex-col items-center justify-center p-4 bg-[#1A1A1A] hover:bg-[#333333] hover:border-[#D4B980] border border-[#333333] rounded-lg transition-all group"
                                >
                                    <span className="text-xl mb-2 group-hover:scale-110 transition-transform text-[#D4B980]">
                                        <NodeIcon type={type} className="w-8 h-8" />
                                    </span>
                                    <span className="text-[10px] font-bold text-[#B8B8B8] group-hover:text-white uppercase">{type}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-[#2A5F8C]/5 border border-[#2A5F8C]/20 p-5 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[#D4B980]">✨</span>
                            <h3 className="text-xs font-bold text-[#D4B980] uppercase tracking-wider">Lattice Optimizer</h3>
                        </div>
                        <p className="text-xs text-[#B8B8B8] mb-4 leading-relaxed">Analyze the graph for gaps and suggest improvements.</p>
                        <button 
                            onClick={runOptimization}
                            className="w-full bg-[#2A5F8C] hover:bg-[#1A3F5C] text-white py-2 px-4 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-[#2A5F8C]/20"
                        >
                           Run Analysis
                        </button>
                    </div>

                    {/* Orchestration Pattern Section */}
                    <div className="bg-[#2A5F8C]/5 border border-[#2A5F8C]/20 p-1 rounded-xl">
                        <button
                            onClick={() => setIsPatternPanelOpen(!isPatternPanelOpen)}
                            className="w-full flex items-center justify-between p-3 hover:bg-[#2A5F8C]/10 rounded-lg transition-colors group"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[#D4B980] group-hover:scale-110 transition-transform">🎼</span>
                                <span className="text-xs font-bold text-[#D4B980] uppercase tracking-wider">Review Orchestration Pattern</span>
                            </div>
                            <span className="text-[#2A5F8C] text-xs">{isPatternPanelOpen ? '▼' : '▶'}</span>
                        </button>
                        
                        {isPatternPanelOpen && (
                            <div className="px-3 pb-3 pt-1 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                                <div>
                                    <label className="text-[10px] text-[#808080] font-bold uppercase block mb-1">Pattern Strategy</label>
                                    <div className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4B980]"></span>
                                        {detectedPattern?.name || "Custom Architecture"}
                                    </div>
                                    <p className="text-[10px] text-[#B8B8B8] leading-relaxed bg-[#1A1A1A] p-2 rounded border border-[#333333]/50">
                                        {detectedPattern?.desc || "No pattern description available."}
                                    </p>
                                </div>
                                
                                <button 
                                    onClick={runComparison}
                                    className="w-full bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A5F8C]/30 text-[#2A5F8C] hover:text-[#D4B980] py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    <CompareIcon className="w-4 h-4"/>
                                    Compare Patterns
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
        
        {/* Updated Bottom Navigation Buttons */}
        <div className="p-4 border-t border-[#333333] bg-[#2A2A2A] space-y-3 shrink-0" onMouseUp={(e) => e.stopPropagation()}>
           
           <button 
             onClick={handleExport}
             className="w-full bg-[#333333] hover:bg-[#4A4A4A] text-[#E8E8E8] py-2 px-3 rounded-lg font-bold transition-colors text-[10px] uppercase tracking-wider border border-[#4A4A4A] flex items-center justify-center gap-2"
           >
             <span>📄</span> Export Lattice Architecture Plan
           </button>

           <button 
             onClick={() => setShowSimulator(true)}
             className="w-full bg-[#D4B980] hover:bg-[#C4A870] text-[#1A1A1A] py-3 px-3 rounded-lg font-bold transition-transform hover:-translate-y-0.5 shadow-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-2"
           >
             <PlayIcon className="w-5 h-5"/>
             <span>Simulate Architecture</span>
           </button>

           <button 
             onClick={() => onNext(nodes, edges)}
             className="w-full bg-[#2A5F8C] hover:bg-[#1A3F5C] text-white py-3 px-4 rounded-lg font-bold transition-colors text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 border border-[#FFFFFF]/10"
           >
             <RoadmapIcon className="w-5 h-5"/>
             <span>Generate Project Plan</span>
           </button>

        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 relative overflow-hidden bg-[#1A1A1A] flex flex-col">
          
        {/* View Switcher Controls */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-[#2A2A2A] border border-[#333333] p-1 rounded-lg flex items-center shadow-lg">
            <button 
                onClick={() => setViewMode('canvas')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${viewMode === 'canvas' ? 'bg-[#D4B980] text-[#1A1A1A] shadow' : 'text-[#808080] hover:text-white'}`}
            >
                <GraphIcon className="w-4 h-4" /> Canvas
            </button>
            <button 
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-[#D4B980] text-[#1A1A1A] shadow' : 'text-[#808080] hover:text-white'}`}
            >
                <TableIcon className="w-4 h-4" /> Table
            </button>
        </div>

        {viewMode === 'canvas' ? (
            <div 
                ref={canvasRef}
                className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDownCanvas}
                onMouseMove={handleMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onWheel={handleWheel}
            >
                {/* Background Grid */}
                <div 
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, #808080 1px, transparent 1px)',
                    backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
                    transform: `translate(${viewport.x}px, ${viewport.y}px)`
                }}
                />

                {/* Empty State */}
                {!loading && nodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="bg-[#2A2A2A] border border-[#333333] p-8 rounded-2xl max-w-md text-center pointer-events-auto shadow-2xl">
                            <div className="w-16 h-16 bg-[#2A5F8C]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#D4B980] text-3xl">
                                <LatticeIcon className="w-8 h-8"/>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                {generationError ? "Generation Failed" : "Empty Lattice"}
                            </h3>
                            <p className="text-[#808080] mb-6 text-sm">
                                {generationError 
                                    ? "The AI could not generate an architecture from the provided requirements." 
                                    : "Start by adding nodes manually or try regenerating from requirements."}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button 
                                    onClick={initArchitecture}
                                    className="bg-[#D4B980] hover:bg-[#C4A870] text-[#1A1A1A] px-4 py-2 rounded-lg font-bold text-sm"
                                >
                                    Retry Generation
                                </button>
                                <button 
                                    onClick={() => handleAddNode(NodeType.AGENT)}
                                    className="bg-[#333333] hover:bg-[#4A4A4A] text-white px-4 py-2 rounded-lg font-bold text-sm"
                                >
                                    Add Manual Node
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Viewport Transform Container */}
                <div 
                style={{
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                    transformOrigin: '0 0',
                    width: '100%',
                    height: '100%'
                }}
                >
                {/* Connection Lines - ADDED overflow-visible to SVG */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
                    <svg className="w-full h-full overflow-visible">
                    {edges.map(edge => {
                    const source = nodes.find(n => n.id === edge.source);
                    const target = nodes.find(n => n.id === edge.target);
                    return <ConnectionLine key={edge.id} edge={edge} sourceNode={source} targetNode={target} />;
                    })}
                    
                    {connectingNodeId && (
                        <ConnectionLine 
                            sourceNode={nodes.find(n => n.id === connectingNodeId)} 
                            targetPos={mouseWorldPos}
                        />
                    )}
                    </svg>
                </div>

                {/* Nodes */}
                {nodes.map(node => (
                    <DraggableNode
                    key={node.id}
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    onMouseDown={handleMouseDownNode}
                    onSelect={setSelectedNodeId}
                    onConnectStart={handleConnectStart}
                    onConnectEnd={handleConnectEnd}
                    onResize={handleNodeResize}
                    />
                ))}
                </div>
            </div>
        ) : (
            <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-[#151515]">
                <div className="max-w-5xl mx-auto space-y-8">
                    <div>
                        <h3 className="text-sm font-bold text-[#808080] uppercase tracking-widest mb-4">Node Configuration</h3>
                        <div className="bg-[#2A2A2A] border border-[#333333] rounded-xl overflow-hidden shadow-lg">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#333333] text-[#D4B980] uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">Type</th>
                                        <th className="px-6 py-4 font-bold">Label</th>
                                        <th className="px-6 py-4 font-bold">Description</th>
                                        <th className="px-6 py-4 font-bold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#333333]">
                                    {nodes.map(node => (
                                        <tr 
                                            key={node.id} 
                                            onClick={() => setSelectedNodeId(node.id)}
                                            className={`hover:bg-[#333333]/50 transition-colors cursor-pointer ${selectedNodeId === node.id ? 'bg-[#2A5F8C]/10 border-l-4 border-[#2A5F8C]' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <NodeIcon type={node.type} className="w-5 h-5 text-[#808080]" />
                                                    <span className="font-mono text-xs text-[#E8E8E8] opacity-80">{node.type}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-white">{node.label}</td>
                                            <td className="px-6 py-4 text-[#B8B8B8] max-w-xs truncate">{node.description}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                                                    className="text-[#C62828] hover:text-red-400 text-xs font-bold"
                                                >
                                                    DELETE
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {nodes.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-[#808080] italic">No nodes defined.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-[#808080] uppercase tracking-widest mb-4">Connectivity Map</h3>
                        <div className="bg-[#2A2A2A] border border-[#333333] rounded-xl overflow-hidden shadow-lg">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#333333] text-[#D4B980] uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">Source</th>
                                        <th className="px-6 py-4 font-bold">Relationship</th>
                                        <th className="px-6 py-4 font-bold">Target</th>
                                        <th className="px-6 py-4 font-bold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#333333]">
                                    {edges.map(edge => {
                                        const source = nodes.find(n => n.id === edge.source);
                                        const target = nodes.find(n => n.id === edge.target);
                                        return (
                                            <tr key={edge.id} className="hover:bg-[#333333]/50 transition-colors">
                                                <td className="px-6 py-4 text-white font-medium">{source?.label || 'Unknown'}</td>
                                                <td className="px-6 py-4 text-[#2A5F8C] font-mono text-xs">{edge.label || 'connects to'}</td>
                                                <td className="px-6 py-4 text-white font-medium">{target?.label || 'Unknown'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => handleRemoveConnection(edge.id)}
                                                        className="text-[#808080] hover:text-[#C62828] text-xl leading-none"
                                                    >
                                                        ×
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {edges.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-[#808080] italic">No connections defined.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        )}
          
      {/* Zoom Controls - Positioned Higher */}
      {viewMode === 'canvas' && (
        <div className="absolute top-6 right-6 pointer-events-auto flex items-center gap-4 z-40">
            <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg flex overflow-hidden shadow-xl">
                <button onClick={handleZoomOut} className="p-3 hover:bg-[#333333] text-[#E8E8E8] border-r border-[#333333]">-</button>
                <button onClick={handleFitView} className="px-4 py-3 hover:bg-[#333333] text-[#D4B980] text-xs font-bold">
                    {Math.round(viewport.zoom * 100)}%
                </button>
                <button onClick={handleZoomIn} className="p-3 hover:bg-[#333333] text-[#E8E8E8] border-l border-[#333333]">+</button>
            </div>
        </div>
      )}
      
      {/* Quick Add Menu */}
      {quickAddMenu && viewMode === 'canvas' && (
          <div 
            className="absolute z-50 bg-[#2A2A2A] border border-[#333333] rounded-xl shadow-2xl p-2 grid grid-cols-3 gap-2 animate-in fade-in zoom-in-95"
            style={{ 
                left: (quickAddMenu.x * viewport.zoom) + viewport.x + canvasRef.current!.getBoundingClientRect().left, 
                top: (quickAddMenu.y * viewport.zoom) + viewport.y + canvasRef.current!.getBoundingClientRect().top
            }}
          >
              {[NodeType.AGENT, NodeType.TOOL, NodeType.DATA, NodeType.GOAL, NodeType.HUMAN].map(type => (
                  <button
                    key={type}
                    onClick={() => handleQuickAdd(type)}
                    className="flex flex-col items-center justify-center p-2 hover:bg-[#333333] rounded-lg transition-colors"
                  >
                     <NodeIcon type={type} className="w-5 h-5 text-[#D4B980] mb-1"/>
                     <span className="text-[8px] font-bold text-[#B8B8B8] uppercase">{type}</span>
                  </button>
              ))}
          </div>
      )}

      {/* Lattice Optimizer Modal */}
      {showOptimizer && (
          <div className="absolute inset-0 z-50 bg-[#000000]/80 backdrop-blur-md flex items-center justify-center p-6" onMouseUp={(e) => e.stopPropagation()}>
               <div className="bg-[#1A1A1A] border border-[#333333] w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                   <div className="p-6 border-b border-[#333333] flex justify-between items-center bg-[#2A2A2A]">
                       <h2 className="text-xl font-bold text-white flex items-center gap-3">
                           <span>✨</span> Lattice Optimizer
                       </h2>
                       <button onClick={() => setShowOptimizer(false)} className="text-[#808080] hover:text-white text-xl">✕</button>
                   </div>
                   
                   <div className="p-8 flex-1 overflow-y-auto bg-[#151515] custom-scrollbar">
                        {optLoading ? (
                             <div className="flex flex-col items-center justify-center py-20 gap-6">
                                  <div className="w-16 h-16 border-4 border-[#2A5F8C]/20 border-t-[#2A5F8C] rounded-full animate-spin"></div>
                                  <p className="text-[#2A5F8C] text-sm font-mono tracking-wider animate-pulse uppercase">Optimizing Topology...</p>
                             </div>
                        ) : optimizationResult ? (
                             <div className="space-y-8">
                                  {/* Analysis Summary */}
                                  <div className="bg-[#2A2A2A] border border-[#333333] rounded-xl p-6">
                                      <h3 className="text-sm font-bold text-[#808080] uppercase tracking-wider mb-2">Analysis</h3>
                                      <p className="text-white leading-relaxed">{optimizationResult.analysis}</p>
                                  </div>

                                  {/* Strategic Recommendations Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      
                                      {/* Context Gaps - Warning */}
                                      <div className="space-y-4">
                                          <h4 className="text-xs font-bold text-[#F57C00] uppercase tracking-wider border-b border-[#F57C00]/30 pb-2">Missing Context</h4>
                                          <ul className="space-y-3">
                                              {optimizationResult.contextGaps?.length > 0 ? (
                                                  optimizationResult.contextGaps.map((gap, i) => (
                                                      <li key={i} className="bg-[#F57C00]/10 border border-[#F57C00]/20 p-3 rounded-lg text-sm text-[#E8E8E8]">
                                                          {gap}
                                                      </li>
                                                  ))
                                              ) : (
                                                  <li className="text-[#808080] text-sm italic">No major context gaps detected.</li>
                                              )}
                                          </ul>
                                      </div>

                                      {/* Simplifications - Success */}
                                      <div className="space-y-4">
                                          <h4 className="text-xs font-bold text-[#2E7D32] uppercase tracking-wider border-b border-[#2E7D32]/30 pb-2">Simplifications</h4>
                                          <ul className="space-y-3">
                                              {optimizationResult.simplifications?.length > 0 ? (
                                                  optimizationResult.simplifications.map((item, i) => (
                                                      <li key={i} className="bg-[#2E7D32]/10 border border-[#2E7D32]/20 p-3 rounded-lg text-sm text-[#E8E8E8]">
                                                          {item}
                                                      </li>
                                                  ))
                                              ) : (
                                                  <li className="text-[#808080] text-sm italic">Architecture is already efficient.</li>
                                              )}
                                          </ul>
                                      </div>

                                      {/* Improvements - Info */}
                                      <div className="space-y-4">
                                          <h4 className="text-xs font-bold text-[#2A5F8C] uppercase tracking-wider border-b border-[#2A5F8C]/30 pb-2">Smart Improvements</h4>
                                          <ul className="space-y-3">
                                              {optimizationResult.improvements?.length > 0 ? (
                                                  optimizationResult.improvements.map((item, i) => (
                                                      <li key={i} className="bg-[#2A5F8C]/10 border border-[#2A5F8C]/20 p-3 rounded-lg text-sm text-[#E8E8E8]">
                                                          {item}
                                                      </li>
                                                  ))
                                              ) : (
                                                  <li className="text-[#808080] text-sm italic">No specific improvements found.</li>
                                              )}
                                          </ul>
                                      </div>
                                  </div>

                                  {/* Suggested Nodes */}
                                  <div>
                                      <h3 className="text-sm font-bold text-[#D4B980] uppercase tracking-wider mb-4 border-b border-[#333333] pb-2">Suggested Components</h3>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {(optimizationResult.suggestedNodes || []).map((node, idx) => (
                                              <div key={idx} className="bg-[#2A2A2A] border border-[#333333] rounded-xl p-4 flex flex-col justify-between group hover:border-[#D4B980] transition-colors">
                                                  <div>
                                                      <div className="flex justify-between items-start mb-2">
                                                          <h4 className="font-bold text-white text-base">{node.label}</h4>
                                                          <span className="text-[10px] font-bold bg-[#1A1A1A] px-2 py-1 rounded text-[#808080] uppercase">{node.type}</span>
                                                      </div>
                                                      <p className="text-xs text-[#B8B8B8] mb-3 leading-relaxed">{node.description}</p>
                                                      <p className="text-[10px] text-[#D4B980] italic border-l-2 border-[#D4B980] pl-2 mb-4">Why: {node.reason}</p>
                                                  </div>
                                                  <button
                                                      onClick={() => {
                                                          handleAddNode(node.type, undefined, node.label, node.description, node.instructions);
                                                          setShowOptimizer(false);
                                                      }}
                                                      className="w-full bg-[#1A1A1A] hover:bg-[#333333] text-white py-2 rounded-lg text-xs font-bold border border-[#333333] group-hover:border-[#D4B980] transition-all"
                                                  >
                                                      + Add to Canvas
                                                  </button>
                                              </div>
                                          ))}
                                          {optimizationResult.suggestedNodes?.length === 0 && (
                                              <p className="text-[#808080] italic col-span-2 text-center py-4">No new nodes recommended.</p>
                                          )}
                                      </div>
                                  </div>
                             </div>
                        ) : (
                             <div className="text-center text-[#808080] py-20 italic">
                                  Optimization failed to return results.
                             </div>
                        )}
                   </div>
                   
                   <div className="p-6 border-t border-[#333333] bg-[#2A2A2A] flex justify-end">
                       <button onClick={() => setShowOptimizer(false)} className="bg-[#D4B980] hover:bg-[#C4A870] text-[#1A1A1A] px-6 py-2.5 rounded-lg font-bold transition-colors shadow-lg">
                           Done
                       </button>
                   </div>
               </div>
          </div>
      )}

      {/* Simulator Modal */}
      {showSimulator && (
          <div className="absolute inset-0 z-50 bg-[#000000]/80 backdrop-blur-md flex items-center justify-center p-6" onMouseUp={(e) => e.stopPropagation()}>
              <div className="bg-[#1A1A1A] border border-[#333333] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
                  <div className="p-6 border-b border-[#333333] flex justify-between items-center bg-[#2A2A2A]">
                      <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <span className="text-[#D4B980]"><PlayIcon className="w-6 h-6"/></span>
                        Architecture Simulator
                      </h2>
                      <button onClick={() => setShowSimulator(false)} className="text-[#808080] hover:text-white text-xl">✕</button>
                  </div>
                  
                  <div className="p-6 border-b border-[#333333] bg-[#2A2A2A]/50">
                      <label className="text-xs font-bold text-[#808080] uppercase tracking-wider mb-2 block">Simulation Scenario</label>
                      <div className="flex gap-4">
                          <input 
                            type="text" 
                            value={simScenario}
                            onChange={(e) => setSimScenario(e.target.value)}
                            className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-3 text-white focus:border-[#D4B980] outline-none placeholder-[#4A4A4A]"
                            placeholder="e.g. User asks for a refund on a recent order..."
                            onKeyDown={(e) => e.key === 'Enter' && runSimulation()}
                          />
                          <button 
                             onClick={runSimulation}
                             disabled={simLoading}
                             className="bg-[#D4B980] hover:bg-[#C4A870] disabled:opacity-50 text-[#1A1A1A] font-bold px-6 py-2 rounded-lg transition-colors shadow-lg flex items-center gap-2 whitespace-nowrap"
                          >
                             {simLoading ? (
                                <span className="animate-spin">⏳</span>
                             ) : <PlayIcon className="w-4 h-4"/>}
                             {simLoading ? 'Running...' : 'Run'}
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 bg-[#151515] relative">
                      {simResult ? (
                          <div className="space-y-8 relative">
                              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[#333333]"></div>
                              {(simResult || []).map((step, idx) => (
                                  <div key={idx} className="relative pl-20 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 100}ms` }}>
                                      <div className={`absolute left-5 top-0 w-6 h-6 rounded-full border-4 z-10 bg-[#1A1A1A] flex items-center justify-center ${
                                          step.status === 'error' ? 'border-[#C62828] text-[#C62828]' : 
                                          step.status === 'warning' ? 'border-[#F57C00] text-[#F57C00]' : 
                                          'border-[#2A5F8C] text-[#2A5F8C]'
                                      }`}>
                                      </div>
                                      
                                      <div className="bg-[#2A2A2A] border border-[#333333] rounded-xl p-5 shadow-lg relative">
                                          <div className="absolute top-4 right-4 opacity-10">
                                              <NodeIcon type={step.nodeType} className="w-12 h-12"/>
                                          </div>
                                          
                                          <div className="flex items-center gap-3 mb-2">
                                              <span className="text-xs font-bold text-[#808080] bg-[#1A1A1A] px-2 py-1 rounded uppercase tracking-wider">Step {step.step}</span>
                                              <span className="text-sm font-bold text-[#D4B980]">{step.actor}</span>
                                          </div>
                                          
                                          <h4 className="text-white font-bold mb-1">{step.action}</h4>
                                          <p className="text-sm text-[#B8B8B8] leading-relaxed">{step.details}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full text-[#4A4A4A] space-y-4">
                              <div className="text-4xl opacity-20"><PlayIcon className="w-16 h-16"/></div>
                              <p>Enter a scenario to watch your agents in action.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Comparison Modal */}
      {showComparison && (
          <div className="absolute inset-0 z-50 bg-[#000000]/80 backdrop-blur-md flex items-center justify-center p-6" onMouseUp={(e) => e.stopPropagation()}>
              <div className="bg-[#1A1A1A] border border-[#333333] w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-[#333333] flex justify-between items-center bg-[#2A2A2A]">
                      <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <CompareIcon className="w-6 h-6 text-[#2A5F8C]" />
                        <span>Pattern Comparative Analysis</span>
                      </h2>
                      <button onClick={() => setShowComparison(false)} className="text-[#808080] hover:text-white text-xl">✕</button>
                  </div>
                  
                  <div className="p-8 flex-1 overflow-y-auto bg-[#151515] custom-scrollbar">
                      {compLoading ? (
                           <div className="flex flex-col items-center justify-center py-20 gap-6">
                                <div className="w-16 h-16 border-4 border-[#2A5F8C]/20 border-t-[#2A5F8C] rounded-full animate-spin"></div>
                                <p className="text-[#2A5F8C] text-sm font-mono tracking-wider animate-pulse uppercase">Evaluating Alternatives...</p>
                           </div>
                      ) : comparisonResult ? (
                          <div className="space-y-12">
                               {/* Current Architecture Dashboard */}
                               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                   {/* Score & Summary */}
                                   <div className="lg:col-span-4 bg-[#2A2A2A] border border-[#333333] rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
                                       <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                           <LatticeIcon className="w-32 h-32 text-[#D4B980]" />
                                       </div>
                                       <div>
                                           <div className="text-[10px] font-bold text-[#808080] uppercase tracking-wider mb-2">Current Architecture</div>
                                           <h3 className="text-2xl font-bold text-white mb-4">{comparisonResult.current.patternName}</h3>
                                           <p className="text-sm text-[#B8B8B8] leading-relaxed">{comparisonResult.current.summary}</p>
                                       </div>
                                       
                                       <div className="mt-8 flex items-center gap-4">
                                           <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-xl font-bold ${getScoreColor(comparisonResult.current.score)}`}>
                                               {comparisonResult.current.score}
                                           </div>
                                           <div>
                                               <div className="text-xs font-bold text-[#E8E8E8] uppercase tracking-wide">Robustness Score</div>
                                               <div className="text-[10px] text-[#808080]">Based on cohesion & clarity</div>
                                           </div>
                                       </div>
                                   </div>

                                   {/* Characteristics */}
                                   <div className="lg:col-span-3 bg-[#2A2A2A] border border-[#333333] rounded-xl p-6">
                                       <h4 className="text-[10px] font-bold text-[#808080] uppercase tracking-wider mb-4">Key Characteristics</h4>
                                       <div className="flex flex-wrap gap-2">
                                           {(comparisonResult.current.characteristics || []).map((char, i) => (
                                               <span key={i} className="bg-[#1A1A1A] border border-[#333333] px-3 py-1.5 rounded-lg text-xs text-[#E8E8E8] hover:border-[#D4B980]/50 transition-colors cursor-default">
                                                   {char}
                                               </span>
                                           ))}
                                       </div>
                                   </div>

                                   {/* Pros & Cons */}
                                   <div className="lg:col-span-5 grid grid-rows-2 gap-4">
                                       <div className="bg-[#2E7D32]/10 border border-[#2E7D32]/20 rounded-xl p-4">
                                           <h4 className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-wider mb-2">Strengths</h4>
                                           <ul className="space-y-1">
                                               {(comparisonResult.current.pros || []).slice(0, 3).map((pro, i) => (
                                                   <li key={i} className="flex gap-2 text-xs text-[#E8E8E8]"><span className="text-[#2E7D32]">+</span> {pro}</li>
                                               ))}
                                           </ul>
                                       </div>
                                       <div className="bg-[#C62828]/10 border border-[#C62828]/20 rounded-xl p-4">
                                           <h4 className="text-[10px] font-bold text-[#C62828] uppercase tracking-wider mb-2">Weaknesses</h4>
                                           <ul className="space-y-1">
                                               {(comparisonResult.current.cons || []).slice(0, 3).map((con, i) => (
                                                   <li key={i} className="flex gap-2 text-xs text-[#E8E8E8]"><span className="text-[#C62828]">-</span> {con}</li>
                                               ))}
                                           </ul>
                                       </div>
                                   </div>
                               </div>

                               {/* Alternatives */}
                               <div>
                                   <div className="flex items-center gap-4 mb-6">
                                       <h3 className="text-sm font-bold text-[#808080] uppercase tracking-wider">Alternative Strategies</h3>
                                       <div className="h-[1px] flex-1 bg-[#333333]"></div>
                                   </div>
                                   
                                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                       {(comparisonResult.alternatives || []).map((alt, idx) => (
                                           <div key={idx} className="bg-[#2A2A2A] border border-[#333333] rounded-xl overflow-hidden hover:border-[#2A5F8C] hover:shadow-lg hover:shadow-[#2A5F8C]/10 transition-all group flex flex-col h-full">
                                               <div className="p-5 border-b border-[#333333] bg-[#333333]/20 flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-white text-base mb-1">{alt.patternName}</h4>
                                                        <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${alt.suitabilityScore > 80 ? 'bg-[#2E7D32]/20 text-[#2E7D32]' : alt.suitabilityScore > 50 ? 'bg-[#D4B980]/20 text-[#D4B980]' : 'bg-[#C62828]/20 text-[#C62828]'}`}>
                                                            {alt.suitabilityScore}% Match
                                                        </div>
                                                    </div>
                                                    <div className="text-[#808080] group-hover:text-white transition-colors">
                                                        <CompareIcon className="w-5 h-5" />
                                                    </div>
                                               </div>
                                               
                                               <div className="p-5 flex-1 flex flex-col gap-4">
                                                   <p className="text-xs text-[#B8B8B8] leading-relaxed line-clamp-3">{alt.description}</p>
                                                   
                                                   <div className="grid grid-cols-2 gap-4 mt-auto">
                                                       <div>
                                                           <span className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-wider block mb-1">Pros</span>
                                                           <div className="text-[10px] text-[#E8E8E8] opacity-80">{alt.pros[0]}</div>
                                                       </div>
                                                       <div>
                                                           <span className="text-[10px] font-bold text-[#C62828] uppercase tracking-wider block mb-1">Cons</span>
                                                           <div className="text-[10px] text-[#E8E8E8] opacity-80">{alt.cons[0]}</div>
                                                       </div>
                                                   </div>
                                               </div>

                                               <div className="p-4 bg-[#1A1A1A] border-t border-[#333333] space-y-3">
                                                    <p className="text-xs text-[#D4B980] italic leading-tight">
                                                        "{alt.recommendation}"
                                                    </p>
                                                    
                                                    <button
                                                      onClick={() => handleApplyPattern(alt.patternName)}
                                                      disabled={applyingPattern !== null}
                                                      className="w-full mt-2 bg-[#D4B980] hover:bg-[#C4A870] disabled:bg-[#333333] disabled:text-[#808080] text-[#1A1A1A] py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                                                    >
                                                        {applyingPattern === alt.patternName ? (
                                                            <>
                                                                <div className="w-3 h-3 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin"></div>
                                                                Re-Architecting...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <BuildIcon className="w-3 h-3" />
                                                                Implement this Pattern
                                                            </>
                                                        )}
                                                    </button>
                                               </div>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                          </div>
                      ) : (
                          <div className="text-center text-[#808080] py-20 italic">
                              Comparison unavailable.
                          </div>
                      )}
                  </div>
                  
                  <div className="p-6 border-t border-[#333333] bg-[#2A2A2A] flex justify-end">
                      <button 
                        onClick={() => setShowComparison(false)}
                        className="bg-[#2A2A2A] hover:bg-[#333333] border border-[#D4B980]/30 hover:border-[#D4B980] text-[#D4B980] py-2.5 px-6 rounded-lg font-bold transition-colors shadow-lg"
                      >
                          Close
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
