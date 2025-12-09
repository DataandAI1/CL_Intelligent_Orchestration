import React, { useState, useRef } from 'react';
import { ProjectRequirements } from '../types';
import { analyzeProjectAssets } from '../services/geminiService';

interface Props {
  onStart: (requirements: ProjectRequirements) => void;
}

export const StartPage: React.FC<Props> = ({ onStart }) => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [fileContent, setFileContent] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const text = await file.text();
      setFileContent(prev => prev + `\n\n--- FILE: ${file.name} ---\n` + text);
    }
  };

  const handleStart = async () => {
    if (!projectName.trim()) {
      alert("Please enter a project name.");
      return;
    }

    setIsAnalyzing(true);
    
    let requirements: ProjectRequirements = {
        projectName,
        projectDescription,
        goals: [],
        processes: [],
        useCases: [],
        technologies: [],
        dataSources: [],
        humanInTheLoop: []
    };

    if (fileContent.trim()) {
        const analyzed = await analyzeProjectAssets(projectName, projectDescription, fileContent);
        requirements = { ...requirements, ...analyzed };
    }

    setIsAnalyzing(false);
    onStart(requirements);
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] relative overflow-hidden flex items-center justify-center p-6 sm:p-12">
      {/* Cinematic Background */}
      <div className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-[#1A3F5C] opacity-10 rounded-full blur-[120px] animate-float"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-[#D4B980] opacity-5 rounded-full blur-[100px] animate-float" style={{animationDelay: '2s'}}></div>
      
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 relative z-10 items-center">
        
        {/* Left Column: Brand & Value */}
        <div className="lg:col-span-5 space-y-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#2A5F8C]/10 border border-[#2A5F8C]/30 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4B980] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4B980]"></span>
              </span>
              <span className="text-[#D4B980] text-xs font-mono font-medium tracking-widest uppercase">System v2.5 Active</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold text-white leading-[0.9] tracking-tight">
              CONTEXT <br/>
              <span className="text-gradient-gold">LATTICE</span>
            </h1>
            
            <p className="text-lg text-[#B8B8B8] leading-relaxed max-w-md font-light border-l-2 border-[#D4B980]/30 pl-6">
              The premier environment for defining, designing, and orchestrating intelligent agent systems. 
              Turn abstract requirements into executable architectures.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {[
                { label: "Semantic Analysis", val: "Active" },
                { label: "Agent Simulation", val: "Ready" },
                { label: "Pattern Library", val: "Updated" },
                { label: "Export Engine", val: "v3.0" }
             ].map((stat, i) => (
               <div key={i} className="bg-[#2A2A2A]/40 border border-[#333333] p-4 rounded-lg backdrop-blur-sm">
                 <div className="text-[#808080] text-[10px] uppercase tracking-wider mb-1">{stat.label}</div>
                 <div className="text-white font-mono text-sm">{stat.val}</div>
               </div>
             ))}
          </div>
        </div>

        {/* Right Column: Interactive Setup Card */}
        <div className="lg:col-span-7">
          <div className="glass-panel p-1 rounded-2xl shadow-2xl">
            <div className="bg-[#1A1A1A]/90 backdrop-blur-xl rounded-xl p-8 sm:p-10 border border-[#333333]">
              
              <div className="flex justify-between items-start mb-8">
                <div>
                   <h2 className="text-2xl font-bold text-white mb-2">Initialize Project</h2>
                   <p className="text-sm text-[#808080]">Configure the lattice parameters for your new intelligent system.</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#2A5F8C]/10 flex items-center justify-center border border-[#2A5F8C]/20 text-xl">
                  💠
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Project Name */}
                <div className="group">
                  <label className="block text-xs font-bold text-[#808080] uppercase tracking-wider mb-2 group-focus-within:text-[#D4B980] transition-colors">Project Identity</label>
                  <input 
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Enterprise Customer Support Swarm"
                    className="w-full bg-[#2A2A2A] border border-[#333333] rounded-lg p-4 text-white placeholder-[#4A4A4A] focus:border-[#2A5F8C] focus:ring-1 focus:ring-[#2A5F8C] outline-none transition-all font-medium"
                  />
                </div>

                {/* Description */}
                <div className="group">
                  <label className="block text-xs font-bold text-[#808080] uppercase tracking-wider mb-2 group-focus-within:text-[#D4B980] transition-colors">System Goals & Scope</label>
                  <textarea 
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Describe what this agent system needs to achieve..."
                    className="w-full bg-[#2A2A2A] border border-[#333333] rounded-lg p-4 text-white placeholder-[#4A4A4A] focus:border-[#2A5F8C] focus:ring-1 focus:ring-[#2A5F8C] outline-none transition-all h-32 resize-none"
                  />
                </div>

                {/* Context Upload */}
                <div className="bg-[#2A2A2A]/50 border border-[#333333] border-dashed rounded-lg p-6 hover:border-[#D4B980]/50 transition-colors group">
                   <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2 text-white font-medium text-sm">
                        <span className="text-[#D4B980]">📎</span> 
                        Upload Context Assets
                      </div>
                      <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs bg-[#333333] hover:bg-[#4A4A4A] text-white px-3 py-1.5 rounded transition-colors"
                      >
                          Select Files
                      </button>
                      <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          className="hidden" 
                          accept=".txt,.md,.csv,.json,.log,.pdf"
                      />
                   </div>
                   
                   <textarea 
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      placeholder="Or paste meeting notes, requirements, and transcripts directly here..."
                      className="w-full bg-transparent border-none p-0 text-xs font-mono text-[#B8B8B8] focus:ring-0 outline-none h-24 resize-none placeholder-[#4A4A4A]"
                   />
                </div>

                {/* Action Button */}
                <button 
                  onClick={handleStart}
                  disabled={isAnalyzing}
                  className="w-full bg-[#2A5F8C] hover:bg-[#1A3F5C] disabled:bg-[#333333] text-white font-bold py-4 rounded-lg shadow-lg shadow-[#2A5F8C]/20 hover:shadow-[#2A5F8C]/40 transform transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 mt-4"
                >
                  {isAnalyzing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="font-mono text-sm tracking-wide">ANALYZING ASSETS...</span>
                      </>
                  ) : (
                      <>
                        <span>Generate Context Lattice</span>
                        <span className="text-[#D4B980]">→</span>
                      </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};