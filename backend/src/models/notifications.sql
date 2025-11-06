-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  delivery_status ENUM('pending', 'delivered', 'failed') DEFAULT 'pending',
  delivery_method ENUM('email', 'push', 'in_app') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP NULL,
  viewed_at TIMESTAMP NULL,
  clicked_at TIMESTAMP NULL,
  action_taken VARCHAR(50) NULL,
  action_at TIMESTAMP NULL,
  metadata JSON NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  email_preferences JSON NULL,
  push_preferences JSON NULL,
  in_app_preferences JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_preferences (user_id)
);

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  variables JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_template_type (type)
);

-- Create notification analytics table
CREATE TABLE IF NOT EXISTS notification_analytics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  notification_id INT NOT NULL,
  user_id INT NOT NULL,
  event_type ENUM('view', 'click', 'action') NOT NULL,
  event_data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notification_analytics_notification_id ON notification_analytics(notification_id);
CREATE INDEX idx_notification_analytics_user_id ON notification_analytics(user_id);
CREATE INDEX idx_notification_analytics_event_type ON notification_analytics(event_type);
CREATE INDEX idx_notification_analytics_created_at ON notification_analytics(created_at);

-- Insert default notification templates
INSERT INTO notification_templates (type, name, subject, body, variables) VALUES
('task_assigned', 'Task Assigned', 'New Task Assigned: {{taskName}}', 'You have been assigned a new task: {{taskName}}\n\nDescription: {{taskDescription}}\n\nDue Date: {{dueDate}}\n\nClick here to view the task: {{taskUrl}}', '["taskName", "taskDescription", "dueDate", "taskUrl"]'),
('task_updated', 'Task Updated', 'Task Updated: {{taskName}}', 'The task "{{taskName}}" has been updated.\n\nChanges:\n{{changes}}\n\nClick here to view the task: {{taskUrl}}', '["taskName", "changes", "taskUrl"]'),
('task_due_soon', 'Task Due Soon', 'Task Due Soon: {{taskName}}', 'The task "{{taskName}}" is due soon.\n\nDue Date: {{dueDate}}\n\nClick here to view the task: {{taskUrl}}', '["taskName", "dueDate", "taskUrl"]'),
('meeting_scheduled', 'Meeting Scheduled', 'New Meeting Scheduled: {{meetingTitle}}', 'A new meeting has been scheduled:\n\nTitle: {{meetingTitle}}\nDate: {{meetingDate}}\nTime: {{meetingTime}}\nLocation: {{meetingLocation}}\n\nClick here to view the meeting: {{meetingUrl}}', '["meetingTitle", "meetingDate", "meetingTime", "meetingLocation", "meetingUrl"]'),
('meeting_reminder', 'Meeting Reminder', 'Meeting Reminder: {{meetingTitle}}', 'Reminder: You have a meeting coming up:\n\nTitle: {{meetingTitle}}\nDate: {{meetingDate}}\nTime: {{meetingTime}}\nLocation: {{meetingLocation}}\n\nClick here to join the meeting: {{meetingUrl}}', '["meetingTitle", "meetingDate", "meetingTime", "meetingLocation", "meetingUrl"]'),
('project_update', 'Project Update', 'Project Update: {{projectName}}', 'There has been an update to the project "{{projectName}}":\n\n{{updateDetails}}\n\nClick here to view the project: {{projectUrl}}', '["projectName", "updateDetails", "projectUrl"]'),
('system_notification', 'System Notification', '{{title}}', '{{message}}\n\n{{actionText}}: {{actionUrl}}', '["title", "message", "actionText", "actionUrl"]'); 