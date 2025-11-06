-- Security Vulnerabilities Table Fixes
ALTER TABLE security_vulnerabilities 

ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'open',
ADD COLUMN IF NOT EXISTS affected_component VARCHAR(255),
ADD COLUMN IF NOT EXISTS details JSONB,
ADD COLUMN IF NOT EXISTS recommendations JSONB,
ADD COLUMN IF NOT EXISTS scanner_id VARCHAR(100);

-- Add Primary Key if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'security_vulnerabilities_pkey'
  ) THEN
    ALTER TABLE security_vulnerabilities ADD PRIMARY KEY (vuln_id);
  END IF;
END$$;

-- Security Threats Table Fixes
ALTER TABLE security_threats 
ADD COLUMN IF NOT EXISTS type VARCHAR(100),
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS context_data JSONB,
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES admins(admin_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

-- Security Metrics Table Fixes
ALTER TABLE security_metrics
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add appropriate indexes for performance
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_vuln_id ON security_vulnerabilities(vuln_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_name ON security_vulnerabilities(name);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON security_vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON security_vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_threats_user_id ON security_threats(user_id);
CREATE INDEX IF NOT EXISTS idx_threats_severity ON security_threats(severity);
CREATE INDEX IF NOT EXISTS idx_threats_status ON security_threats(status);
CREATE INDEX IF NOT EXISTS idx_threats_created_at ON security_threats(created_at);

-- If threat_name is being used instead of type, add a data migration
-- Uncomment if needed:
-- UPDATE security_threats SET type = threat_name WHERE type IS NULL AND threat_name IS NOT NULL;

-- Rename vulnerability_id to vuln_id if vuln_id is null (optional migration)
-- Uncomment if you want to migrate existing data:
-- UPDATE security_vulnerabilities 
-- SET vuln_id = uuid_generate_v4() 
-- WHERE vuln_id IS NULL;
