import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function runMigration() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, '20240320_notification_system.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    console.log('Notification system SQL migration completed!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
} 