import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Use `any` to avoid static import of sequelize which pulls in native mysql2 bindings
// that crash on serverless platforms (Vercel/Lambda) when compiled binaries are missing.
let sequelize: any = null;
let isMySqlConnected = false;

export function getSequelize(): any {
  return sequelize;
}

export function isDatabaseConnected(): boolean {
  return isMySqlConnected;
}

export async function initDatabase(): Promise<void> {
  if (env.DB_HOST && env.DB_NAME && env.DB_USER) {
    try {
      // Dynamic import — only loads sequelize + mysql2 native bindings when DB is actually configured.
      // This prevents cold-start crashes on serverless platforms where native bindings may be missing.
      const { Sequelize } = await import('sequelize');

      logger.info(`Attempting MySQL connection to ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}...`);
      sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
        host: env.DB_HOST,
        port: env.DB_PORT,
        dialect: 'mysql',
        logging: false,
        pool: {
          max: 5,
          min: 0,
          acquire: 10000,
          idle: 10000,
        },
      });

      await sequelize.authenticate();
      isMySqlConnected = true;
      logger.info('Connected to MySQL successfully.');
      await sequelize.sync();
      logger.info('MySQL models synchronized.');
      return;
    } catch (err: any) {
      logger.warn(`MySQL connection could not be established: ${err.message}. Running in in-memory session mode.`);
      sequelize = null;
      isMySqlConnected = false;
    }
  } else {
    logger.info('MySQL credentials not configured. Running in memory-backed mode (no SQLite or db_storage file needed).');
  }
}

export { sequelize };
