

import React from 'react';

interface IconProps {
  className?: string;
}

export const AgentIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="2" r="1.5" fill="currentColor" className="text-[#D4B980]"/>
    <path d="M5 8C5 6.34315 6.34315 5 8 5H16C17.6569 5 19 6.34315 19 8V19C19 20.6569 17.6569 22 16 22H8C6.34315 22 5 20.6569 5 19V8Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9 11L9.01 11" stroke="#D4B980" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M15 11L15.01 11" stroke="#D4B980" strokeWidth="2.5" strokeLinecap="round"/>
    <rect x="8" y="15" width="8" height="2" rx="1" fill="currentColor" fillOpacity="0.3"/>
    <path d="M3 10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M21 10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const ToolIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M14.5 10.5L9.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M6.5 12.5L11.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M18.636 7.63604C19.982 6.29004 20.218 4.23404 19.168 2.65004L15.932 5.88704L13.103 3.05804L16.34  -0.17896C14.755 -1.22896 12.699 -0.99396 11.353 0.35204L6.40401 5.30104C4.45101 7.25404 4.45101 10.42 6.40401 12.373L12.364 18.332C14.317 20.285 17.483 20.285 19.436 18.332L24.385 13.383C25.731 12.037 25.967 9.98104 24.916 8.39704L21.68 11.633L18.851 8.80504L22.088 5.56804C20.503 4.51804 18.447 4.75404 17.101 6.10004L14.5 8.70004" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="3" stroke="#D4B980" strokeWidth="1.5"/>
    <path d="M12 9V8" stroke="#D4B980" strokeWidth="1.5"/>
    <path d="M12 16V15" stroke="#D4B980" strokeWidth="1.5"/>
    <path d="M15 12H16" stroke="#D4B980" strokeWidth="1.5"/>
    <path d="M8 12H9" stroke="#D4B980" strokeWidth="1.5"/>
  </svg>
);

export const DataIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12L20 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12L4 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="3" r="1.5" fill="#D4B980" className="text-[#D4B980]"/>
    <circle cx="20" cy="7.5" r="1.5" fill="#D4B980" className="text-[#D4B980]"/>
    <circle cx="4" cy="7.5" r="1.5" fill="#D4B980" className="text-[#D4B980]"/>
    <circle cx="12" cy="12" r="1.5" fill="#D4B980" className="text-[#D4B980]"/>
  </svg>
);

export const GoalIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="6" stroke="#D4B980" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="2" fill="#D4B980"/>
    <path d="M12 2V5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 19V22" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 12H5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M19 12H22" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const HumanIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 20V18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 8H20" stroke="#D4B980" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="21" cy="8" r="1" fill="#D4B980"/>
    <path d="M17 19L21 15" stroke="#D4B980" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="22" cy="14" r="1" fill="#D4B980"/>
    <path d="M4 10L6 8" stroke="#D4B980" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="3" cy="11" r="1" fill="#D4B980"/>
  </svg>
);

export const LatticeIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12L20.66 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12L3.34 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2" fill="#D4B980"/>
    <circle cx="12" cy="2" r="1" fill="currentColor"/>
    <circle cx="20.66" cy="7" r="1" fill="currentColor"/>
    <circle cx="20.66" cy="17" r="1" fill="currentColor"/>
    <circle cx="12" cy="22" r="1" fill="currentColor"/>
    <circle cx="3.34" cy="17" r="1" fill="currentColor"/>
    <circle cx="3.34" cy="7" r="1" fill="currentColor"/>
  </svg>
);

export const PlannerIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9 12H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 16H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="15" cy="16" r="1" fill="#D4B980"/>
    <circle cx="17" cy="12" r="1" fill="#D4B980"/>
  </svg>
);

export const RoadmapIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M9 20V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 20V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 6L9 3L15 6L21 3V18L15 21L9 18L3 21V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 3L3 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 3L15 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 11C15 11 16 12 18 12C20 12 21 11 21 11" stroke="#D4B980" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
  </svg>
);

export const CompareIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M8 3V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M16 3V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M3 8L8 3L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11 16L16 21L21 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2" fill="#D4B980"/>
  </svg>
);

export const PlayIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M5 3L19 12L5 21V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 7L15 11" stroke="#D4B980" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const TableIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3 10h18M10 3v18" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const GraphIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="6" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="18" cy="18" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7.5 16.5l3-7.5m3 0l3 7.5m-9 0h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const BuildIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M3 21H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5 21V7L13 3V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 21V11L13 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 10H9.01" stroke="#D4B980" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 14H9.01" stroke="#D4B980" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const NodeIcon = ({ type, className = "w-6 h-6" }: { type: string, className?: string }) => {
  switch (type.toUpperCase()) {
    case 'AGENT': return <AgentIcon className={className} />;
    case 'TOOL': 
    case 'TECHNOLOGIES':
        return <ToolIcon className={className} />;
    case 'DATA': 
    case 'DATASOURCES':
        return <DataIcon className={className} />;
    case 'GOAL': 
    case 'GOALS':
        return <GoalIcon className={className} />;
    case 'HUMAN': 
    case 'HUMANINTHELOOP':
        return <HumanIcon className={className} />;
    case 'PROCESS': 
    case 'PROCESSES':
    case 'SYSTEM': 
    case 'LATTICE':
        return <LatticeIcon className={className} />;
    case 'USECASES':
        return <AgentIcon className={className} />;
    default: return <LatticeIcon className={className} />;
  }
};
