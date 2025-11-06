-- Create project_submissions table for Project Manager submissions to Admin
-- Date: 2025-06-16

CREATE TABLE IF NOT EXISTS project_submissions (
    submission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES users(user_id),
    summary_report TEXT NOT NULL,
    completion_notes TEXT,
    next_steps TEXT,
    files_included JSONB DEFAULT '[]'::jsonb,
    reports_included JSONB DEFAULT '[]'::jsonb,
    project_stats JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
    admin_feedback TEXT,
    reviewed_by UUID REFERENCES admins(admin_id),
    reviewed_at TIMESTAMP,
    submitted_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_submissions_project_id ON project_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_submissions_submitted_by ON project_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_project_submissions_status ON project_submissions(status);
CREATE INDEX IF NOT EXISTS idx_project_submissions_submitted_at ON project_submissions(submitted_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_project_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_submissions_updated_at
    BEFORE UPDATE ON project_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_project_submissions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE project_submissions IS 'Stores project submissions from Project Managers to Admin for review';
COMMENT ON COLUMN project_submissions.submission_id IS 'Unique identifier for the submission';
COMMENT ON COLUMN project_submissions.project_id IS 'Reference to the submitted project';
COMMENT ON COLUMN project_submissions.submitted_by IS 'Project Manager who submitted the project';
COMMENT ON COLUMN project_submissions.summary_report IS 'Comprehensive project summary provided by PM';
COMMENT ON COLUMN project_submissions.completion_notes IS 'Additional notes about project completion';
COMMENT ON COLUMN project_submissions.next_steps IS 'Recommended follow-up actions';
COMMENT ON COLUMN project_submissions.files_included IS 'JSON array of file metadata included in submission';
COMMENT ON COLUMN project_submissions.reports_included IS 'JSON array of report metadata included in submission';
COMMENT ON COLUMN project_submissions.project_stats IS 'JSON object containing project statistics';
COMMENT ON COLUMN project_submissions.status IS 'Current status of the submission (pending, reviewed, approved, rejected)';
COMMENT ON COLUMN project_submissions.admin_feedback IS 'Feedback provided by Admin during review';
COMMENT ON COLUMN project_submissions.reviewed_by IS 'Admin who reviewed the submission';
COMMENT ON COLUMN project_submissions.reviewed_at IS 'Timestamp when the submission was reviewed';

-- Insert sample data for testing (optional)
-- INSERT INTO project_submissions (
--     project_id, 
--     submitted_by, 
--     summary_report, 
--     completion_notes,
--     next_steps,
--     status
-- ) VALUES (
--     (SELECT project_id FROM projects LIMIT 1),
--     (SELECT user_id FROM users WHERE role = 'Project Manager' LIMIT 1),
--     'Sample project completed successfully with all deliverables met.',
--     'All team members performed excellently. Minor issues resolved during sprint reviews.',
--     'Recommend conducting post-project review and archiving project documents.',
--     'pending'
-- );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON project_submissions TO project_manager_role;
GRANT SELECT, UPDATE ON project_submissions TO admin_role;
