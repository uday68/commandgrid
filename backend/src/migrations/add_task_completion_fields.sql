-- Add missing columns to tasks table for analytics
-- Date: 2025-06-16

-- Add completion_percentage column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completion_percentage NUMERIC(5,2) DEFAULT 0 
CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

-- Add completed_at column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add estimated_hours column if it doesn't exist
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8,2) DEFAULT 0;

-- Add actual_hours column if it doesn't exist
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(8,2) DEFAULT 0;

-- Add creator_id column if it doesn't exist (for who created the task)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(user_id) ON DELETE SET NULL;

-- Create trigger to automatically set completed_at when status changes to 'Completed'
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is changing to Completed and completed_at is not set
    IF NEW.status = 'Completed' AND OLD.status != 'Completed' AND NEW.completed_at IS NULL THEN
        NEW.completed_at = NOW();
        -- Auto-set completion percentage to 100% if not already set
        IF NEW.completion_percentage < 100 THEN
            NEW.completion_percentage = 100;
        END IF;
    -- If status is changing from Completed to something else
    ELSIF NEW.status != 'Completed' AND OLD.status = 'Completed' THEN
        NEW.completed_at = NULL;
        -- Optionally reset completion percentage
        IF NEW.completion_percentage = 100 THEN
            NEW.completion_percentage = 0;
        END IF;
    END IF;
    
    -- Always update the updated_at timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_set_task_completed_at ON tasks;
CREATE TRIGGER trigger_set_task_completed_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_task_completed_at();

-- Create index for better performance on analytics queries
CREATE INDEX IF NOT EXISTS idx_tasks_completion_status ON tasks(status, completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_completion_percentage ON tasks(completion_percentage);
CREATE INDEX IF NOT EXISTS idx_tasks_company_created ON tasks(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assigned_to, status);

-- Update existing completed tasks to have completed_at set
UPDATE tasks 
SET completed_at = updated_at, completion_percentage = 100 
WHERE status = 'Completed' AND completed_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN tasks.completion_percentage IS 'Task completion percentage (0-100)';
COMMENT ON COLUMN tasks.completed_at IS 'Timestamp when task was marked as completed';
COMMENT ON COLUMN tasks.estimated_hours IS 'Estimated hours to complete the task';
COMMENT ON COLUMN tasks.actual_hours IS 'Actual hours spent on the task';
COMMENT ON COLUMN tasks.creator_id IS 'User who created the task';
