import pkg from 'pg';
const { Pool } = pkg;

console.log('Initializing database connection...');

export const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pmt',
  password: process.env.DB_PASSWORD || 'newpassword',
  port: process.env.DB_PORT || 5433,
  max: 20,
  idleTimeoutMillis: 3000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL ✅');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default { pool };
