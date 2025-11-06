-- Create marketplace_tools table
CREATE TABLE IF NOT EXISTS marketplace_tools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(255),
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  available_for VARCHAR(20) NOT NULL CHECK (available_for IN ('all', 'user', 'company', 'team')),
  features JSONB NOT NULL DEFAULT '[]',
  requirements TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create marketplace_purchases table
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id INTEGER NOT NULL REFERENCES marketplace_tools(id) ON DELETE CASCADE,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, tool_id)
);

-- Create marketplace_reviews table
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id INTEGER NOT NULL REFERENCES marketplace_tools(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, tool_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketplace_tools_category ON marketplace_tools(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_tools_available_for ON marketplace_tools(available_for);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_user_id ON marketplace_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_tool_id ON marketplace_purchases(tool_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_tool_id ON marketplace_reviews(tool_id);

-- Add trigger to update updated_at timestamp for marketplace_tools
CREATE OR REPLACE FUNCTION update_marketplace_tools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_marketplace_tools_updated_at
  BEFORE UPDATE ON marketplace_tools
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_tools_updated_at();

-- Add trigger to update updated_at timestamp for marketplace_reviews
CREATE OR REPLACE FUNCTION update_marketplace_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_marketplace_reviews_updated_at
  BEFORE UPDATE ON marketplace_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_reviews_updated_at();

-- Insert some sample tools
INSERT INTO marketplace_tools (name, description, price, category, available_for, features, requirements)
VALUES
  (
    'Advanced Analytics Dashboard',
    'Get detailed insights into your project performance with customizable charts and reports.',
    49.99,
    'analytics',
    'all',
    '["Real-time analytics", "Custom reports", "Export to PDF", "Team collaboration"]',
    'Requires admin access to view team data'
  ),
  (
    'Team Communication Hub',
    'Enhance team collaboration with integrated chat, video calls, and file sharing.',
    29.99,
    'communication',
    'team',
    '["Video calls", "File sharing", "Team chat", "Screen sharing"]',
    'Requires team membership'
  ),
  (
    'Project Automation Suite',
    'Automate repetitive tasks and streamline your workflow.',
    39.99,
    'automation',
    'company',
    '["Task automation", "Workflow templates", "Custom triggers", "Integration support"]',
    'Requires company admin approval'
  ),
  (
    'Personal Productivity Tools',
    'Boost your individual productivity with task management and time tracking.',
    19.99,
    'productivity',
    'user',
    '["Task management", "Time tracking", "Goal setting", "Progress reports"]',
    'No special requirements'
  ); 