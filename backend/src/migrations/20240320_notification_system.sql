-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
    user_id UUID NOT NULL REFERENCES PUBLIC.USERS(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'unread',
    delivery_status VARCHAR(20) DEFAULT 'pending',
    delivery_method VARCHAR(20) DEFAULT 'in_app',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    action_taken VARCHAR(50),
    action_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
    user_id UUID NOT NULL REFERENCES PUBLIC.USERS(user_id) ON DELETE CASCADE,
    email BOOLEAN DEFAULT true,
    push BOOLEAN DEFAULT true,
    in_app BOOLEAN DEFAULT true,
    task_updates BOOLEAN DEFAULT true,
    meeting_reminders BOOLEAN DEFAULT true,
    project_updates BOOLEAN DEFAULT true,
    comments BOOLEAN DEFAULT true,
    mentions BOOLEAN DEFAULT true,
    system_updates BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    template_id UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
    type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type)
);

-- Create notification_analytics table
CREATE TABLE IF NOT EXISTS notification_analytics (
    id UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
    notification_id UUID REFERENCES notifications(notification_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES PUBLIC.USERS(user_id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_notification_id ON notification_analytics(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_user_id ON notification_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_event_type ON notification_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_created_at ON notification_analytics(created_at);

-- Insert default notification templates
INSERT INTO notification_templates (type, name, subject, body, variables) VALUES
('task_assigned', 'Task Assigned', 'New Task Assignment', 'You have been assigned a new task: {{task_name}}', '["task_name", "task_id", "project_name"]'),
('task_updated', 'Task Updated', 'Task Update', 'Task "{{task_name}}" has been updated', '["task_name", "task_id", "project_name", "changes"]'),
('task_completed', 'Task Completed', 'Task Completed', 'Task "{{task_name}}" has been completed', '["task_name", "task_id", "project_name"]'),
('meeting_reminder', 'Meeting Reminder', 'Upcoming Meeting', 'Reminder: Meeting "{{meeting_name}}" starts in {{time_until}}', '["meeting_name", "meeting_id", "time_until", "meeting_link"]'),
('project_update', 'Project Update', 'Project Status Update', 'Project "{{project_name}}" status has been updated to {{status}}', '["project_name", "project_id", "status", "changes"]'),
('comment_added', 'New Comment', 'New Comment on {{item_type}}', '{{user_name}} commented on {{item_type}} "{{item_name}}"', '["user_name", "item_type", "item_name", "item_id", "comment"]'),
('mention', 'Mention', 'You were mentioned', '{{user_name}} mentioned you in {{item_type}} "{{item_name}}"', '["user_name", "item_type", "item_name", "item_id"]'),
('system', 'System Notification', 'System Update', '{{message}}', '["message", "action_required"]')
ON CONFLICT (type) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    variables = EXCLUDED.variables,
    updated_at = CURRENT_TIMESTAMP;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 