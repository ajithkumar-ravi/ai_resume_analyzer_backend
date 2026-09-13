import { createApp } from '../src/app.js';
import { initDatabase } from '../src/config/db.js';

const app = createApp();

initDatabase().catch((err) => {
  console.warn('Database initialization skipped or failed:', err);
});

// Universal Vercel serverless request handler.
// vercel.json rewrites every /api/* request here, and Express handles routing internally.
export default function handler(req: any, res: any) {
  return app(req, res);
}
