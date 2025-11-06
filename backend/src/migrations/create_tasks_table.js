import { pool } from '../Config/database.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        task_id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        assigned_to INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        assigned_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        due_date TIMESTAMP WITH TIME ZONE,
        priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'review', 'completed', 'blocked', 'archived')),
        tags TEXT[] DEFAULT '{}',
        attachments TEXT[] DEFAULT '{}',
        estimated_hours DECIMAL(10,2),
        actual_hours DECIMAL(10,2) DEFAULT 0,
        dependencies INTEGER[] DEFAULT '{}',
        checklist JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create task activities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_activities (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create task comments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_comments (
        comment_id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create task attachments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_attachments (
        attachment_id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        file_type VARCHAR(100),
        file_size INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create task dependencies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        task_id INTEGER NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
        dependency_id INTEGER NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (task_id, dependency_id)
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON task_activities(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_activities_user_id ON task_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_attachments_user_id ON task_attachments(user_id);
      CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_dependencies_dependency_id ON task_dependencies(dependency_id);
    `);

    // Create function to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at
    await client.query(`
      CREATE TRIGGER update_tasks_updated_at
        BEFORE UPDATE ON tasks
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_task_comments_updated_at
        BEFORE UPDATE ON task_comments
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const down = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop triggers
    await client.query(`
      DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
      DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;
    `);

    // Drop function
    await client.query(`
      DROP FUNCTION IF EXISTS update_updated_at_column();
    `);

    // Drop tables
    await client.query(`
      DROP TABLE IF EXISTS task_dependencies;
      DROP TABLE IF EXISTS task_attachments;
      DROP TABLE IF EXISTS task_comments;
      DROP TABLE IF EXISTS task_activities;
      DROP TABLE IF EXISTS tasks;
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}; 