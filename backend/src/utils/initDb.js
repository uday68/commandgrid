import { pool } from '../Config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize database schema from SQL file
 */
async function initDatabase() {
  try {
    console.log('Initializing database schema...');
    
    // Read the schema SQL file
    const schemaFilePath = path.join(__dirname, '../models/db.sql');
    const schemaSql = fs.readFileSync(schemaFilePath, 'utf8');
    
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Execute the schema SQL
      await client.query(schemaSql);
      console.log('Database schema initialized successfully! ✅');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  }
}

// Run the initialization
initDatabase();

export default initDatabase;
