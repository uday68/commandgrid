import pg from 'pg';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pmt',
  password: process.env.DB_PASSWORD || 'newpassword',
  port: process.env.DB_PORT || 5433,
  max: 20,
  idleTimeoutMillis: 3000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection error:', err);
  } else {
    logger.info('Database connected successfully');
    logger.info('Current database time:', res.rows[0].now);
  }
});

pool.on('connect', () => {
  logger.info('New client connected to database');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export { pool };
