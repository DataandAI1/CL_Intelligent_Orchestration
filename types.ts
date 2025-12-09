

export enum NodeType {
  AGENT = 'AGENT',
  TOOL = 'TOOL',
  DATA = 'DATA',
  GOAL = 'GOAL',
  HUMAN = 'HUMAN'
}

export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  position: Position;
  // specific properties
  instructions?: string; // For Agents
  schema?: string; // For Data/Tools
  // Dimensions for accurate connections
  width?: number;
  height?: number;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface RequirementItem {
  id: string;
  content: string;
}

export interface ProjectRequirements {
  projectName?: string;
  projectDescription?: string;
  goals: RequirementItem[];
  processes: RequirementItem[];
  useCases: RequirementItem[];
  technologies: RequirementItem[];
  dataSources: RequirementItem[];
  humanInTheLoop: RequirementItem[];
}

export type RequirementCategory = keyof Omit<ProjectRequirements, 'projectName' | 'projectDescription'>;

export interface SuggestionResponse {
  suggestions: string[];
  questions: string[];
}

export interface AgentDesignResponse {
  pattern: string; // e.g. "Hierarchical", "Sequential", "Network"
  patternDescription: string;
  nodes: {
    type: string; // "AGENT" | "TOOL" | "DATA" | "GOAL" | "HUMAN"
    label: string;
    description: string;
    instructions?: string;
  }[];
  connections: {
    from: string; // label of source
    to: string; // label of target
    relation: string;
  }[];
}

export interface ArchitectureAnalysis {
  analysis: string;
  simplifications: string[];
  improvements: string[];
  contextGaps: string[];
  suggestedNodes: {
    type: NodeType;
    label: string;
    description: string;
    instructions?: string;
    reason: string;
  }[];
}

// Comparison Types
export interface CurrentPatternAnalysis {
    patternName: string;
    summary: string;
    score: number; // 0-100
    characteristics: string[];
    pros: string[];
    cons: string[];
}

export interface PatternComparisonItem {
    patternName: string;
    description: string;
    pros: string[];
    cons: string[];
    suitabilityScore: number; // 0-100
    recommendation: string;
}

export interface PatternComparisonResponse {
    current: CurrentPatternAnalysis;
    alternatives: PatternComparisonItem[];
}

export interface SimulationStep {
  step: number;
  actor: string;
  nodeType: string; // AGENT, TOOL, DATA, GOAL, SYSTEM, HUMAN
  action: string;
  details: string;
  status: 'success' | 'info' | 'warning' | 'error';
}

export interface CompletenessAnalysis {
  score: number; // 0-100
  rating: string; // e.g. "Needs Improvement", "Good", "Excellent"
  summary: string;
  recommendations: string[];
  questions: string[];
}

// Project Planner Types
export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  assignee: string; // Node Label or Human Role
  complexity: 'Low' | 'Medium' | 'High';
  estimatedHours: number;
}

export interface ProjectPhase {
  id: string;
  title: string;
  duration: string; // e.g. "Week 1-2"
  tasks: ProjectTask[];
}

export interface ProjectResource {
  name: string;
  type: 'AI Agent' | 'Human' | 'Infrastructure' | 'Data';
  role: string;
  allocation: string; // e.g. "100%", "On Demand"
}

export interface ProjectRisk {
  risk: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  mitigation: string;
}

export interface ProjectPlan {
  phases: ProjectPhase[];
  resources: ProjectResource[];
  risks: ProjectRisk[];
  totalEstimatedDuration: string;
  totalEstimatedEffortHours: number;
  executiveSummary: string;
}