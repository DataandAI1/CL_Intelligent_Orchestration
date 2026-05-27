import type { NextFunction, Request, Response } from 'express';

export interface HttpError extends Error {
  status?: number;
  details?: unknown;
}

export function notFound(_req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(
  err: HttpError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const payload: Record<string, unknown> = {
    error: err.message || 'Internal Server Error',
    requestId: req.requestId,
  };
  if (err.details !== undefined) {
    payload.details = err.details;
  }
  if (status >= 500) {
    console.error(`[${req.requestId}] ${req.method} ${req.path} -> ${status}`, err);
  }
  res.status(status).json(payload);
}
