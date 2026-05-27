import { Router } from 'express';
import { query } from '../db';
import { validate } from '../middleware/validate';
import {
  projectCreateSchema,
  projectIdParamSchema,
  projectUpdateSchema,
} from '../schemas/projects';
import type { ArtifactRow, Project, RequirementItemRow, RequirementsBundle } from '../types';
import { CATEGORY_TO_KEY } from '../types';

export const projectsRouter = Router();

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
    if (key) {
      bundle[key].push({ id: row.id, content: row.content, position: row.position });
    }
  }
  return bundle;
}

async function loadDesign(projectId: string): Promise<{
  nodes: ReturnType<typeof toNodeWire>[];
  edges: { id: string; source: string; target: string; label?: string }[];
}> {
  const nodesRes = await query<{
    client_node_id: string;
    type: string;
    label: string;
    description: string | null;
    position_x: number;
    position_y: number;
    width: number | null;
    height: number | null;
    instructions: string | null;
    node_schema: string | null;
  }>(
    `SELECT client_node_id, type, label, description, position_x, position_y,
            width, height, instructions, node_schema
       FROM design_nodes
      WHERE project_id = $1
      ORDER BY created_at ASC`,
    [projectId]
  );
  const edgesRes = await query<{
    client_edge_id: string;
    source_client_node_id: string;
    target_client_node_id: string;
    label: string | null;
  }>(
    `SELECT client_edge_id, source_client_node_id, target_client_node_id, label
       FROM design_edges
      WHERE project_id = $1
      ORDER BY created_at ASC`,
    [projectId]
  );
  return {
    nodes: nodesRes.rows.map(toNodeWire),
    edges: edgesRes.rows.map((r) => ({
      id: r.client_edge_id,
      source: r.source_client_node_id,
      target: r.target_client_node_id,
      ...(r.label ? { label: r.label } : {}),
    })),
  };
}

function toNodeWire(r: {
  client_node_id: string;
  type: string;
  label: string;
  description: string | null;
  position_x: number;
  position_y: number;
  width: number | null;
  height: number | null;
  instructions: string | null;
  node_schema: string | null;
}) {
  return {
    id: r.client_node_id,
    type: r.type as 'AGENT' | 'TOOL' | 'DATA' | 'GOAL' | 'HUMAN',
    label: r.label,
    ...(r.description ? { description: r.description } : {}),
    position: { x: Number(r.position_x), y: Number(r.position_y) },
    ...(r.width != null ? { width: Number(r.width) } : {}),
    ...(r.height != null ? { height: Number(r.height) } : {}),
    ...(r.instructions ? { instructions: r.instructions } : {}),
    ...(r.node_schema ? { schema: r.node_schema } : {}),
  };
}

async function loadLatestArtifactByKind(projectId: string): Promise<ArtifactRow[]> {
  const { rows } = await query<ArtifactRow>(
    `SELECT DISTINCT ON (kind) id, kind, payload, metadata, created_at
       FROM artifacts
      WHERE project_id = $1
      ORDER BY kind, created_at DESC`,
    [projectId]
  );
  return rows;
}

projectsRouter.post(
  '/projects',
  validate(projectCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const { name, description } = req.body as { name: string; description?: string | null };
      const { rows } = await query<Project>(
        `INSERT INTO projects (name, description) VALUES ($1, $2)
         RETURNING id, name, description, created_at, updated_at`,
        [name, description ?? null]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

projectsRouter.get('/projects', async (_req, res, next) => {
  try {
    const { rows } = await query<Project>(
      `SELECT id, name, description, created_at, updated_at
         FROM projects
        ORDER BY updated_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

projectsRouter.get(
  '/projects/:id',
  validate(projectIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const projectRes = await query<Project>(
        `SELECT id, name, description, created_at, updated_at
           FROM projects
          WHERE id = $1`,
        [id]
      );
      if (projectRes.rowCount === 0) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      const [requirements, design, artifacts] = await Promise.all([
        loadRequirements(id),
        loadDesign(id),
        loadLatestArtifactByKind(id),
      ]);
      res.json({
        ...projectRes.rows[0],
        requirements,
        design,
        artifacts,
      });
    } catch (err) {
      next(err);
    }
  }
);

projectsRouter.put(
  '/projects/:id',
  validate(projectIdParamSchema, 'params'),
  validate(projectUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as { name?: string; description?: string | null };

      const sets: string[] = [];
      const params: unknown[] = [];
      if (body.name !== undefined) {
        sets.push(`name = $${sets.length + 1}`);
        params.push(body.name);
      }
      if (body.description !== undefined) {
        sets.push(`description = $${sets.length + 1}`);
        params.push(body.description);
      }
      params.push(id);

      const { rows, rowCount } = await query<Project>(
        `UPDATE projects SET ${sets.join(', ')}
          WHERE id = $${params.length}
          RETURNING id, name, description, created_at, updated_at`,
        params
      );
      if (rowCount === 0) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

projectsRouter.delete(
  '/projects/:id',
  validate(projectIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const { rowCount } = await query(`DELETE FROM projects WHERE id = $1`, [id]);
      if (rowCount === 0) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
