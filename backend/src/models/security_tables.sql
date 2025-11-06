-- Update audit logs table with additional fields for enhanced security tracking
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS location_data JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Update security threats table with additional fields for threat management
ALTER TABLE security_threats ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE security_threats ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE security_threats ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES admins(admin_id) ON DELETE SET NULL;
ALTER TABLE security_threats ADD COLUMN IF NOT EXISTS context_data JSONB;
ALTER TABLE security_threats ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE security_threats ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

-- Update security vulnerabilities table with additional fields for vulnerability management
ALTER TABLE security_vulnerabilities ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE security_vulnerabilities ADD COLUMN IF NOT EXISTS affected_component TEXT;
ALTER TABLE security_vulnerabilities ADD COLUMN IF NOT EXISTS recommendations JSONB;
ALTER TABLE security_vulnerabilities ADD COLUMN IF NOT EXISTS scanner_id TEXT;

-- Update security incidents table with additional fields for incident management
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS threat_id UUID REFERENCES security_threats(threat_id) ON DELETE SET NULL;
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(user_id) ON DELETE SET NULL;

-- Create unique constraint for security vulnerabilities to prevent duplicates
ALTER TABLE security_vulnerabilities ADD CONSTRAINT unique_vulnerability_name UNIQUE (name);

-- Create table for security scans
CREATE TABLE IF NOT EXISTS security_scans (
  scan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_type VARCHAR(50) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  admin_id UUID REFERENCES admins(admin_id) ON DELETE SET NULL,
  issues_found INTEGER DEFAULT 0,
  scan_report JSONB
);

-- Create table for dependency vulnerabilities
CREATE TABLE IF NOT EXISTS dependency_vulnerabilities (
  vuln_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_name VARCHAR(255) NOT NULL,
  package_version VARCHAR(50) NOT NULL,
  vulnerability_id VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL,
  recommendation TEXT,
  link TEXT,
  discovered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  remediated_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'open'
);

-- Create table for security metrics
CREATE TABLE IF NOT EXISTS security_metrics (
  metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
  security_score INTEGER,
  threat_count INTEGER DEFAULT 0,
  vulnerability_count INTEGER DEFAULT 0,
  incident_count INTEGER DEFAULT 0,
  login_failure_count INTEGER DEFAULT 0,
  measured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create table for security reports
CREATE TABLE IF NOT EXISTS security_reports (
  report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  time_period VARCHAR(20) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  report_data JSONB NOT NULL,
  generated_by UUID REFERENCES admins(admin_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pdf_url TEXT,
  csv_url TEXT
);

-- Create table for user security profiles
CREATE TABLE IF NOT EXISTS user_security_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  risk_score INTEGER DEFAULT 50,
  last_password_change TIMESTAMP,
  failed_login_count INTEGER DEFAULT 0,
  suspicious_activity_count INTEGER DEFAULT 0,
  last_security_review TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  login_locations JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_security_threats_severity ON security_threats(severity);
CREATE INDEX IF NOT EXISTS idx_security_threats_status ON security_threats(status);
CREATE INDEX IF NOT EXISTS idx_security_threats_created_at ON security_threats(created_at);
CREATE INDEX IF NOT EXISTS idx_security_vulnerabilities_severity ON security_vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_security_vulnerabilities_status ON security_vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_dependency_vulnerabilities_severity ON dependency_vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_dependency_vulnerabilities_status ON dependency_vulnerabilities(status);
