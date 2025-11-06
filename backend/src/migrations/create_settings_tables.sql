-- User Settings Table - Stores all user settings in JSON columns
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    appearance JSONB NOT NULL DEFAULT '{}',
    notifications JSONB NOT NULL DEFAULT '{}',
    privacy JSONB NOT NULL DEFAULT '{}',
    language JSONB NOT NULL DEFAULT '{}',
    sound JSONB NOT NULL DEFAULT '{}',
    accessibility JSONB NOT NULL DEFAULT '{}',
    keyboard JSONB NOT NULL DEFAULT '{}',
    ai JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sound Files Table - Stores available sound options
CREATE TABLE IF NOT EXISTS sound_files (
    sound_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default sound options
INSERT INTO sound_files (name, display_name, category, file_path) 
VALUES 
    ('default', 'Default', 'notification', '/sounds/notification/default.mp3'),
    ('bell', 'Bell', 'notification', '/sounds/notification/bell.mp3'),
    ('chime', 'Chime', 'notification', '/sounds/notification/chime.mp3'),
    ('subtle', 'Subtle', 'notification', '/sounds/notification/subtle.mp3'),
    ('default', 'Default', 'message', '/sounds/message/default.mp3'),
    ('pop', 'Pop', 'message', '/sounds/message/pop.mp3'),
    ('subtle', 'Subtle', 'message', '/sounds/message/subtle.mp3'),
    ('ring1', 'Ring 1', 'call', '/sounds/call/ring1.mp3'),
    ('ring2', 'Ring 2', 'call', '/sounds/call/ring2.mp3'),
    ('classic', 'Classic', 'call', '/sounds/call/classic.mp3'),
    ('digital', 'Digital', 'call', '/sounds/call/digital.mp3')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at);
