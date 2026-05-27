import { z } from 'zod';

const itemSchema = z.object({
  content: z.string().min(1).max(2_000),
});

export const requirementsBundleSchema = z.object({
  goals: z.array(itemSchema).default([]),
  processes: z.array(itemSchema).default([]),
  useCases: z.array(itemSchema).default([]),
  technologies: z.array(itemSchema).default([]),
  dataSources: z.array(itemSchema).default([]),
  humanInTheLoop: z.array(itemSchema).default([]),
});

export type RequirementsBundleInput = z.infer<typeof requirementsBundleSchema>;
