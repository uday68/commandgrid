import { pool } from '../Config/database.js';
import { logger } from '../utils/logger.js';

export async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create integration_types table
    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create integrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS integrations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type_id INTEGER REFERENCES integration_types(id),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'disconnected',
        is_active BOOLEAN DEFAULT TRUE,
        credentials JSONB,
        last_sync TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create user_integrations table for many-to-many relationship
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_integrations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        integration_id INTEGER REFERENCES integrations(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'connected',
        credentials JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, integration_id)
      )
    `);

    // Insert some default integration types
    await client.query(`
      INSERT INTO integration_types (name, description, icon) VALUES
      ('google_drive', 'Google Drive Integration', 'google-drive-icon'),
      ('slack', 'Slack Integration', 'slack-icon'),
      ('github', 'GitHub Integration', 'github-icon'),
      ('jira', 'Jira Integration', 'jira-icon'),
      ('trello', 'Trello Integration', 'trello-icon')
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query('COMMIT');
    logger.info('Integration tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create integration tables:', error);
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
    await client.query('DROP TABLE IF EXISTS user_integrations');
    await client.query('DROP TABLE IF EXISTS integrations');
    await client.query('DROP TABLE IF EXISTS integration_types');

    await client.query('COMMIT');
    logger.info('Integration tables dropped successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to drop integration tables:', error);
    throw error;
  } finally {
    client.release();
  }
}
