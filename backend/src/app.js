import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { query } from './db/index.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import { notFound, errorHandler } from './middleware/errors.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // Azure Container Apps sits behind a proxy
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // allow tools like curl/Postman (no origin) and the configured frontends
        if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) return cb(null, true);
        const err = new Error(`Origin ${origin} is not allowed. Add it to CORS_ORIGIN on the API.`);
        err.status = 403;
        cb(err);
      },
    })
  );
  app.use(express.json({ limit: '1mb' }));
  if (config.nodeEnv !== 'test') app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/', (_req, res) => res.json({ name: 'DevConnect API', docs: '/api/health' }));

  app.get('/api/health', async (_req, res) => {
    try {
      await query('SELECT 1');
      res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'error', database: 'unreachable' });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/posts', postRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
