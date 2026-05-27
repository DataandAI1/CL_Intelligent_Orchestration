import { Router } from 'express';
import { query } from '../db';
import { validate } from '../middleware/validate';
import { artifactCreateSchema, artifactListQuerySchema } from '../schemas/artifacts';
import { projectIdParamSchema } from '../schemas/projects';
import type { ArtifactKind, ArtifactRow } from '../types';

export const artifactsRouter = Router();

async function ensureProjectExists(id: string): Promise<boolean> {
  const { rowCount } = await query(`SELECT 1 FROM projects WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

artifactsRouter.post(
  '/projects/:id/artifacts',
  validate(projectIdParamSchema, 'params'),
  validate(artifactCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      if (!(await ensureProjectExists(id))) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      const { kind, payload, metadata } = req.body as {
        kind: ArtifactKind;
        payload: unknown;
        metadata?: unknown;
      };

      const { rows } = await query<ArtifactRow>(
        `INSERT INTO artifacts (project_id, kind, payload, metadata)
         VALUES ($1, $2, $3::jsonb, $4::jsonb)
         RETURNING id, kind, payload, metadata, created_at`,
        [id, kind, JSON.stringify(payload), metadata ? JSON.stringify(metadata) : null]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

artifactsRouter.get(
  '/projects/:id/artifacts',
  validate(projectIdParamSchema, 'params'),
  validate(artifactListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      if (!(await ensureProjectExists(id))) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      const kind = (req.query as { kind?: ArtifactKind }).kind;
      const params: unknown[] = [id];
      let sql =
        `SELECT id, kind, payload, metadata, created_at
           FROM artifacts
          WHERE project_id = $1`;
      if (kind) {
        params.push(kind);
        sql += ` AND kind = $2`;
      }
      sql += ` ORDER BY created_at DESC`;
      const { rows } = await query<ArtifactRow>(sql, params);
      res.json(rows);
    } catch (err) {
      next(err);
    }
  }
);
