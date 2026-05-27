import { apiFetch } from './client';
import type { ProjectRequirements, NodeData, Edge } from '../../types';

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends ProjectSummary {
  requirements: {
    goals: { id: string; content: string }[];
    processes: { id: string; content: string }[];
    useCases: { id: string; content: string }[];
    technologies: { id: string; content: string }[];
    dataSources: { id: string; content: string }[];
    humanInTheLoop: { id: string; content: string }[];
  };
  design: { nodes: NodeData[]; edges: Edge[] };
  artifacts: { id: string; kind: string; payload: unknown; metadata: unknown; created_at: string }[];
}

export function listProjects(): Promise<ProjectSummary[]> {
  return apiFetch<ProjectSummary[]>('/api/projects');
}

export function getProject(id: string): Promise<ProjectDetail> {
  return apiFetch<ProjectDetail>(`/api/projects/${encodeURIComponent(id)}`);
}

export function createProject(input: { name: string; description?: string | null }): Promise<ProjectSummary> {
  return apiFetch<ProjectSummary>('/api/projects', { method: 'POST', body: input });
}

export function deleteProject(id: string): Promise<void> {
  return apiFetch<void>(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// --- Helpers for converting between SPA shapes and API shapes ---

export function requirementsToApi(req: ProjectRequirements) {
  const toItems = (arr?: { content: string }[]) =>
    (arr ?? []).map((i) => ({ content: i.content }));
  return {
    goals: toItems(req.goals),
    processes: toItems(req.processes),
    useCases: toItems(req.useCases),
    technologies: toItems(req.technologies),
    dataSources: toItems(req.dataSources),
    humanInTheLoop: toItems(req.humanInTheLoop),
  };
}

export function apiRequirementsToSpa(
  api: ProjectDetail['requirements'],
  projectName?: string,
  projectDescription?: string | null
): ProjectRequirements {
  const wrap = (items: { id: string; content: string }[]) =>
    items.map((i) => ({ id: i.id, content: i.content }));
  return {
    projectName: projectName,
    projectDescription: projectDescription ?? undefined,
    goals: wrap(api.goals),
    processes: wrap(api.processes),
    useCases: wrap(api.useCases),
    technologies: wrap(api.technologies),
    dataSources: wrap(api.dataSources),
    humanInTheLoop: wrap(api.humanInTheLoop),
  };
}
