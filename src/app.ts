import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import analysisRoutes from './routes/analysis.routes.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { env } from './config/env.js';

export function createApp(): Express {
  const app = express();

  // Trust proxy for reverse proxies like Vercel / Cloud Run / Nginx
  app.set('trust proxy', 1);

  // Disable x-powered-by header
  app.disable('x-powered-by');

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration — allow the deployed frontend origin(s)
  // CORS_ORIGIN can be a single origin or a comma-separated list of origins.
  const allowedOrigins =
    env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim());

  app.use(
    cors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsers for JSON and URL-encoded data
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Root sanity check (this is now a pure API service, no frontend is served here)
  app.get('/', (req, res) => {
    res.json({ service: 'AI Resume Analyzer API', status: 'ok' });
  });

  // API Routes mounted under both /api/v1 and /api for backwards & forwards compatibility
  app.use('/api/v1', analysisRoutes);
  app.use('/api', analysisRoutes);

  // Fallback root health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Catch-all 404 for unhandled API endpoints
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
