
import React, { useState, useEffect } from 'react';
import { ProjectRequirements, NodeData, Edge, ProjectPlan } from '../types';
import { generateProjectPlan } from '../services/agentService';
import { PlannerIcon, NodeIcon } from '../components/Icons';
import { ConfigureBanner } from '../components/ConfigureBanner';
import { useSettingsContext } from '../services/settings/SettingsContext';
import { useProjectContext } from '../services/project/ProjectContext';
import { createArtifact } from '../services/api/artifacts';

interface Props {
  requirements: ProjectRequirements;
  nodes: NodeData[];
  edges: Edge[];
  onBack: () => void;
}

export const ProjectPlanner: React.FC<Props> = ({ requirements, nodes, edges, onBack }) => {
  const { isConfigured } = useSettingsContext();
  const { currentProjectId } = useProjectContext();
  const hasFallbackKey = typeof process.env.API_KEY === 'string' && process.env.API_KEY.length > 0;
  const showBanner = !isConfigured && !hasFallbackKey;

  const [plan, setPlan] = useState<ProjectPlan | null>(null);
  const [loading, setLoading] = useState(!showBanner);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPlan = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await generateProjectPlan(requirements, nodes, edges);
      if (!result) {
        setErrorMessage('The model returned an empty plan. Please try again.');
        setPlan(null);
      } else {
        setPlan(result);
        if (currentProjectId) {
          createArtifact(currentProjectId, 'project_plan', result).catch((err) => {
            console.warn('[ProjectPlanner] failed to persist project_plan artifact (non-blocking):', err);
          });
        }
      }
    } catch (err: any) {
      const detail = err?.message ? String(err.message) : 'Unknown error while generating the plan.';
      setErrorMessage(detail);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showBanner) return;
    fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSeverityColor = (severity?: string | null) => {
    switch ((severity ?? '').toLowerCase()) {
      case 'critical': return 'text-[#C62828] bg-[#C62828]/10 border-[#C62828]';
      case 'high': return 'text-[#F57C00] bg-[#F57C00]/10 border-[#F57C00]';
      case 'medium': return 'text-[#D4B980] bg-[#D4B980]/10 border-[#D4B980]';
      default: return 'text-[#2E7D32] bg-[#2E7D32]/10 border-[#2E7D32]';
    }
  };

  const getComplexityBadge = (complexity?: string | null) => {
     switch ((complexity ?? '').toLowerCase()) {
         case 'high': return 'bg-[#C62828]/20 text-[#C62828] border border-[#C62828]/30';
         case 'medium': return 'bg-[#F57C00]/20 text-[#F57C00] border border-[#F57C00]/30';
         default: return 'bg-[#2E7D32]/20 text-[#2E7D32] border border-[#2E7D32]/30';
     }
  };

  const safeText = (value: unknown, fallback = 'N/A'): string => {
    if (value === null || value === undefined) return fallback;
    const s = String(value).trim();
    return s.length === 0 ? fallback : s;
  };

  const handleExportDoc = () => {
    if (!plan) return;

    let content = `# Project Execution Plan: ${requirements.projectName || 'Untitled Project'}\n`;
    content += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;

    content += `## Executive Summary\n`;
    content += `${safeText(plan.executiveSummary, 'No summary provided.')}\n\n`;

    content += `## Project Stats\n`;
    content += `- **Total Estimated Effort:** ${plan.totalEstimatedEffortHours != null ? `${plan.totalEstimatedEffortHours} Hours` : 'N/A'}\n`;
    content += `- **Estimated Duration:** ${safeText(plan.totalEstimatedDuration)}\n\n`;

    content += `## Phased Roadmap\n\n`;
    plan.phases?.forEach((phase, i) => {
        content += `### Phase ${i + 1}: ${safeText(phase.title, `Phase ${i + 1}`)}\n`;
        content += `**Duration:** ${safeText(phase.duration, 'N/A')}\n\n`;
        phase.tasks?.forEach(task => {
            content += `- **${safeText(task.title, 'Untitled Task')}** [${safeText(task.complexity, '—')}]\n`;
            content += `  - Assignee: ${safeText(task.assignee, '—')}\n`;
            content += `  - Effort: ${task.estimatedHours != null ? `${task.estimatedHours}h` : '—'}\n`;
            if (task.description) content += `  - Notes: ${task.description}\n`;
        });
        content += `\n`;
    });

    content += `## Resource Allocation\n`;
    plan.resources?.forEach(res => {
        content += `- **${safeText(res.name, 'Unnamed Resource')}** (${safeText(res.type, '—')})\n`;
        content += `  - Role: ${safeText(res.role, '—')}\n`;
        content += `  - Allocation: ${safeText(res.allocation, '—')}\n`;
    });
    content += `\n`;

    content += `## Risk Assessment\n`;
    plan.risks?.forEach(risk => {
        content += `- [${safeText(risk.severity, '—')}] **${safeText(risk.risk, 'Unspecified risk')}**\n`;
        content += `  - Mitigation: ${safeText(risk.mitigation, 'Not provided')}\n`;
    });

    content += `\n---\nGenerated by Agentic System Builder`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_Plan_${(requirements.projectName || 'Untitled').replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
      return (
          <div className="flex h-full w-full items-center justify-center bg-[#151515] flex-col gap-6">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#D4B980]"></div>
              <p className="text-[#D4B980] font-mono animate-pulse tracking-widest">BUILDING PROJECT PLAN...</p>
          </div>
      );
  }

  if (!plan) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-[#151515] flex-col gap-4 p-8">
            {showBanner ? (
              <div className="w-full max-w-2xl">
                <ConfigureBanner />
              </div>
            ) : (
              <div className="w-full max-w-xl flex flex-col items-center gap-4 text-center">
                <p className="text-[#E8E8E8] font-bold text-lg">Failed to generate plan.</p>
                {errorMessage && (
                  <p className="text-[#C62828] text-sm font-mono bg-[#C62828]/10 border border-[#C62828]/30 rounded-lg px-4 py-3 max-w-full break-words">
                    {errorMessage}
                  </p>
                )}
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={fetchPlan}
                    className="bg-[#D4B980] hover:bg-[#C4A870] text-[#1A1A1A] px-5 py-2 rounded-lg font-bold text-sm shadow-lg"
                  >
                    Retry
                  </button>
                  <button
                    onClick={onBack}
                    className="bg-[#333333] hover:bg-[#4A4A4A] text-white px-5 py-2 rounded-lg font-bold text-sm border border-[#4A4A4A]"
                  >
                    Return to Design
                  </button>
                </div>
              </div>
            )}
        </div>
      );
  }

  return (
    <div className="h-full bg-[#151515] overflow-y-auto p-6 md:p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#333333] pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-[#D4B980] text-3xl"><PlannerIcon className="w-8 h-8"/></span>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Project Execution Plan</h2>
                    </div>
                    <p className="text-[#B8B8B8] max-w-2xl text-sm leading-relaxed">{safeText(plan.executiveSummary, 'No summary provided.')}</p>
                </div>

                <div className="flex gap-4">
                     <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg p-3 text-center min-w-[120px]">
                         <div className="text-[10px] text-[#808080] uppercase tracking-wider font-bold mb-1">Total Effort</div>
                         <div className="text-2xl font-bold text-white font-mono">
                             {plan.totalEstimatedEffortHours != null ? `${plan.totalEstimatedEffortHours}h` : 'N/A'}
                         </div>
                     </div>
                     <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg p-3 text-center min-w-[120px]">
                         <div className="text-[10px] text-[#808080] uppercase tracking-wider font-bold mb-1">Duration</div>
                         <div className="text-2xl font-bold text-white font-mono">{safeText(plan.totalEstimatedDuration)}</div>
                     </div>
                </div>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Phases / Timeline (Main Column) */}
                <div className="lg:col-span-2 space-y-8">
                    <h3 className="text-sm font-bold text-[#808080] uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#2A5F8C]"></span> Phased Roadmap
                    </h3>
                    
                    <div className="space-y-6 relative">
                        {/* Timeline Line */}
                        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-[#333333]"></div>

                        {plan.phases?.map((phase, idx) => (
                            <div key={idx} className="relative pl-16 group">
                                {/* Timeline Dot */}
                                <div className="absolute left-3.5 top-6 w-5 h-5 rounded-full bg-[#1A1A1A] border-4 border-[#2A5F8C] group-hover:border-[#D4B980] transition-colors z-10"></div>
                                
                                <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 hover:border-[#2A5F8C]/50 transition-colors">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h4 className="text-lg font-bold text-white mb-1">{safeText(phase.title, `Phase ${idx + 1}`)}</h4>
                                            <span className="text-xs text-[#D4B980] font-mono bg-[#D4B980]/10 px-2 py-1 rounded">{safeText(phase.duration, '—')}</span>
                                        </div>
                                        <div className="text-xs font-bold text-[#808080] bg-[#2A2A2A] px-2 py-1 rounded">PHASE {idx + 1}</div>
                                    </div>

                                    <div className="space-y-3">
                                        {phase.tasks?.map((task, tIdx) => (
                                            <div key={tIdx} className="flex items-center gap-4 p-3 bg-[#2A2A2A]/50 rounded-lg border border-[#333333]/50">
                                                <div className={`w-1.5 h-1.5 rounded-full ${tIdx % 2 === 0 ? 'bg-[#2A5F8C]' : 'bg-[#D4B980]'}`}></div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm text-[#E8E8E8] font-medium">{safeText(task.title, 'Untitled Task')}</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getComplexityBadge(task.complexity)}`}>
                                                            {safeText(task.complexity, '—')}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs text-[#808080]">
                                                        <span>Assignee: <span className="text-[#B8B8B8]">{safeText(task.assignee, '—')}</span></span>
                                                        <span className="font-mono">{task.estimatedHours != null ? `${task.estimatedHours}h` : '—'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Resources & Risks */}
                <div className="space-y-8">
                    
                    {/* Resources */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-[#808080] uppercase tracking-widest flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-[#D4B980]"></span> Resources
                        </h3>
                        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl overflow-hidden">
                             {plan.resources?.map((res, i) => (
                                 <div key={i} className="p-4 border-b border-[#333333] last:border-0 hover:bg-[#2A2A2A] transition-colors flex items-center gap-4">
                                     <div className="bg-[#2A2A2A] p-2 rounded-lg text-[#D4B980]">
                                         <NodeIcon type={res.type === 'AI Agent' ? 'AGENT' : res.type === 'Human' ? 'HUMAN' : 'DATA'} className="w-5 h-5"/>
                                     </div>
                                     <div>
                                         <div className="font-bold text-white text-sm">{safeText(res.name, 'Unnamed Resource')}</div>
                                         <div className="text-xs text-[#808080]">{safeText(res.role, '—')} • {safeText(res.allocation, '—')}</div>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>

                    {/* Risks */}
                    <div className="space-y-4">
                         <h3 className="text-sm font-bold text-[#808080] uppercase tracking-widest flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-[#C62828]"></span> Risk Assessment
                        </h3>
                        <div className="space-y-3">
                            {plan.risks?.map((risk, i) => (
                                <div key={i} className={`p-4 rounded-xl border-l-4 ${getSeverityColor(risk.severity)} bg-opacity-5`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{safeText(risk.severity, '—')} Risk</span>
                                    </div>
                                    <h4 className="font-bold text-sm text-[#E8E8E8] mb-1">{safeText(risk.risk, 'Unspecified risk')}</h4>
                                    <p className="text-xs opacity-70 leading-relaxed">Mitigation: {safeText(risk.mitigation, 'Not provided')}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
            
            {/* Footer Action */}
            <div className="flex justify-end pt-10 border-t border-[#333333]">
                <button onClick={handleExportDoc} className="bg-[#2A5F8C] hover:bg-[#1A3F5C] text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-lg border border-[#FFFFFF]/10 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span>Export Project Plan</span>
                </button>
            </div>

        </div>
    </div>
  );
};
