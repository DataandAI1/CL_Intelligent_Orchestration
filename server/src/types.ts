export type NodeType = 'AGENT' | 'TOOL' | 'DATA' | 'GOAL' | 'HUMAN';

export type RequirementCategory =
  | 'goals'
  | 'processes'
  | 'use_cases'
  | 'technologies'
  | 'data_sources'
  | 'human_in_the_loop';

export type ArtifactKind =
  | 'project_plan'
  | 'simulation'
  | 'pattern_comparison'
  | 'drawio_xml'
  | 'markdown_export'
  | 'architecture_analysis';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequirementItemRow {
  id: string;
  content: string;
  position: number;
}

export interface RequirementsBundle {
  goals: RequirementItemRow[];
  processes: RequirementItemRow[];
  useCases: RequirementItemRow[];
  technologies: RequirementItemRow[];
  dataSources: RequirementItemRow[];
  humanInTheLoop: RequirementItemRow[];
}

export interface DesignNodeWire {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  instructions?: string;
  schema?: string;
}

export interface DesignEdgeWire {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface DesignBundle {
  nodes: DesignNodeWire[];
  edges: DesignEdgeWire[];
}

export interface ArtifactRow {
  id: string;
  kind: ArtifactKind;
  payload: unknown;
  metadata: unknown;
  created_at: string;
}

export const REQUIREMENT_CATEGORIES: RequirementCategory[] = [
  'goals',
  'processes',
  'use_cases',
  'technologies',
  'data_sources',
  'human_in_the_loop',
];

export const NODE_TYPES: NodeType[] = ['AGENT', 'TOOL', 'DATA', 'GOAL', 'HUMAN'];

export const ARTIFACT_KINDS: ArtifactKind[] = [
  'project_plan',
  'simulation',
  'pattern_comparison',
  'drawio_xml',
  'markdown_export',
  'architecture_analysis',
];

export const CATEGORY_TO_KEY: Record<RequirementCategory, keyof RequirementsBundle> = {
  goals: 'goals',
  processes: 'processes',
  use_cases: 'useCases',
  technologies: 'technologies',
  data_sources: 'dataSources',
  human_in_the_loop: 'humanInTheLoop',
};

export const KEY_TO_CATEGORY: Record<keyof RequirementsBundle, RequirementCategory> = {
  goals: 'goals',
  processes: 'processes',
  useCases: 'use_cases',
  technologies: 'technologies',
  dataSources: 'data_sources',
  humanInTheLoop: 'human_in_the_loop',
};
