-- Fix the role constraint in users table to match backend expectations
-- Current constraint allows: 'Admin', 'Manager', 'Member', 'Developer', 'Project Manager'

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the updated constraint that matches our backend
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role::text = ANY (ARRAY[
  'Admin'::character varying::text, 
  'Manager'::character varying::text, 
  'Member'::character varying::text, 
  'Developer'::character varying::text, 
  'Project Manager'::character varying::text
]));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'users_role_check';
