import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

export function validate<T extends ZodTypeAny>(
  schema: T,
  part: RequestPart = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[part]);
    if (!parsed.success) {
      const err: Error & { status?: number; details?: unknown } = new Error('Validation failed');
      err.status = 400;
      err.details = parsed.error.flatten();
      next(err);
      return;
    }
    // Replace with the parsed (and possibly coerced) data for downstream handlers.
    (req as unknown as Record<RequestPart, z.infer<T>>)[part] = parsed.data;
    next();
  };
}
