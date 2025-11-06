-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES user_roles(role_id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL,
    PRIMARY KEY (role_id, permission)
);

-- Create user_role_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_role_assignments (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES user_roles(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON user_roles (company_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON user_role_assignments (role_id);

-- Add unique constraint to prevent duplicate role names within a company
ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS unique_role_name_per_company;

ALTER TABLE user_roles
ADD CONSTRAINT unique_role_name_per_company UNIQUE (name, company_id);
