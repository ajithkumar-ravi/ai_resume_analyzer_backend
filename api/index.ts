import { createApp } from '../src/app.ts';
import { initDatabase } from '../src/config/db.ts';

const app = createApp();

initDatabase().catch((err) => {
  console.warn('Database initialization skipped or failed:', err);
});

// Universal Vercel serverless request handler.
// vercel.json rewrites every /api/* request here, and Express handles routing internally.
export default function handler(req: any, res: any) {
  return app(req, res);
}
