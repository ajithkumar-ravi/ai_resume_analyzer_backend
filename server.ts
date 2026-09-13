import { createApp } from './src/app.js';
import { initDatabase } from './src/config/db.js';
import { logger } from './src/utils/logger.js';
import { env } from './src/config/env.js';

async function startServer() {
  const app = createApp();

  // Initialize DB asynchronously so server starts quickly
  initDatabase().catch((err) => {
    logger.error('Failed to initialize database:', err);
  });

  app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`AI Resume Analyzer API running at http://localhost:${env.PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
