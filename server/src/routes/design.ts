import { Router } from 'express';
import { query, withTransaction } from '../db';
import { validate } from '../middleware/validate';
import { designBundleSchema, type DesignBundleInput } from '../schemas/design';
import { projectIdParamSchema } from '../schemas/projects';
import type { DesignBundle, DesignEdgeWire, DesignNodeWire } from '../types';

export const designRouter = Router();

async function ensureProjectExists(id: string): Promise<boolean> {
  const { rowCount } = await query(`SELECT 1 FROM projects WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

async function loadDesign(projectId: string): Promise<DesignBundle> {
  const nodesRes = await query<{
    client_node_id: string;
    type: DesignNodeWire['type'];
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

  const nodes: DesignNodeWire[] = nodesRes.rows.map((r) => ({
    id: r.client_node_id,
    type: r.type,
    label: r.label,
    ...(r.description ? { description: r.description } : {}),
    position: { x: Number(r.position_x), y: Number(r.position_y) },
    ...(r.width != null ? { width: Number(r.width) } : {}),
    ...(r.height != null ? { height: Number(r.height) } : {}),
    ...(r.instructions ? { instructions: r.instructions } : {}),
    ...(r.node_schema ? { schema: r.node_schema } : {}),
  }));

  const edges: DesignEdgeWire[] = edgesRes.rows.map((r) => ({
    id: r.client_edge_id,
    source: r.source_client_node_id,
    target: r.target_client_node_id,
    ...(r.label ? { label: r.label } : {}),
  }));

  return { nodes, edges };
}

designRouter.put(
  '/projects/:id/design',
  validate(projectIdParamSchema, 'params'),
  validate(designBundleSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      if (!(await ensureProjectExists(id))) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      const { nodes, edges } = req.body as DesignBundleInput;

      await withTransaction(async (client) => {
        await client.query(`DELETE FROM design_edges WHERE project_id = $1`, [id]);
        await client.query(`DELETE FROM design_nodes WHERE project_id = $1`, [id]);

        for (const n of nodes) {
          await client.query(
            `INSERT INTO design_nodes
               (project_id, client_node_id, type, label, description,
                position_x, position_y, width, height, instructions, node_schema)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [
              id,
              n.id,
              n.type,
              n.label,
              n.description ?? null,
              n.position.x,
              n.position.y,
              n.width ?? null,
              n.height ?? null,
              n.instructions ?? null,
              n.schema ?? null,
            ]
          );
        }

        for (const e of edges) {
          await client.query(
            `INSERT INTO design_edges
               (project_id, client_edge_id, source_client_node_id, target_client_node_id, label)
             VALUES ($1,$2,$3,$4,$5)`,
            [id, e.id, e.source, e.target, e.label ?? null]
          );
        }

        await client.query(
          `UPDATE projects SET updated_at = now() WHERE id = $1`,
          [id]
        );
      });

      res.json(await loadDesign(id));
    } catch (err) {
      next(err);
    }
  }
);

designRouter.get(
  '/projects/:id/design',
  validate(projectIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      if (!(await ensureProjectExists(id))) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.json(await loadDesign(id));
    } catch (err) {
      next(err);
    }
  }
);
