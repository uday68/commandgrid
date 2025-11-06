import { pool } from '../Config/database.js';

async function testConnection() {
  try {
    console.log('Attempting to connect to the database...');
    const client = await pool.connect();
    console.log('Successfully connected to the database!');
    
    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('Database time:', result.rows[0].now);
    
    client.release();
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

testConnection(); 