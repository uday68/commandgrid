-- AI Assistance Sessions Table
CREATE TABLE IF NOT EXISTS ai_assistance_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    context VARCHAR(50) NOT NULL,
    initial_prompt TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    model_version VARCHAR(50)
);

-- AI Interactions Table
CREATE TABLE IF NOT EXISTS ai_interactions (
    interaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES ai_assistance_sessions(session_id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    context_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tokens_used INTEGER,
    feedback_score SMALLINT
);

-- AI Feedback Table
CREATE TABLE IF NOT EXISTS ai_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    interaction_id UUID REFERENCES ai_interactions(interaction_id) ON DELETE SET NULL,
    rating SMALLINT NOT NULL,
    comments TEXT,
    corrected_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Recommendations Table
CREATE TABLE IF NOT EXISTS ai_recommendations (
    recommendation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    confidence_score NUMERIC(3, 2),
    viewed BOOLEAN DEFAULT false,
    acted_upon BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- AI Usage Statistics Table
CREATE TABLE IF NOT EXISTS ai_usage_statistics (
    stat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    tokens_used INTEGER NOT NULL,
    requests_count INTEGER NOT NULL,
    duration_ms INTEGER,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Models Table
CREATE TABLE IF NOT EXISTS ai_models (
    model_id VARCHAR(50) PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    description TEXT,
    capabilities TEXT[],
    token_limit INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some default models
INSERT INTO ai_models (model_id, model_name, provider, description, capabilities, token_limit, is_active)
VALUES 
    ('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'OpenAI', 'General-purpose AI model suitable for most tasks', 
     ARRAY['text_generation', 'analysis', 'summarization'], 4096, true),
    ('gpt-4', 'GPT-4', 'OpenAI', 'Advanced AI model with enhanced reasoning capabilities', 
     ARRAY['text_generation', 'analysis', 'summarization', 'code_generation', 'reasoning'], 8192, true),
    ('claude-2', 'Claude 2', 'Anthropic', 'Alternative AI model with strong capabilities', 
     ARRAY['text_generation', 'analysis', 'reasoning'], 100000, false)
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_id ON ai_assistance_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_session_id ON ai_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_type ON ai_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_user_date ON ai_usage_statistics(user_id, date);
