const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pmt',
  password: 'newpassword',
  port: 5433,
});

async function runMigration() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, 'src', 'migrations', 'add_task_completion_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    await client.query(migrationSQL);
    
    console.log('Migration completed successfully!');
    
    // Check if columns were added
    console.log('Checking tasks table structure...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
      AND column_name IN ('completion_percentage', 'completed_at', 'estimated_hours', 'actual_hours', 'creator_id')
      ORDER BY column_name;
    `);
    
    console.log('New columns added:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
