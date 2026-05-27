import { z } from 'zod';

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(10_000).optional().nullable(),
});

export const projectUpdateSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(10_000).nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: 'Provide at least one of: name, description',
  });

export const projectIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
