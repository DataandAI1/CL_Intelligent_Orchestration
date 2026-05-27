import { apiFetch } from './client';

export type ArtifactKind =
  | 'project_plan'
  | 'simulation'
  | 'pattern_comparison'
  | 'drawio_xml'
  | 'markdown_export'
  | 'architecture_analysis';

export interface ArtifactRecord {
  id: string;
  kind: ArtifactKind;
  payload: unknown;
  metadata: unknown;
  created_at: string;
}

export function createArtifact(
  projectId: string,
  kind: ArtifactKind,
  payload: unknown,
  metadata?: Record<string, unknown>
): Promise<ArtifactRecord> {
  return apiFetch<ArtifactRecord>(
    `/api/projects/${encodeURIComponent(projectId)}/artifacts`,
    { method: 'POST', body: { kind, payload, metadata } }
  );
}

export function listArtifacts(
  projectId: string,
  kind?: ArtifactKind
): Promise<ArtifactRecord[]> {
  const qs = kind ? `?kind=${encodeURIComponent(kind)}` : '';
  return apiFetch<ArtifactRecord[]>(
    `/api/projects/${encodeURIComponent(projectId)}/artifacts${qs}`
  );
}
