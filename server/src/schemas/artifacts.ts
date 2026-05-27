import { z } from 'zod';
import { ARTIFACT_KINDS } from '../types';

export const artifactCreateSchema = z.object({
  kind: z.enum(ARTIFACT_KINDS as [string, ...string[]]),
  payload: z.unknown(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const artifactListQuerySchema = z.object({
  kind: z.enum(ARTIFACT_KINDS as [string, ...string[]]).optional(),
});

export type ArtifactCreateInput = z.infer<typeof artifactCreateSchema>;
