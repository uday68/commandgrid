-- Create user_current_context table
CREATE TABLE IF NOT EXISTS user_current_context (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  context_id INTEGER NOT NULL,
  context_type VARCHAR(10) NOT NULL CHECK (context_type IN ('user', 'company', 'team')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_current_context_user_id ON user_current_context(user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_current_context_updated_at
  BEFORE UPDATE ON user_current_context
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 