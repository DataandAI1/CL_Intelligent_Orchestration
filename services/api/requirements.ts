import { apiFetch } from './client';
import type { ProjectRequirements } from '../../types';
import { requirementsToApi, type ProjectDetail } from './projects';

export async function saveRequirements(
  projectId: string,
  requirements: ProjectRequirements
): Promise<ProjectDetail['requirements']> {
  return apiFetch<ProjectDetail['requirements']>(
    `/api/projects/${encodeURIComponent(projectId)}/requirements`,
    { method: 'PUT', body: requirementsToApi(requirements) }
  );
}
