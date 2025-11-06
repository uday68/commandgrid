import { pool } from '../Config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  let client;
  
  try {
    console.log('Running migration: Fix users table constraints');
    client = await pool.connect();
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'fix_users_constraints.sql'), 
      'utf8'
    );
    
    // Split the SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await client.query(statement);
      }
    }
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    if (client) client.release();
    process.exit(0);
  }
}

// Run the migration
runMigration();
