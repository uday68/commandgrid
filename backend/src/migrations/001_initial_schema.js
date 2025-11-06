import { pool } from '../Config/database.js';
import { logger } from '../utils/logger.js';

export async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create teams table
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create team_members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        added_by INTEGER REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(team_id, user_id)
      )
    `);

    // Create projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create project_members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        added_by INTEGER REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(project_id, user_id)
      )
    `);

    // Create tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        creator_id INTEGER REFERENCES users(id),
        assignee_id INTEGER REFERENCES users(id),
        priority VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'todo',
        due_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create file_uploads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_uploads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        upload_date TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create activity_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ip_address VARCHAR(45) NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        action_details JSONB,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create metrics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        value NUMERIC NOT NULL,
        tags JSONB,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        recorded_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        filters JSONB,
        generated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create security_threats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_threats (
        id SERIAL PRIMARY KEY,
        threat_name VARCHAR(100) NOT NULL,
        description TEXT,
        severity VARCHAR(50) DEFAULT 'medium',
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    logger.info('Database schema created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create database schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop tables in reverse order
    await client.query('DROP TABLE IF EXISTS security_threats');
    await client.query('DROP TABLE IF EXISTS reports');
    await client.query('DROP TABLE IF EXISTS metrics');
    await client.query('DROP TABLE IF EXISTS audit_logs');
    await client.query('DROP TABLE IF EXISTS activity_logs');
    await client.query('DROP TABLE IF EXISTS file_uploads');
    await client.query('DROP TABLE IF EXISTS tasks');
    await client.query('DROP TABLE IF EXISTS project_members');
    await client.query('DROP TABLE IF EXISTS projects');
    await client.query('DROP TABLE IF EXISTS team_members');
    await client.query('DROP TABLE IF EXISTS teams');
    await client.query('DROP TABLE IF EXISTS users');

    await client.query('COMMIT');
    logger.info('Database schema dropped successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to drop database schema:', error);
    throw error;
  } finally {
    client.release();
  }
} 