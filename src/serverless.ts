import { createApp } from './app.js';
import { initDatabase } from './config/db.js';

let app: ReturnType<typeof createApp>;

try {
  app = createApp();
} catch (err: any) {
  console.error('FATAL: Failed to create Express app during cold start:', err);
  // Provide a minimal fallback handler so Vercel returns a useful error
  // instead of an opaque FUNCTION_INVOCATION_FAILED
  app = ((req: any, res: any) => {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: 'Server initialization failed. Please check deployment logs.',
    }));
  }) as any;
}

// Initialize DB asynchronously — non-blocking, won't crash the function
initDatabase().catch((err) => {
  console.warn('Database initialization skipped or failed:', err);
});

// Universal Vercel serverless request handler.
// vercel.json rewrites requests here, and Express handles routing internally.
export default function handler(req: any, res: any) {
  // Restore original request URL if Vercel internal rewrite changed req.url to /api/index
  if (req.url && (req.url.startsWith('/api/index') || req.url === '/api' || req.url === '/api/')) {
    const originalUrl = req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'];
    if (typeof originalUrl === 'string' && originalUrl.length > 0) {
      req.url = originalUrl;
    }
  }
  return app(req, res);
}
