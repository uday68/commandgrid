-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    icon_url VARCHAR(255),
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_integrations table
CREATE TABLE IF NOT EXISTS user_integrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_id INTEGER NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    credentials JSONB,
    status VARCHAR(20) DEFAULT 'disconnected',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, integration_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_category ON integrations(category);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_status ON user_integrations(status);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for both tables
CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_integrations_updated_at
    BEFORE UPDATE ON user_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample integrations
INSERT INTO integrations (name, description, type, category) VALUES
    ('Google Drive', 'Connect to Google Drive for file storage and sharing', 'google_drive', 'storage'),
    ('Slack', 'Integrate with Slack for team communication', 'slack', 'communication'),
    ('GitHub', 'Connect to GitHub for version control and collaboration', 'github', 'development'),
    ('Jira', 'Integrate with Jira for project management', 'jira', 'project_management'),
    ('Trello', 'Connect to Trello for task management', 'trello', 'project_management'),
    ('Microsoft Teams', 'Integrate with Microsoft Teams for team collaboration', 'teams', 'communication'),
    ('Dropbox', 'Connect to Dropbox for file storage and sharing', 'dropbox', 'storage'),
    ('Zoom', 'Integrate with Zoom for video conferencing', 'zoom', 'communication'),
    ('Asana', 'Connect to Asana for project management', 'asana', 'project_management'),
    ('Notion', 'Integrate with Notion for documentation and collaboration', 'notion', 'productivity')
ON CONFLICT (id) DO NOTHING; 