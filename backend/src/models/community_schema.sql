-- Additional schema for community features

-- Ensure the community_spaces table exists
CREATE TABLE IF NOT EXISTS community_spaces (
    space_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(user_id) ON DELETE CASCADE,
    posts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

-- Space members tracking
CREATE TABLE IF NOT EXISTS community_space_members (
    space_id UUID REFERENCES community_spaces(space_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (space_id, user_id)
);

-- Tags for categorizing content
CREATE TABLE IF NOT EXISTS tags (
    tag_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(50) DEFAULT 'blue',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Community posts table
CREATE TABLE IF NOT EXISTS community_posts (
    post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    space_id UUID REFERENCES community_spaces(space_id) ON DELETE CASCADE,
    likes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    CONSTRAINT content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 10000)
);

-- Post likes
CREATE TABLE IF NOT EXISTS post_likes (
    post_id UUID REFERENCES community_posts(post_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

-- Post tags association
CREATE TABLE IF NOT EXISTS post_tags (
    post_id UUID REFERENCES community_posts(post_id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Post replies/comments
CREATE TABLE IF NOT EXISTS post_replies (
    reply_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES community_posts(post_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    CONSTRAINT content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 1000)
);

-- Help requests extended schema
CREATE TABLE IF NOT EXISTS help_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    author_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    priority VARCHAR(50) DEFAULT 'Medium',
    status VARCHAR(50) DEFAULT 'Open',
    deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    CONSTRAINT description_length CHECK (char_length(description) >= 10 AND char_length(description) <= 5000)
);

-- Help request tags
CREATE TABLE IF NOT EXISTS help_request_tags (
    request_id UUID REFERENCES help_requests(request_id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (request_id, tag_id)
);

-- Help request responses
CREATE TABLE IF NOT EXISTS help_request_responses (
    response_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES help_requests(request_id) ON DELETE CASCADE,
    responder_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    CONSTRAINT content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 2000)
);

-- Track help request views
CREATE TABLE IF NOT EXISTS help_request_views (
    request_id UUID REFERENCES help_requests(request_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (request_id, user_id)
);

-- Direct messages
CREATE TABLE IF NOT EXISTS direct_messages (
    message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    CONSTRAINT message_length CHECK (char_length(message) >= 1 AND char_length(message) <= 1000)
);

-- User connections (contacts/network)
CREATE TABLE IF NOT EXISTS user_connections (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    connection_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'connected',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, connection_id),
    CHECK (user_id != connection_id)
);

-- Create indexes for performance
CREATE INDEX idx_community_posts_author ON community_posts(author_id);
CREATE INDEX idx_community_posts_space ON community_posts(space_id);
CREATE INDEX idx_community_posts_created ON community_posts(created_at);
CREATE INDEX idx_post_replies_post ON post_replies(post_id);
CREATE INDEX idx_post_replies_created ON post_replies(created_at);
CREATE INDEX idx_help_requests_author ON help_requests(author_id);
CREATE INDEX idx_help_requests_created ON help_requests(created_at);
CREATE INDEX idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX idx_direct_messages_recipient ON direct_messages(recipient_id);
CREATE INDEX idx_direct_messages_created ON direct_messages(created_at);
CREATE INDEX idx_user_connections_user ON user_connections(user_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_community_spaces_updated_at
    BEFORE UPDATE ON community_spaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_posts_updated_at
    BEFORE UPDATE ON community_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_replies_updated_at
    BEFORE UPDATE ON post_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_help_requests_updated_at
    BEFORE UPDATE ON help_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_help_request_responses_updated_at
    BEFORE UPDATE ON help_request_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_direct_messages_updated_at
    BEFORE UPDATE ON direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
