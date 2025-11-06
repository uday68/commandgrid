-- Create otp_verification table for robust OTP management
CREATE TABLE IF NOT EXISTS otp_verification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    context VARCHAR(50), -- e.g., 'login', 'password_reset', etc.
    ip_address VARCHAR(45),
    user_agent TEXT,
    CONSTRAINT unique_email_otp_context UNIQUE (email, otp, context)
);

-- Indexes for performance and security
CREATE INDEX IF NOT EXISTS idx_otp_verification_email ON otp_verification(email);
CREATE INDEX IF NOT EXISTS idx_otp_verification_expires_at ON otp_verification(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_verification_context ON otp_verification(context);
