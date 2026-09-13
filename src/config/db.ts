import { Sequelize } from 'sequelize';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let sequelize: Sequelize | null = null;
let isMySqlConnected = false;

export function getSequelize(): Sequelize | null {
  return sequelize;
}

export function isDatabaseConnected(): boolean {
  return isMySqlConnected;
}

export async function initDatabase(): Promise<void> {
  if (env.DB_HOST && env.DB_NAME && env.DB_USER) {
    try {
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
