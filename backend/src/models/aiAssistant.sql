-- AI Assistant Sessions
CREATE TABLE ai_assistant_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    context JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Assistant Messages
CREATE TABLE ai_assistant_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES ai_assistant_sessions(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Assistant Recommendations
CREATE TABLE ai_assistant_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Assistant User Preferences
CREATE TABLE ai_assistant_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_ai_assistant_sessions_user_id ON ai_assistant_sessions(user_id);
CREATE INDEX idx_ai_assistant_messages_session_id ON ai_assistant_messages(session_id);
CREATE INDEX idx_ai_assistant_recommendations_user_id ON ai_assistant_recommendations(user_id);
CREATE INDEX idx_ai_assistant_preferences_user_id ON ai_assistant_preferences(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_ai_assistant_sessions_updated_at
    BEFORE UPDATE ON ai_assistant_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_assistant_recommendations_updated_at
    BEFORE UPDATE ON ai_assistant_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_assistant_preferences_updated_at
    BEFORE UPDATE ON ai_assistant_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 