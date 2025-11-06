import runMigrations from '../Config/runMigrations.js';
import { pool } from '../Config/database.js';

async function setupDatabase() {
  try {
    // Test database connection
    const client = await pool.connect();
    console.log('Database connection successful');
    client.release();

    // Run migrations
    await runMigrations();
    
    console.log('Database setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase(); 