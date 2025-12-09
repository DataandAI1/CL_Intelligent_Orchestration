
import React, { useState } from 'react';
import { RequirementGathering } from './views/RequirementGathering';
import { DesignView } from './views/DesignView';
import { ProjectPlanner } from './views/ProjectPlanner';
import { StartPage } from './views/StartPage';
import { ProjectRequirements, NodeData, Edge } from './types';

// Context Lattice Logo Component
const Logo = ({ size = "w-10 h-10" }: { size?: string }) => (
  <div className={`${size} relative flex items-center justify-center`}>
     <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-lg">
        {/* Abstract Lattice Structure */}
        <path d="M20 2L35.5885 11V29L20 38L4.41154 29V11L20 2Z" stroke="#D4B980" strokeWidth="1.5" fill="rgba(26, 63, 92, 0.2)" />
        <path d="M20 2V20M20 38V20M4.41154 11L20 20M35.5885 11L20 20M4.41154 29L20 20M35.5885 29L20 20" stroke="#2A5F8C" strokeWidth="1" strokeOpacity="0.8"/>
        <circle cx="20" cy="20" r="3" fill="#D4B980" />
        <circle cx="20" cy="2" r="1.5" fill="#2A5F8C" />
        <circle cx="35.5885" cy="11" r="1.5" fill="#2A5F8C" />
        <circle cx="35.5885" cy="29" r="1.5" fill="#2A5F8C" />
        <circle cx="20" cy="38" r="1.5" fill="#2A5F8C" />
        <circle cx="4.41154" cy="29" r="1.5" fill="#2A5F8C" />
        <circle cx="4.41154" cy="11" r="1.5" fill="#2A5F8C" />
     </svg>
  </div>
);

const App: React.FC = () => {
  const [step, setStep] = useState<'start' | 'gather' | 'design' | 'plan'>('start');
  
  const [requirements, setRequirements] = useState<ProjectRequirements>({
    goals: [],
    processes: [],
    useCases: [],
    technologies: [],
    dataSources: [],
    humanInTheLoop: []
  });

  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const handleStart = (initialRequirements: ProjectRequirements) => {
    setRequirements(initialRequirements);
    setStep('gather');
  };

  const handleDesignComplete = (finalNodes: NodeData[], finalEdges: Edge[]) => {
      setNodes(finalNodes);
      setEdges(finalEdges);
      setStep('plan');
  };

  const NavItem = ({ id, num, label }: { id: typeof step, num: string, label: string }) => (
    <button 
      onClick={() => setStep(id)}
      className={`group flex items-center gap-2 transition-all hover:opacity-100 ${step === id ? 'text-[#D4B980] opacity-100' : 'text-[#808080] opacity-60 hover:text-[#B8B8B8]'}`}
    >
      <span className={`font-mono text-[10px] opacity-70 group-hover:text-[#D4B980] transition-colors`}>{num}</span>
      <span className={`font-bold uppercase tracking-wider text-[11px] group-hover:underline decoration-[#2A5F8C] underline-offset-4`}>{label}</span>
    </button>
  );

  const Separator = () => (
    <div className="w-8 h-[1px] bg-[#333333]"></div>
  );

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#FFFFFF] font-sans selection:bg-[#2A5F8C] selection:text-white">
      {step === 'start' && (
        <StartPage onStart={handleStart} />
      )}

      {step !== 'start' && (
        <div className="flex flex-col h-screen">
          {/* Global Header */}
          <header className="h-16 px-6 border-b border-[#333333] flex justify-between items-center bg-[#1A1A1A]/80 backdrop-blur-md sticky top-0 z-50">
            <div 
              className="flex items-center gap-4 cursor-pointer group transition-opacity hover:opacity-80" 
              onClick={() => {
                if(confirm("Return to Start? Unsaved progress will be lost.")) setStep('start');
              }}
            >
                <Logo />
                <div className="flex flex-col">
                    <span className="font-bold text-lg tracking-tight leading-none text-white font-display">CONTEXT LATTICE</span>
                    <span className="text-[10px] text-[#D4B980] tracking-[0.2em] uppercase mt-0.5">Intelligent Orchestration</span>
                </div>
            </div>

            <nav className="flex items-center gap-6">
                <div className="hidden md:flex items-center gap-3 text-xs tracking-wide">
                    <NavItem id="start" num="00" label="START" />
                    <Separator />
                    <NavItem id="gather" num="01" label="REQUIREMENTS" />
                    <Separator />
                    <NavItem id="design" num="02" label="DESIGN STUDIO" />
                    <Separator />
                    <NavItem id="plan" num="03" label="PROJECT PLANNER" />
                </div>
            </nav>
          </header>

          <main className="flex-1 overflow-hidden relative">
            {step === 'gather' && (
              <div className="h-full overflow-y-auto bg-[#1A1A1A]">
                <RequirementGathering 
                  requirements={requirements} 
                  setRequirements={setRequirements} 
                  onNext={() => setStep('design')} 
                />
              </div>
            )}
            
            {step === 'design' && (
              <DesignView 
                requirements={requirements} 
                onBack={() => setStep('gather')}
                onNext={handleDesignComplete}
              />
            )}

            {step === 'plan' && (
                <ProjectPlanner 
                    requirements={requirements}
                    nodes={nodes}
                    edges={edges}
                    onBack={() => setStep('design')}
                />
            )}
          </main>
        </div>
      )}
    </div>
  );
};

export default App;
