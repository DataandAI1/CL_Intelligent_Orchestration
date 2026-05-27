import { Router } from 'express';
import { query, withTransaction } from '../db';
import { validate } from '../middleware/validate';
import { requirementsBundleSchema } from '../schemas/requirements';
import { projectIdParamSchema } from '../schemas/projects';
import type { RequirementsBundle } from '../types';
import { CATEGORY_TO_KEY, KEY_TO_CATEGORY } from '../types';

export const requirementsRouter = Router();

async function ensureProjectExists(id: string): Promise<boolean> {
  const { rowCount } = await query(`SELECT 1 FROM projects WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

async function loadRequirements(projectId: string): Promise<RequirementsBundle> {
  const { rows } = await query<{
    id: string;
    category: keyof typeof CATEGORY_TO_KEY;
    content: string;
    position: number;
  }>(
    `SELECT id, category, content, position
       FROM requirement_items
      WHERE project_id = $1
      ORDER BY category, position`,
    [projectId]
  );
  const bundle: RequirementsBundle = {
    goals: [],
    processes: [],
    useCases: [],
    technologies: [],
    dataSources: [],
    humanInTheLoop: [],
  };
  for (const row of rows) {
    const key = CATEGORY_TO_KEY[row.category];
    if (key) bundle[key].push({ id: row.id, content: row.content, position: row.position });
  }
  return bundle;
}

requirementsRouter.put(
  '/projects/:id/requirements',
  validate(projectIdParamSchema, 'params'),
  validate(requirementsBundleSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      if (!(await ensureProjectExists(id))) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      const body = req.body as Record<keyof RequirementsBundle, { content: string }[]>;

      await withTransaction(async (client) => {
        await client.query(`DELETE FROM requirement_items WHERE project_id = $1`, [id]);
        for (const key of Object.keys(KEY_TO_CATEGORY) as (keyof RequirementsBundle)[]) {
          const category = KEY_TO_CATEGORY[key];
          const items = body[key] ?? [];
          for (let i = 0; i < items.length; i++) {
            await client.query(
              `INSERT INTO requirement_items (project_id, category, content, position)
               VALUES ($1, $2, $3, $4)`,
              [id, category, items[i].content, i]
            );
          }
        }
        await client.query(
          `UPDATE projects SET updated_at = now() WHERE id = $1`,
          [id]
        );
      });

      res.json(await loadRequirements(id));
    } catch (err) {
      next(err);
    }
  }
);

requirementsRouter.get(
  '/projects/:id/requirements',
  validate(projectIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      if (!(await ensureProjectExists(id))) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.json(await loadRequirements(id));
    } catch (err) {
      next(err);
    }
  }
);
