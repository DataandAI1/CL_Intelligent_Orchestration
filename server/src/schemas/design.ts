import { z } from 'zod';
import { NODE_TYPES } from '../types';

const nodeSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.enum(NODE_TYPES as [string, ...string[]]),
  label: z.string().min(1).max(500),
  description: z.string().max(10_000).optional(),
  position: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  width: z.number().positive().finite().optional(),
  height: z.number().positive().finite().optional(),
  instructions: z.string().max(50_000).optional(),
  schema: z.string().max(50_000).optional(),
});

const edgeSchema = z.object({
  id: z.string().min(1).max(255),
  source: z.string().min(1).max(255),
  target: z.string().min(1).max(255),
  label: z.string().max(500).optional(),
});

export const designBundleSchema = z.object({
  nodes: z.array(nodeSchema).default([]),
  edges: z.array(edgeSchema).default([]),
});

export type DesignBundleInput = z.infer<typeof designBundleSchema>;
