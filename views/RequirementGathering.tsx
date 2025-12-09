
import React, { useState } from 'react';
import { ProjectRequirements, RequirementCategory, RequirementItem, SuggestionResponse, CompletenessAnalysis } from '../types';
import { expandRequirements, checkRequirementsCompleteness } from '../services/geminiService';
import { NodeIcon } from '../components/Icons';

interface Props {
  requirements: ProjectRequirements;
  setRequirements: React.Dispatch<React.SetStateAction<ProjectRequirements>>;
  onNext: () => void;
}

interface BrainstormState {
  isOpen: boolean;
  category: RequirementCategory | null;
  data: SuggestionResponse | null;
}

export const RequirementGathering: React.FC<Props> = ({ requirements, setRequirements, onNext }) => {
  const [inputs, setInputs] = useState<Record<RequirementCategory, string>>({
    goals: '',
    processes: '',
    useCases: '',
    technologies: '',
    dataSources: '',
    humanInTheLoop: ''
  });
  
  const [loadingCategory, setLoadingCategory] = useState<RequirementCategory | null>(null);
  const [brainstorm, setBrainstorm] = useState<BrainstormState>({
    isOpen: false,
    category: null,
    data: null
  });

  const [checkingHealth, setCheckingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<CompletenessAnalysis | null>(null);

  // Bento Grid Layout Config
  const categories: { 
    key: RequirementCategory; 
    label: string; 
    placeholder: string;
    colSpan: string; 
  }[] = [
    { key: 'goals', label: 'Business Goals', placeholder: 'Strategic outcomes...', colSpan: 'md:col-span-2' },
    { key: 'useCases', label: 'Agent Use Cases', placeholder: 'What will agents do?', colSpan: 'md:col-span-1' },
    { key: 'processes', label: 'Key Processes', placeholder: 'Workflows & Operations...', colSpan: 'md:col-span-1' },
    { key: 'technologies', label: 'Technologies', placeholder: 'Stack & APIs...', colSpan: 'md:col-span-1' },
    { key: 'dataSources', label: 'Data Sources', placeholder: 'Knowledge bases...', colSpan: 'md:col-span-1' },
    { key: 'humanInTheLoop', label: 'Human In The Loop', placeholder: 'Approval points...', colSpan: 'md:col-span-3' },
  ];

  const addItem = (category: RequirementCategory, text: string) => {
    if (!text.trim()) return;
    const newItem: RequirementItem = { id: Date.now().toString() + Math.random(), content: text };
    setRequirements(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), newItem]
    }));
    if (inputs[category] === text) {
        setInputs(prev => ({ ...prev, [category]: '' }));
    }
  };

  const handleExpand = async (category: RequirementCategory) => {
    setLoadingCategory(category);
    const currentItems = (requirements[category] || []).map(r => r.content);
    const result = await expandRequirements(category, currentItems, requirements);
    
    setBrainstorm({
      isOpen: true,
      category,
      data: result
    });
    setLoadingCategory(null);
  };

  const handleCheckHealth = async () => {
    setCheckingHealth(true);
    const result = await checkRequirementsCompleteness(requirements);
    setHealthResult(result);
    setCheckingHealth(false);
  };

  const removeItem = (category: RequirementCategory, id: string) => {
    setRequirements(prev => ({
      ...prev,
      [category]: (prev[category] || []).filter(item => item.id !== id)
    }));
  };

  const closeBrainstorm = () => {
    setBrainstorm({ isOpen: false, category: null, data: null });
  };

  const isItemAdded = (category: RequirementCategory, text: string) => {
      return (requirements[category] || []).some(r => r.content === text);
  };

  const getHealthColor = (score: number) => {
      if (score >= 80) return 'text-[#2E7D32]';
      if (score >= 50) return 'text-[#F57C00]';
      return 'text-[#C62828]';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 pb-32">
      
      {/* Header Context */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            {requirements.projectName && (
                <div className="mb-1">
                     <h2 className="text-3xl font-bold text-white tracking-tight font-display">{requirements.projectName}</h2>
                     <p className="text-[#B8B8B8] max-w-2xl font-light text-sm mt-1">{requirements.projectDescription}</p>
                </div>
            )}
          </div>
          
          <button
            onClick={handleCheckHealth}
            disabled={checkingHealth}
            className="group bg-[#2A2A2A] hover:bg-[#333333] text-[#D4B980] border border-[#D4B980]/30 hover:border-[#D4B980] px-5 py-2.5 rounded-lg transition-all shadow-lg flex items-center gap-3 text-sm font-semibold whitespace-nowrap"
          >
            {checkingHealth ? (
                <>
                    <div className="w-4 h-4 border-2 border-[#D4B980]/30 border-t-[#D4B980] rounded-full animate-spin"></div>
                    <span>Analysing Lattice...</span>
                </>
            ) : (
                <>
                    <span className="text-lg">🩺</span> 
                    <span>Check Lattice Health</span>
                </>
            )}
          </button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat, idx) => {
          const items = requirements[cat.key] || [];
          return (
          <div 
            key={cat.key} 
            className={`${cat.colSpan} glass-card bg-[#2A2A2A]/40 border border-[#333333] hover:border-[#2A5F8C]/50 rounded-xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group h-[340px] animate-in fade-in zoom-in-95`}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#333333]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2.5 uppercase tracking-wide">
                <span className="text-xl opacity-80 filter drop-shadow-md text-[#D4B980]">
                    <NodeIcon type={cat.key} className="w-6 h-6" />
                </span> 
                {cat.label}
              </h3>
              <button
                onClick={() => handleExpand(cat.key)}
                disabled={loadingCategory === cat.key}
                className="text-xs text-[#2A5F8C] hover:text-[#D4B980] bg-[#2A5F8C]/10 hover:bg-[#2A5F8C]/20 px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 border border-[#2A5F8C]/20"
              >
                {loadingCategory === cat.key ? (
                    <span className="animate-spin">⏳</span>
                ) : (
                    <>
                        <span>✨</span> AI Suggest
                    </>
                )}
              </button>
            </div>

            {/* Input Area */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={inputs[cat.key] || ''}
                onChange={(e) => setInputs({ ...inputs, [cat.key]: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addItem(cat.key, inputs[cat.key])}
                placeholder={cat.placeholder}
                className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-2.5 text-xs text-white placeholder-[#4A4A4A] focus:outline-none focus:border-[#2A5F8C] focus:ring-1 focus:ring-[#2A5F8C] transition-all"
              />
              <button
                onClick={() => addItem(cat.key, inputs[cat.key])}
                className="bg-[#2A5F8C] hover:bg-[#1A3F5C] text-white w-10 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-[#2A5F8C]/20"
              >
                +
              </button>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {items.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-[#4A4A4A] text-xs italic">
                    <span>Awaiting requirements...</span>
                </div>
              )}
              {items.map(item => (
                <div key={item.id} className="group/item flex justify-between items-start gap-3 bg-[#1A1A1A]/60 border border-[#333333] p-3 rounded-lg text-sm text-[#B8B8B8] hover:text-white hover:border-[#D4B980]/30 transition-all">
                  <span className="leading-relaxed text-xs">{item.content}</span>
                  <button
                    onClick={() => removeItem(cat.key, item.id)}
                    className="text-[#C62828] opacity-0 group-hover/item:opacity-100 transition-opacity p-1 hover:bg-[#C62828]/10 rounded"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )})}
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-10 left-0 right-0 flex justify-center pointer-events-none z-30">
        <button
          onClick={onNext}
          className="pointer-events-auto bg-[#2A5F8C] hover:bg-[#1A3F5C] text-white font-bold tracking-wide py-4 px-10 rounded-xl shadow-[0_8px_30px_rgba(26,63,92,0.4)] transform hover:-translate-y-1 transition-all flex items-center gap-3 border border-[#FFFFFF]/10 backdrop-blur-md"
        >
          <span>GENERATE ARCHITECTURE</span>
          <span className="text-[#D4B980]">→</span>
        </button>
      </div>

      {/* AI Brainstorm Modal */}
      {brainstorm.isOpen && brainstorm.category && brainstorm.data && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#000000]/80 backdrop-blur-md">
              <div className="bg-[#1A1A1A] border border-[#333333] w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  
                  {/* Header */}
                  <div className="p-6 border-b border-[#333333] flex justify-between items-center bg-[#2A2A2A]">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#2A5F8C] flex items-center justify-center text-white shadow-lg border border-[#FFFFFF]/10 text-xl">
                             <NodeIcon type="SYSTEM" className="w-6 h-6" />
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-white">Lattice Intelligence</h3>
                              <p className="text-[#808080] text-sm">Enhancing: <span className="text-[#D4B980] capitalize">{categories.find(c => c.key === brainstorm.category)?.label}</span></p>
                          </div>
                      </div>
                      <button onClick={closeBrainstorm} className="text-[#808080] hover:text-white transition-colors p-2 text-xl">✕</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10 bg-[#1A1A1A]">
                      
                      {/* Suggestions */}
                      <div className="space-y-6">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#333333]">
                             <span className="text-[#D4B980]">💡</span>
                             <h4 className="text-xs font-bold text-[#808080] uppercase tracking-wider">Recommendations</h4>
                          </div>
                          
                          <div className="space-y-3">
                              {(brainstorm.data.suggestions || []).map((suggestion, idx) => {
                                  const added = isItemAdded(brainstorm.category!, suggestion);
                                  return (
                                      <button
                                          key={idx}
                                          onClick={() => !added && addItem(brainstorm.category!, suggestion)}
                                          disabled={added}
                                          className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center group ${
                                              added 
                                              ? 'bg-[#2E7D32]/10 border-[#2E7D32]/30 text-[#2E7D32] cursor-default' 
                                              : 'bg-[#2A2A2A] border-[#333333] hover:border-[#D4B980] text-[#E8E8E8]'
                                          }`}
                                      >
                                          <span className="text-sm leading-relaxed">{suggestion}</span>
                                          {added ? (
                                              <span className="text-[#2E7D32]">✓</span>
                                          ) : (
                                              <span className="text-[#808080] group-hover:text-[#D4B980] text-lg font-light transition-colors">+</span>
                                          )}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>

                      {/* Questions */}
                      <div className="space-y-6">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#333333]">
                             <span className="text-[#2A5F8C]">🤔</span>
                             <h4 className="text-xs font-bold text-[#808080] uppercase tracking-wider">Strategic Inquiry</h4>
                          </div>
                          
                          <div className="space-y-4">
                              {(brainstorm.data.questions || []).map((question, idx) => (
                                  <div key={idx} className="bg-[#2A5F8C]/5 border border-[#2A5F8C]/20 p-5 rounded-xl">
                                      <div className="flex gap-3">
                                        <span className="text-[#2A5F8C] font-bold">?</span>
                                        <p className="text-sm text-[#B8B8B8] italic leading-relaxed">"{question}"</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="p-6 border-t border-[#333333] bg-[#2A2A2A] flex justify-end">
                      <button onClick={closeBrainstorm} className="bg-[#D4B980] hover:bg-[#C4A870] text-[#1A1A1A] px-8 py-3 rounded-lg font-bold transition-colors shadow-lg">
                          Done
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Health Check Modal */}
      {healthResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#000000]/80 backdrop-blur-md">
               <div className="bg-[#1A1A1A] border border-[#333333] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                   <div className="p-6 border-b border-[#333333] flex justify-between items-center bg-[#2A2A2A]">
                       <h3 className="text-xl font-bold text-white flex items-center gap-3">
                           <span>🩺</span> Analysis Report
                       </h3>
                       <button onClick={() => setHealthResult(null)} className="text-[#808080] hover:text-white">✕</button>
                   </div>
                   
                   <div className="p-8 overflow-y-auto space-y-8 bg-[#1A1A1A]">
                       <div className="flex items-center gap-8">
                           <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                               <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                   <path className="text-[#333333]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
                                   <path 
                                    className={`${getHealthColor(healthResult.score)} transition-all duration-1000 ease-out drop-shadow-md`}
                                    strokeDasharray={`${healthResult.score}, 100`}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2.5" 
                                    strokeLinecap="round"
                                   />
                               </svg>
                               <span className={`absolute text-3xl font-bold ${getHealthColor(healthResult.score)}`}>{healthResult.score}</span>
                           </div>
                           <div>
                               <h4 className={`text-2xl font-bold ${getHealthColor(healthResult.score)} mb-2`}>{healthResult.rating}</h4>
                               <p className="text-[#B8B8B8] leading-relaxed">{healthResult.summary}</p>
                           </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div>
                               <h4 className="text-xs font-bold text-[#808080] uppercase tracking-wider mb-4 border-b border-[#333333] pb-2">Critical Actions</h4>
                               <ul className="space-y-3">
                                   {(healthResult.recommendations || []).map((rec, i) => (
                                       <li key={i} className="flex gap-3 text-sm text-[#E8E8E8] bg-[#F57C00]/10 p-3 rounded-lg border-l-2 border-[#F57C00]">
                                           {rec}
                                       </li>
                                   ))}
                               </ul>
                           </div>
                           <div>
                               <h4 className="text-xs font-bold text-[#808080] uppercase tracking-wider mb-4 border-b border-[#333333] pb-2">Clarification Needed</h4>
                               <ul className="space-y-3">
                                   {(healthResult.questions || []).map((q, i) => (
                                       <li key={i} className="flex gap-3 text-sm text-[#B8B8B8] italic">
                                           <span className="text-[#2A5F8C] not-italic font-bold">?</span> {q}
                                       </li>
                                   ))}
                               </ul>
                           </div>
                       </div>
                   </div>

                   <div className="p-6 border-t border-[#333333] bg-[#2A2A2A] flex justify-end">
                       <button 
                           onClick={() => setHealthResult(null)}
                           className="bg-[#D4B980] hover:bg-[#C4A870] text-[#1A1A1A] px-6 py-2.5 rounded-lg font-bold transition-colors shadow-md"
                       >
                           Acknowledge
                       </button>
                   </div>
               </div>
          </div>
      )}
    </div>
  );
};
