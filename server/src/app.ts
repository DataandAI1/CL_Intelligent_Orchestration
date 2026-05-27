import cors from 'cors';
import express, { Express } from 'express';
import { errorHandler, notFound } from './middleware/error-handler';
import { requestId } from './middleware/request-id';
import { artifactsRouter } from './routes/artifacts';
import { designRouter } from './routes/design';
import { healthRouter } from './routes/health';
import { projectsRouter } from './routes/projects';
import { requirementsRouter } from './routes/requirements';

export function createApp(): Express {
  const app = express();
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(
    cors({
      origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()),
      credentials: false,
    })
  );
  app.use(express.json({ limit: '10mb' }));

  app.use('/api', healthRouter);
  app.use('/api', projectsRouter);
  app.use('/api', requirementsRouter);
  app.use('/api', designRouter);
  app.use('/api', artifactsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
