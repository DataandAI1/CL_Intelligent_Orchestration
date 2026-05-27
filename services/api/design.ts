import { apiFetch } from './client';
import type { NodeData, Edge } from '../../types';

export async function saveDesign(
  projectId: string,
  nodes: NodeData[],
  edges: Edge[]
): Promise<{ nodes: NodeData[]; edges: Edge[] }> {
  // Strip width/height when undefined so the wire payload stays tidy.
  const payload = {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      ...(n.description ? { description: n.description } : {}),
      position: { x: n.position.x, y: n.position.y },
      ...(n.width != null ? { width: n.width } : {}),
      ...(n.height != null ? { height: n.height } : {}),
      ...(n.instructions ? { instructions: n.instructions } : {}),
      ...(n.schema ? { schema: n.schema } : {}),
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      ...(e.label ? { label: e.label } : {}),
    })),
  };
  return apiFetch<{ nodes: NodeData[]; edges: Edge[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/design`,
    { method: 'PUT', body: payload }
  );
}
