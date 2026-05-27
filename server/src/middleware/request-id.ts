import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.header('x-request-id');
  const id = headerId && headerId.length <= 128 ? headerId : randomUUID();
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
