-- Update the user_roles table
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE user_roles DROP COLUMN IF EXISTS created_at;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Fix role_permissions table structure if needed
DROP TABLE IF EXISTS role_permissions CASCADE;
CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES user_roles(role_id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL,
    PRIMARY KEY (role_id, permission)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions (role_id);

-- Add description field to user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS description TEXT;

-- Add name field if it doesn't exist
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL;

-- Add unique constraint for role names within a company
ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS unique_role_name_per_company;

ALTER TABLE user_roles
ADD CONSTRAINT unique_role_name_per_company UNIQUE (name, company_id);

-- Create index on company_id for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON user_roles (company_id);
