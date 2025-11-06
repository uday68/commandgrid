-- Create admin_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_stats (
    stat_id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL UNIQUE,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_projects INTEGER DEFAULT 0,
    active_projects INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    total_teams INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_tasks (
    task_id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'medium',
    assigned_to UUID,
    project_id UUID,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data for admin_stats
INSERT INTO admin_stats (company_id, total_users, active_users, total_projects, active_projects, total_tasks, completed_tasks, total_teams)
VALUES 
    ('00000000-0000-0000-0000-000000000000', 10, 8, 5, 3, 20, 12, 2)
ON CONFLICT (company_id) DO UPDATE
SET 
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    total_projects = EXCLUDED.total_projects,
    active_projects = EXCLUDED.active_projects,
    total_tasks = EXCLUDED.total_tasks,
    completed_tasks = EXCLUDED.completed_tasks,
    total_teams = EXCLUDED.total_teams,
    last_updated = CURRENT_TIMESTAMP;

-- Insert sample data for admin_tasks
INSERT INTO admin_tasks (company_id, title, description, status, priority, due_date)
VALUES 
    ('00000000-0000-0000-0000-000000000000', 'System Update', 'Perform system maintenance and updates', 'pending', 'high', CURRENT_TIMESTAMP + INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000000', 'Database Backup', 'Schedule regular database backups', 'in_progress', 'medium', CURRENT_TIMESTAMP + INTERVAL '3 days'),
    ('00000000-0000-0000-0000-000000000000', 'Security Audit', 'Conduct quarterly security audit', 'pending', 'high', CURRENT_TIMESTAMP + INTERVAL '14 days'),
    ('00000000-0000-0000-0000-000000000000', 'User Training', 'Organize user training session', 'completed', 'low', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000000', 'Performance Review', 'Review system performance metrics', 'pending', 'medium', CURRENT_TIMESTAMP + INTERVAL '5 days');

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
    meeting_id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    duration INTEGER NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern VARCHAR(50),
    is_public BOOLEAN DEFAULT TRUE,
    project_id UUID REFERENCES projects(project_id),
    team_id UUID REFERENCES teams(team_id),
    created_by UUID NOT NULL REFERENCES users(user_id),
    meeting_link VARCHAR(255),
    agenda TEXT,
    company_id UUID NOT NULL REFERENCES companies(company_id),
    meeting_context VARCHAR(50) NOT NULL,
    created_user_role VARCHAR(50) NOT NULL,
    file_id UUID,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create meeting participants table
CREATE TABLE IF NOT EXISTS meeting_participants (
    meeting_id UUID REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id),
    status VARCHAR(50) DEFAULT 'pending',
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (meeting_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_company_id ON meetings(company_id);
CREATE INDEX IF NOT EXISTS idx_meetings_project_id ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_team_id ON meetings(team_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_status ON meeting_participants(status);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_stats_company_id ON admin_stats(company_id);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_company_id ON admin_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON admin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_due_date ON admin_tasks(due_date);

-- Create project_submissions table for Project Manager submissions to Admin
CREATE TABLE IF NOT EXISTS project_submissions (
    submission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL,
    submitted_by UUID NOT NULL,
    summary_report TEXT NOT NULL,
    completion_notes TEXT,
    next_steps TEXT,
    files_included JSONB DEFAULT '[]'::jsonb,
    reports_included JSONB DEFAULT '[]'::jsonb,
    project_stats JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
    admin_feedback TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    submitted_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for project submissions
CREATE INDEX IF NOT EXISTS idx_project_submissions_project_id ON project_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_submissions_submitted_by ON project_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_project_submissions_status ON project_submissions(status);
CREATE INDEX IF NOT EXISTS idx_project_submissions_submitted_at ON project_submissions(submitted_at DESC);

-- Create project_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_files (
    file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by UUID,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for project files
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);