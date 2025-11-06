-- Fix users table constraints to match current application requirements
-- Run this migration to fix the role and user_type constraints

-- 1. First, let's see what role values currently exist (if any)
-- SELECT DISTINCT role FROM users;

-- 2. Drop the existing role check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 3. Add the updated role check constraint to include all valid roles
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role::text = ANY (ARRAY[
    'Admin'::character varying::text,
    'Manager'::character varying::text, 
    'Member'::character varying::text,
    'User'::character varying::text,
    'Developer'::character varying::text,
    'Project Manager'::character varying::text,
    'Team Lead'::character varying::text,
    'Guest'::character varying::text
]));

-- 4. Update the user_type constraint to be more flexible if needed
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check 
CHECK (user_type::text = ANY (ARRAY[
    'individual'::character varying::text,
    'company_user'::character varying::text,
    'team_member'::character varying::text
]));

-- 5. Make sure name field allows NULL temporarily for existing records
ALTER TABLE users ALTER COLUMN name DROP NOT NULL;

-- 6. Update any existing records with NULL names
UPDATE users SET name = COALESCE(first_name || ' ' || last_name, email) WHERE name IS NULL;

-- 7. Add NOT NULL constraint back to name field
ALTER TABLE users ALTER COLUMN name SET NOT NULL;

-- 8. Add a default role for new users if role is not specified
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'User';

-- 9. Add a default user_type if not specified
ALTER TABLE users ALTER COLUMN user_type SET DEFAULT 'individual';

-- 10. Ensure registration_type has valid values
ALTER TABLE users ADD CONSTRAINT users_registration_type_check 
CHECK (registration_type::text = ANY (ARRAY[
    'individual'::character varying::text,
    'team'::character varying::text,
    'company'::character varying::text
]));

-- Show the updated constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND contype IN ('c', 'u')
ORDER BY conname;
