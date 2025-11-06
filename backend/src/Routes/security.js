import express from 'express';
import { pool } from '../Config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateSecurityRequest } from '../middleware/security.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Helper function to generate sample data for frontend visualization
function generateSampleMetrics() {
  // Generate trend data for 7 days
  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trendData.push({
      date: date.toISOString().split('T')[0],
      threats: Math.floor(Math.random() * 5),
      vulnerabilities: Math.floor(Math.random() * 8),
      incidents: Math.floor(Math.random() * 3)
    });
  }
  
  // Generate metrics
  const threats = Math.floor(Math.random() * 10) + 5;
  const vulnerabilities = Math.floor(Math.random() * 15) + 8;
  const incidents = Math.floor(Math.random() * 5);
  const auditEvents = Math.floor(Math.random() * 100) + 50;
  
  // Calculate security score
  const securityScore = Math.floor(Math.random() * 30) + 70; // 70-100 range
  
  return {
    metrics: {
      securityScore,
      threats,
      vulnerabilities,
      incidents,
      auditEvents,
      failedLogins: Math.floor(Math.random() * 20),
      successLogins: Math.floor(Math.random() * 80) + 20,
      threatsByLevel: {
        high: Math.floor(Math.random() * 5),
        medium: Math.floor(Math.random() * 8),
        low: Math.floor(Math.random() * 10)
      },
      vulnerabilitiesByStatus: {
        open: Math.floor(Math.random() * 8),
        inProgress: Math.floor(Math.random() * 10),
        resolved: Math.floor(Math.random() * 15)
      },
      lastUpdated: new Date().toISOString()
    },
    trendData
  };
}

/**
 * @desc    Get security overview
 * @route   GET /api/security/overview
 * @access  Admin
 */
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    // Check if security tables have data
    const threatCheck = await pool.query(
      'SELECT COUNT(*) as count FROM security_threats'
    );
    
    // If no security data exists yet, create sample data for demo
    if (parseInt(threatCheck.rows[0].count) === 0) {
      await createSampleSecurityData();
    }
    
    // Get security metrics from various tables - fix parameterized queries
    const threatResult = await pool.query(
      'SELECT COUNT(*) as threats FROM security_threats'
    );
    
    const vulnResult = await pool.query(
      "SELECT COUNT(*) as vulnerabilities FROM security_vulnerabilities WHERE severity = 'high'"
    );
    
    const incidentsResult = await pool.query(
      "SELECT COUNT(*) as incidents FROM security_incidents WHERE severity != 'low'"
    );
    
    const auditResult = await pool.query(
      "SELECT COUNT(*) as audit_events FROM audit_logs WHERE timestamp > NOW() - INTERVAL '7 days'"
    );
      // Return aggregated security data
    const threats = parseInt(threatResult.rows[0]?.threats || 0);
    const vulnerabilities = parseInt(vulnResult.rows[0]?.vulnerabilities || 0);
    const incidents = parseInt(incidentsResult.rows[0]?.incidents || 0);
    
    res.json({
      threats: threats,
      vulnerabilities: vulnerabilities,
      incidents: incidents,
      auditEvents: parseInt(auditResult.rows[0]?.audit_events || 0),
      securityScore: calculateSecurityScore(threats, 0, 0, vulnerabilities, 0), // Simple mapping for demo
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching security overview:', error);
    res.status(500).json({ 
      error: 'Failed to fetch security overview',
      threats: 0,
      vulnerabilities: 0,
      incidents: 0,
      auditEvents: 0,
      securityScore: 0,
      lastUpdated: new Date().toISOString()
    });
  }
});

/**
 * @desc    Get security audit logs
 * @route   GET /api/security/audits
 * @access  Admin
 */
router.get('/audits', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const { limit = 100, page = 1, sortBy = 'timestamp', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        al.log_id AS audit_id,
        al.user_id,
        u.name AS user_email,
        al.admin_id,
        a.email AS admin_email,
        al.ip_address,
        al.action_type AS event_type,
        al.action_details AS description,
        al.timestamp,
        al.severity,
        al.location_data,
        al.user_agent
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      LEFT JOIN admins a ON al.admin_id = a.admin_id
      ORDER BY al.${sortBy} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) AS total FROM audit_logs`;
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].total);
    
    // Return just the array of audits for simplicity and consistent frontend handling
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});


/**
 * @desc    Get security threats
 * @route   GET /api/security/threats
 * @access  Admin
 */
router.get('/threats', authenticateToken, async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `      SELECT 
        t.threat_id,
        t.type,
        t.description,
        t.severity,
        t.ip_address,
        t.created_at,
        t.status,
        t.context_data,
        u.name AS affected_user,
        a.first_name || ' ' || a.last_name AS resolved_by      
      FROM security_threats t
      LEFT JOIN users u ON t.user_id = u.user_id
      LEFT JOIN admins a ON t.admin_id = a.admin_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (severity) {
      query += ` AND t.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }
    
    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) AS total 
      FROM security_threats t
      WHERE 1=1
    `;
    
    const countParams = [];
    paramIndex = 1;
    
    if (status) {
      countQuery += ` AND t.status = $${paramIndex}`;
      countParams.push(status);
      paramIndex++;
    }
    
    if (severity) {
      countQuery += ` AND t.severity = $${paramIndex}`;
      countParams.push(severity);
      paramIndex++;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
      // Return just the array of threats for simplicity and consistent frontend handling
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching security threats:', error);
    res.status(500).json({ error: 'Failed to fetch security threats' });
  }
});

/**
 * @desc    Get security vulnerabilities
 * @route   GET /api/security/vulnerabilities
 * @access  Admin
 */
router.get('/vulnerabilities', authenticateToken, async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
      let query = `      SELECT 
       
        v.vulnerability_id,
        v.name,
        v.description,
        v.severity,
        v.status,
        v.created_at,
        v.affected_component,
        v.scanner_id,
        v.details
      FROM security_vulnerabilities v
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND v.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (severity) {
      query += ` AND v.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }
    
    query += ` ORDER BY v.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) AS total 
      FROM security_vulnerabilities v
      WHERE 1=1
    `;
    
    const countParams = [];
    paramIndex = 1;
    
    if (status) {
      countQuery += ` AND v.status = $${paramIndex}`;
      countParams.push(status);
      paramIndex++;
    }
    
    if (severity) {
      countQuery += ` AND v.severity = $${paramIndex}`;
      countParams.push(severity);
      paramIndex++;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
      // Return just the array of vulnerabilities for simplicity and consistent frontend handling
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching security vulnerabilities:', error);
    res.status(500).json({ error: 'Failed to fetch security vulnerabilities' });
  }
});

/**
 * @desc    Get security incidents
 * @route   GET /api/security/incidents
 * @access  Admin
 */
router.get('/incidents', authenticateToken, async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        i.incident_id,
        i.title,
        i.description,
        i.severity,
        i.status,
        i.created_at,
        i.detected_at,
        i.resolved_at,
        i.resolution_notes,
        u1.name AS affected_user,
        u2.name AS resolved_by,
        i.ip_address,
        t.type AS threat_type
      FROM security_incidents i
      LEFT JOIN users u1 ON i.affected_user_id = u1.user_id
      LEFT JOIN users u2 ON i.resolved_by = u2.user_id
      LEFT JOIN security_threats t ON i.threat_id = t.threat_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (severity) {
      query += ` AND i.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }
    
    query += ` ORDER BY i.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) AS total 
      FROM security_incidents i
      WHERE 1=1
    `;
    
    const countParams = [];
    paramIndex = 1;
    
    if (status) {
      countQuery += ` AND i.status = $${paramIndex}`;
      countParams.push(status);
      paramIndex++;
    }
    
    if (severity) {
      countQuery += ` AND i.severity = $${paramIndex}`;
      countParams.push(severity);
      paramIndex++;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      incidents: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching security incidents:', error);
    res.status(500).json({ error: 'Failed to fetch security incidents' });
  }
});

/**
 * @desc    Get detailed security metrics
 * @route   GET /api/security/metrics
 * @access  Admin
 */
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
      // Get threat counts by severity
    const threatCountsQuery = `
      SELECT t.severity, COUNT(*) as count
      FROM security_threats t
      GROUP BY t.severity
    `;
    const threatCounts = await pool.query(threatCountsQuery);
      // Get vulnerability counts by status
    const vulnCountsQuery = `
      SELECT v.status, COUNT(*) as count
      FROM security_vulnerabilities v
      GROUP BY v.status
    `;
    const vulnCounts = await pool.query(vulnCountsQuery);
    
    // Get failed login attempts in last 7 days - fix parameter syntax
    const failedLoginsQuery = `
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE action_type = 'login_failed'
      AND timestamp > NOW() - INTERVAL '7 days'
    `;
    const failedLogins = await pool.query(failedLoginsQuery);
    
    // Get successful login counts - fix parameter syntax
    const successLoginsQuery = `
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE action_type = 'login_success'
      AND timestamp > NOW() - INTERVAL '7 days'
    `;
    const successLogins = await pool.query(successLoginsQuery);
    
    // Calculate trend data for the past 7 days
    const trendQuery = `
      WITH dates AS (
        SELECT generate_series(
          current_date - interval '6 days',
          current_date,
          interval '1 day'
        )::date AS date
      )
      SELECT 
        dates.date,
        COALESCE(
          (SELECT COUNT(*) FROM security_threats WHERE DATE(created_at) = dates.date),
          0
        ) as threats,
        COALESCE(
          (SELECT COUNT(*) FROM security_vulnerabilities WHERE DATE(created_at) = dates.date),
          0
        ) as vulnerabilities,
        COALESCE(
          (SELECT COUNT(*) FROM security_incidents WHERE DATE(created_at) = dates.date),
          0
        ) as incidents
      FROM dates
      ORDER BY dates.date
    `;
    const trendData = await pool.query(trendQuery);
    
    // If no data, generate sample data for frontend visualization
    let metrics;
    let trends;
    
    if (threatCounts.rows.length === 0 && vulnCounts.rows.length === 0) {
      const sampleData = generateSampleMetrics();
      metrics = sampleData.metrics;
      trends = sampleData.trendData;
    } else {
      // Process real data
      const highThreats = threatCounts.rows.find(r => r.severity === 'high')?.count || 0;
      const mediumThreats = threatCounts.rows.find(r => r.severity === 'medium')?.count || 0;
      const lowThreats = threatCounts.rows.find(r => r.severity === 'low')?.count || 0;
      
      const openVulns = vulnCounts.rows.find(r => r.status === 'open')?.count || 0;
      const inProgressVulns = vulnCounts.rows.find(r => r.status === 'in_progress')?.count || 0;
      const resolvedVulns = vulnCounts.rows.find(r => r.status === 'resolved')?.count || 0;
      
      // Calculate security score (higher is better)
      const securityScore = calculateSecurityScore(
        parseInt(highThreats),
        parseInt(mediumThreats),
        parseInt(lowThreats),
        parseInt(openVulns),
        parseInt(inProgressVulns)
      );
      
      metrics = {
        securityScore,
        threats: parseInt(highThreats) + parseInt(mediumThreats) + parseInt(lowThreats),
        vulnerabilities: parseInt(openVulns) + parseInt(inProgressVulns) + parseInt(resolvedVulns),
        incidents: 0, // Default if no incidents table
        auditEvents: parseInt(failedLogins.rows[0]?.count || 0) + parseInt(successLogins.rows[0]?.count || 0),
        failedLogins: parseInt(failedLogins.rows[0]?.count || 0),
        successLogins: parseInt(successLogins.rows[0]?.count || 0),
        threatsByLevel: {
          high: parseInt(highThreats),
          medium: parseInt(mediumThreats),
          low: parseInt(lowThreats)
        },
        vulnerabilitiesByStatus: {
          open: parseInt(openVulns),
          inProgress: parseInt(inProgressVulns),
          resolved: parseInt(resolvedVulns)
        },
        lastUpdated: new Date().toISOString()
      };
      
      trends = trendData.rows;
    }
    
    res.json({
      ...metrics,
      trendData: trends
    });
  } catch (error) {
    console.error('Error fetching security metrics:', error);
    
    // Return sample metrics on error
    const sampleData = generateSampleMetrics();
    res.json({
      ...sampleData.metrics,
      trendData: sampleData.trendData,
      error: 'Error fetching real metrics, showing sample data'
    });
  }
});

/**
 * @desc    Run security scan
 * @route   POST /api/security/scan
 * @access  Admin
 */
router.post('/scan', authenticateToken, validateSecurityRequest, async (req, res) => {
  try {
    const { scanType } = req.body;
    const adminId = req.user.adminId;
    
    // Validate scan type
    const validScanTypes = ['full', 'quick', 'vulnerability', 'dependency', 'user_audit'];
    if (!validScanTypes.includes(scanType)) {
      return res.status(400).json({ error: 'Invalid scan type' });
    }
    
    // Create scan record
    const scanQuery = `
      INSERT INTO security_scans (scan_type, admin_id)
      VALUES ($1, $2)
      RETURNING scan_id, scan_type, started_at
    `;
    const scanResult = await pool.query(scanQuery, [scanType, adminId]);
    const scan = scanResult.rows[0];
    
    // Launch scan in background (this would be a job in production)
    setTimeout(async () => {
      try {
        // Simulate scan results
        const issuesFound = Math.floor(Math.random() * 10);
        const scanReport = generateScanReport(scanType, issuesFound);
        
        // Update scan record with results
        await pool.query(
          `UPDATE security_scans 
           SET completed_at = NOW(),
               status = 'completed',
               issues_found = $1,
               scan_report = $2
           WHERE scan_id = $3`,
          [issuesFound, scanReport, scan.scan_id]
        );
        
        // If issues found, create vulnerability records
        if (issuesFound > 0) {
          for (let i = 0; i < issuesFound; i++) {
            const severity = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
            
            await pool.query(
              `INSERT INTO security_vulnerabilities 
               (name, description, severity, status, details, affected_component, scanner_id)
               VALUES ($1, $2, $3, 'open', $4, $5, $6)`,
              [
                `${scanType.toUpperCase()}-${i+1}`,
                `Vulnerability detected during ${scanType} scan`,
                severity,
                JSON.stringify({ scan_id: scan.scan_id, details: `Issue ${i+1} details` }),
                `component-${i+1}`,
                scan.scan_id
              ]
            );
          }
        }
      } catch (error) {
        console.error('Error processing security scan:', error);
        
        // Update scan status to error
        await pool.query(
          `UPDATE security_scans 
           SET completed_at = NOW(),
               status = 'error',
               scan_report = $1
           WHERE scan_id = $2`,
          [JSON.stringify({ error: error.message }), scan.scan_id]
        );
      }
    }, 5000); // Simulate 5-second scan
    
    res.json({ 
      message: 'Security scan initiated',
      scan: {
        id: scan.scan_id,
        type: scan.scan_type,
        status: 'in_progress',
        started_at: scan.started_at
      }
    });
  } catch (error) {
    console.error('Error initiating security scan:', error);
    res.status(500).json({ error: 'Failed to initiate security scan' });
  }
});

/**
 * @desc    Get security scan status and results
 * @route   GET /api/security/scans/:scanId
 * @access  Admin
 */
router.get('/scans/:scanId', authenticateToken, async (req, res) => {
  try {
    const { scanId } = req.params;
    
    // Get scan details
    const scanQuery = `
      SELECT * FROM security_scans
      WHERE scan_id = $1
    `;
    const scanResult = await pool.query(scanQuery, [scanId]);
    
    if (scanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Security scan not found' });
    }
    
    const scan = scanResult.rows[0];
    
    // If scan is completed and found issues, get vulnerabilities created by this scan
    let vulnerabilities = [];
    if (scan.status === 'completed' && scan.issues_found > 0) {
      const vulnQuery = `
        SELECT * FROM security_vulnerabilities
        WHERE details->>'scan_id' = $1
        ORDER BY severity DESC
      `;
      const vulnResult = await pool.query(vulnQuery, [scanId]);
      vulnerabilities = vulnResult.rows;
    }
    
    res.json({
      scan,
      vulnerabilities
    });
  } catch (error) {
    console.error('Error fetching security scan:', error);
    res.status(500).json({ error: 'Failed to fetch security scan' });
  }
});

/**
 * @desc    Get all security scans
 * @route   GET /api/security/scans
 * @access  Admin
 */
router.get('/scans', authenticateToken, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        s.*,
        a.first_name || ' ' || a.last_name AS admin_name
      FROM security_scans s
      LEFT JOIN admins a ON s.admin_id = a.admin_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (type) {
      query += ` AND s.scan_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    query += ` ORDER BY s.started_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) AS total 
      FROM security_scans s
      WHERE 1=1
    `;
    
    const countParams = [];
    paramIndex = 1;
    
    if (status) {
      countQuery += ` AND s.status = $${paramIndex}`;
      countParams.push(status);
      paramIndex++;
    }
    
    if (type) {
      countQuery += ` AND s.scan_type = $${paramIndex}`;
      countParams.push(type);
      paramIndex++;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      scans: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching security scans:', error);
    res.status(500).json({ error: 'Failed to fetch security scans' });
  }
});

/**
 * @desc    Get dependency vulnerabilities
 * @route   GET /api/security/dependencies
 * @access  Admin
 */
router.get('/dependencies', authenticateToken, async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT *
      FROM dependency_vulnerabilities
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (severity) {
      query += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }
    
    query += ` ORDER BY discovered_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) AS total 
      FROM dependency_vulnerabilities
      WHERE 1=1
    `;
    
    const countParams = [];
    paramIndex = 1;
    
    if (status) {
      countQuery += ` AND status = $${paramIndex}`;
      countParams.push(status);
      paramIndex++;
    }
    
    if (severity) {
      countQuery += ` AND severity = $${paramIndex}`;
      countParams.push(severity);
      paramIndex++;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      dependencies: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching dependency vulnerabilities:', error);
    res.status(500).json({ error: 'Failed to fetch dependency vulnerabilities' });
  }
});

/**
 * @desc    Create security report
 * @route   POST /api/security/reports
 * @access  Admin
 */
router.post('/reports', authenticateToken, validateSecurityRequest, async (req, res) => {
  try {
    const { reportType, timePeriod } = req.body;
    const adminId = req.user.adminId;
    const companyId = req.user.companyId;
    
    // Validate report parameters
    const validReportTypes = ['security_overview', 'vulnerability_assessment', 'user_activity', 'incident_report'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }
    
    const validTimePeriods = ['7d', '30d', '90d', 'year'];
    if (!validTimePeriods.includes(timePeriod)) {
      return res.status(400).json({ error: 'Invalid time period' });
    }
    
    // Calculate date range based on time period
    const endDate = new Date();
    let startDate;
    
    switch (timePeriod) {
      case '7d':
        startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
      case '90d':
        startDate = new Date(endDate.getTime() - (90 * 24 * 60 * 60 * 1000));
        break;
      case 'year':
        startDate = new Date(endDate);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    // Generate report data based on type
    let reportData;
    
    if (reportType === 'security_overview') {
      // Get general security metrics
      reportData = await generateSecurityOverviewReport(startDate, endDate, companyId);
    } else if (reportType === 'vulnerability_assessment') {
      // Get vulnerability data
      reportData = await generateVulnerabilityReport(startDate, endDate, companyId);
    } else if (reportType === 'user_activity') {
      // Get user activity data
      reportData = await generateUserActivityReport(startDate, endDate, companyId);
    } else if (reportType === 'incident_report') {
      // Get security incident data
      reportData = await generateIncidentReport(startDate, endDate, companyId);
    }
    
    // Create report record in database
    const reportQuery = `
      INSERT INTO security_reports
      (company_id, report_type, time_period, start_date, end_date, report_data, generated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await pool.query(reportQuery, [
      companyId,
      reportType,
      timePeriod,
      startDate,
      endDate,
      reportData,
      adminId
    ]);
    
    // Trigger report file generation in background
    generateReportFiles(result.rows[0].report_id, reportType, reportData);
    
    res.status(201).json({
      message: 'Security report generated successfully',
      report: result.rows[0]
    });
  } catch (error) {
    console.error('Error generating security report:', error);
    res.status(500).json({ error: 'Failed to generate security report' });
  }
});

/**
 * @desc    Get security reports
 * @route   GET /api/security/reports
 * @access  Admin
 */
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const query = `
      SELECT 
        r.*,
        a.first_name || ' ' || a.last_name AS generated_by_name
      FROM security_reports r
      LEFT JOIN admins a ON r.generated_by = a.admin_id
      WHERE r.company_id = $1
      ORDER BY r.created_at DESC
    `;
    
    const result = await pool.query(query, [companyId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching security reports:', error);
    res.status(500).json({ error: 'Failed to fetch security reports' });
  }
});

/**
 * @desc    Get a specific security report
 * @route   GET /api/security/reports/:reportId
 * @access  Admin
 */
router.get('/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const companyId = req.user.companyId;
    
    const query = `
      SELECT 
        r.*,
        a.first_name || ' ' || a.last_name AS generated_by_name
      FROM security_reports r
      LEFT JOIN admins a ON r.generated_by = a.admin_id
      WHERE r.report_id = $1 AND r.company_id = $2
    `;
    
    const result = await pool.query(query, [reportId, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Security report not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching security report:', error);
    res.status(500).json({ error: 'Failed to fetch security report' });
  }
});

// Helper Functions
function calculateSecurityScore(highThreats, mediumThreats, lowThreats, openVulns, inProgressVulns) {
  // Formula: 100 - (high_threats*10 + medium_threats*5 + low_threats*2 + open_vulns*8 + in_progress_vulns*4)
  const score = 100 - (
    highThreats*10 + 
    mediumThreats*5 + 
    lowThreats*2 + 
    openVulns*8 + 
    inProgressVulns*4
  );
  
  return Math.max(0, Math.min(100, score)); // Clamp between 0-100
}

function generateScanReport(scanType, issuesFound) {
  // Generate a simulated scan report based on scan type
  const report = {
    summary: {
      scan_type: scanType,
      issues_found: issuesFound,
      completed_at: new Date().toISOString(),
      status: issuesFound > 0 ? 'issues_found' : 'passed'
    },
    details: []
  };
  
  // Generate random issues
  for (let i = 0; i < issuesFound; i++) {
    const severity = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
    
    report.details.push({
      id: `ISSUE-${i+1}`,
      name: `Test ${scanType} issue ${i+1}`,
      severity: severity,
      description: `This is a simulated ${severity} severity issue found during ${scanType} scan`,
      recommendations: `Fix the simulated issue ${i+1}`
    });
  }
  
  return report;
}

async function createSampleSecurityData() {
  try {
    // Insert sample security threats
    const threatTypes = ['Suspicious Login', 'Potential SQL Injection', 'Brute Force Attempt'];
    const severities = ['low', 'medium', 'high'];
    
    for (let i = 0; i < 3; i++) {
      await pool.query(
        `INSERT INTO security_threats (type, description, severity, ip_address, created_at, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          threatTypes[i],
          `Sample security threat description for ${threatTypes[i]}`,
          severities[i],
          `192.168.1.${100 + i}`,
          new Date(Date.now() - i * 86400000), // Days ago
          'active'
        ]
      );
    }
      // Insert sample vulnerabilities
    const vulnNames = ['Outdated Library', 'Insecure API Endpoint', 'Weak Password Policy'];
    
    for (let i = 0; i < 3; i++) {
      await pool.query(
        `INSERT INTO security_vulnerabilities 
         (vuln_id, name, description, severity, status, created_at, affected_component)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)`,
        [
          vulnNames[i],
          `Sample vulnerability description for ${vulnNames[i]}`,
          severities[i],
          i === 0 ? 'open' : i === 1 ? 'in_progress' : 'resolved',
          new Date(Date.now() - i * 86400000), // Days ago
          i === 0 ? 'Frontend' : i === 1 ? 'API' : 'Authentication'
        ]
      );
    }
    
    // Insert sample security incidents
    const incidentTitles = ['Unauthorized Access', 'Data Leak', 'Service Disruption'];
    const statuses = ['resolved', 'investigating', 'open'];
    
    for (let i = 0; i < 3; i++) {
      await pool.query(
        `INSERT INTO security_incidents (title, description, severity, status, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          incidentTitles[i],
          `Sample incident description for ${incidentTitles[i]}`,
          severities[i],
          statuses[i],
          new Date(Date.now() - i * 86400000) // Days ago
        ]
      );
    }
  } catch (error) {
    console.error('Error creating sample security data:', error);
    throw error;
  }
}

// Report generation helper functions
async function generateSecurityOverviewReport(startDate, endDate, companyId) {
  // This would generate a comprehensive security overview report
  // In a real implementation, this would gather data from various tables
  
  // Get threat counts
  const threatCountsQuery = `
    SELECT severity, COUNT(*) as count
    FROM security_threats
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY severity
  `;
  const threatCounts = await pool.query(threatCountsQuery, [startDate, endDate]);
  
  // Get vulnerability counts
  const vulnCountsQuery = `
    SELECT status, COUNT(*) as count
    FROM security_vulnerabilities
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY status
  `;
  const vulnCounts = await pool.query(vulnCountsQuery, [startDate, endDate]);
  
  // Get incident counts
  const incidentCountsQuery = `
    SELECT status, COUNT(*) as count
    FROM security_incidents
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY status
  `;
  const incidentCounts = await pool.query(incidentCountsQuery, [startDate, endDate]);
  
  // Get login statistics
  const loginStatsQuery = `
    SELECT action_type, COUNT(*) as count
    FROM audit_logs
    WHERE action_type IN ('login_success', 'login_failed')
    AND timestamp BETWEEN $1 AND $2
    GROUP BY action_type
  `;
  const loginStats = await pool.query(loginStatsQuery, [startDate, endDate]);
  
  // Format report data
  return {
    report_period: {
      start_date: startDate,
      end_date: endDate
    },
    summary: {
      security_score: calculateSecurityScoreFromQueries(threatCounts, vulnCounts),
      total_threats: sumCounts(threatCounts),
      total_vulnerabilities: sumCounts(vulnCounts),
      total_incidents: sumCounts(incidentCounts),
      login_attempts: {
        success: getCountByType(loginStats, 'login_success'),
        failed: getCountByType(loginStats, 'login_failed')
      }
    },
    threats: formatCountsBy(threatCounts, 'severity'),
    vulnerabilities: formatCountsBy(vulnCounts, 'status'),
    incidents: formatCountsBy(incidentCounts, 'status')
  };
}

async function generateVulnerabilityReport(startDate, endDate, companyId) {
  // Get vulnerabilities in the date range
  const vulnerabilitiesQuery = `
    SELECT *
    FROM security_vulnerabilities
    WHERE created_at BETWEEN $1 AND $2
    ORDER BY severity DESC, created_at DESC
  `;
  const vulnerabilitiesResult = await pool.query(vulnerabilitiesQuery, [startDate, endDate]);
  
  // Get vulnerability trends over time
  const trendQuery = `
    WITH dates AS (
      SELECT generate_series(
        $1::date,
        $2::date,
        '1 day'::interval
      )::date AS date
    )
    SELECT 
      dates.date,
      COALESCE(
        (SELECT COUNT(*) FROM security_vulnerabilities WHERE DATE(created_at) = dates.date),
        0
      ) as new_vulnerabilities,
      COALESCE(
        (SELECT COUNT(*) FROM security_vulnerabilities 
         WHERE status = 'resolved' AND DATE(created_at) = dates.date),
        0
      ) as resolved_vulnerabilities
    FROM dates
    ORDER BY dates.date
  `;
  const trendResult = await pool.query(trendQuery, [startDate, endDate]);
  
  // Format report data
  return {
    report_period: {
      start_date: startDate,
      end_date: endDate
    },
    summary: {
      total_vulnerabilities: vulnerabilitiesResult.rows.length,
      high_severity: vulnerabilitiesResult.rows.filter(v => v.severity === 'high').length,
      medium_severity: vulnerabilitiesResult.rows.filter(v => v.severity === 'medium').length,
      low_severity: vulnerabilitiesResult.rows.filter(v => v.severity === 'low').length,
      open: vulnerabilitiesResult.rows.filter(v => v.status === 'open').length,
      in_progress: vulnerabilitiesResult.rows.filter(v => v.status === 'in_progress').length,
      resolved: vulnerabilitiesResult.rows.filter(v => v.status === 'resolved').length
    },    vulnerabilities: vulnerabilitiesResult.rows.map(v => ({
      id: v.vulnerability_id,
      name: v.name,
      description: v.description,
      severity: v.severity,
      status: v.status,
      created_at: v.created_at,
      affected_component: v.affected_component || 'Unknown',
      recommendations: v.recommendations || {}
    })),
    trends: trendResult.rows
  };
}

async function generateUserActivityReport(startDate, endDate, companyId) {
  // Get user activity from audit logs
  const activityQuery = `
    SELECT 
      al.user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.role AS user_role,
      al.action_type,
      COUNT(*) as action_count
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.user_id
    WHERE al.timestamp BETWEEN $1 AND $2
    AND u.company_id = $3
    GROUP BY al.user_id, u.name, u.email, u.role, al.action_type
    ORDER BY u.name, action_count DESC
  `;
  const activityResult = await pool.query(activityQuery, [startDate, endDate, companyId]);
  
  // Get failed login attempts
  const failedLoginQuery = `
    SELECT 
      al.user_id,
      u.name AS user_name,
      u.email AS user_email,
      COUNT(*) as failed_attempts
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.user_id
    WHERE al.timestamp BETWEEN $1 AND $2
    AND u.company_id = $3
    AND al.action_type = 'login_failed'
    GROUP BY al.user_id, u.name, u.email
    ORDER BY failed_attempts DESC
  `;
  const failedLoginResult = await pool.query(failedLoginQuery, [startDate, endDate, companyId]);
  
  // Get user security profiles
  const profilesQuery = `
    SELECT 
      usp.*,
      u.name AS user_name,
      u.email AS user_email,
      u.role AS user_role
    FROM user_security_profiles usp
    JOIN users u ON usp.user_id = u.user_id
    WHERE u.company_id = $1
  `;
  const profilesResult = await pool.query(profilesQuery, [companyId]);
  
  // Format user activity data by user
  const userActivities = {};
  activityResult.rows.forEach(row => {
    if (!userActivities[row.user_id]) {
      userActivities[row.user_id] = {
        user_id: row.user_id,
        user_name: row.user_name,
        user_email: row.user_email,
        user_role: row.user_role,
        activities: {}
      };
    }
    userActivities[row.user_id].activities[row.action_type] = row.action_count;
  });
  
  // Format report data
  return {
    report_period: {
      start_date: startDate,
      end_date: endDate
    },
    summary: {
      total_users: Object.keys(userActivities).length,
      total_activities: activityResult.rows.reduce((sum, row) => sum + parseInt(row.action_count), 0),
      users_with_failed_logins: failedLoginResult.rows.length
    },
    users: Object.values(userActivities),
    failed_logins: failedLoginResult.rows,
    security_profiles: profilesResult.rows.map(p => ({
      user_id: p.user_id,
      user_name: p.user_name,
      user_email: p.user_email,
      risk_score: p.risk_score,
      failed_login_count: p.failed_login_count,
      suspicious_activity_count: p.suspicious_activity_count,
      mfa_enabled: p.mfa_enabled
    }))
  };
}

async function generateIncidentReport(startDate, endDate, companyId) {
  // Get incidents in the date range
  const incidentsQuery = `
    SELECT 
      i.*,
      u1.name AS affected_user_name,
      u2.name AS resolved_by_name,
      t.type AS threat_type,
      t.description AS threat_description
    FROM security_incidents i
    LEFT JOIN users u1 ON i.affected_user_id = u1.user_id
    LEFT JOIN users u2 ON i.resolved_by = u2.user_id
    LEFT JOIN security_threats t ON i.threat_id = t.threat_id
    WHERE i.created_at BETWEEN $1 AND $2
    ORDER BY i.severity DESC, i.created_at DESC
  `;
  const incidentsResult = await pool.query(incidentsQuery, [startDate, endDate]);
  
  // Get incident trends over time
  const trendQuery = `
    WITH dates AS (
      SELECT generate_series(
        $1::date,
        $2::date,
        '1 day'::interval
      )::date AS date
    )
    SELECT 
      dates.date,
      COALESCE(
        (SELECT COUNT(*) FROM security_incidents WHERE DATE(created_at) = dates.date),
        0
      ) as new_incidents,
      COALESCE(
        (SELECT COUNT(*) FROM security_incidents 
         WHERE status = 'resolved' AND DATE(resolved_at) = dates.date),
        0
      ) as resolved_incidents
    FROM dates
    ORDER BY dates.date
  `;
  const trendResult = await pool.query(trendQuery, [startDate, endDate]);
  
  // Format report data
  return {
    report_period: {
      start_date: startDate,
      end_date: endDate
    },
    summary: {
      total_incidents: incidentsResult.rows.length,
      high_severity: incidentsResult.rows.filter(i => i.severity === 'high').length,
      medium_severity: incidentsResult.rows.filter(i => i.severity === 'medium').length,
      low_severity: incidentsResult.rows.filter(i => i.severity === 'low').length,
      open: incidentsResult.rows.filter(i => i.status === 'open').length,
      investigating: incidentsResult.rows.filter(i => i.status === 'investigating').length,
      resolved: incidentsResult.rows.filter(i => i.status === 'resolved').length
    },
    incidents: incidentsResult.rows.map(i => ({
      id: i.incident_id,
      title: i.title,
      description: i.description,
      severity: i.severity,
      status: i.status,
      created_at: i.created_at,
      detected_at: i.detected_at,
      resolved_at: i.resolved_at,
      affected_user: i.affected_user_name,
      resolved_by: i.resolved_by_name,
      threat_type: i.threat_type,
      resolution_notes: i.resolution_notes
    })),
    trends: trendResult.rows
  };
}

// Helper functions for report generation
function sumCounts(queryResult) {
  return queryResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
}

function getCountByType(queryResult, type) {
  const row = queryResult.rows.find(r => r.action_type === type);
  return row ? parseInt(row.count) : 0;
}

function formatCountsBy(queryResult, field) {
  const result = {};
  queryResult.rows.forEach(row => {
    result[row[field]] = parseInt(row.count);
  });
  return result;
}

function calculateSecurityScoreFromQueries(threatCounts, vulnCounts) {
  // Extract counts by severity and status
  const highThreats = threatCounts.rows.find(r => r.severity === 'high')?.count || 0;
  const mediumThreats = threatCounts.rows.find(r => r.severity === 'medium')?.count || 0;
  const lowThreats = threatCounts.rows.find(r => r.severity === 'low')?.count || 0;
  
  const openVulns = vulnCounts.rows.find(r => r.status === 'open')?.count || 0;
  const inProgressVulns = vulnCounts.rows.find(r => r.status === 'in_progress')?.count || 0;
  
  // Calculate security score using the same formula as elsewhere
  return calculateSecurityScore(
    parseInt(highThreats),
    parseInt(mediumThreats),
    parseInt(lowThreats),
    parseInt(openVulns),
    parseInt(inProgressVulns)
  );
}

async function generateReportFiles(reportId, reportType, reportData) {
  // In a real implementation, this would generate PDF and CSV files
  // For now, we'll just simulate file URLs
  try {
    // Simulate file generation delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const pdfUrl = `/uploads/reports/${reportType}-${reportId}.pdf`;
    const csvUrl = `/uploads/reports/${reportType}-${reportId}.csv`;
    
    // Update report record with file URLs
    await pool.query(
      `UPDATE security_reports 
       SET pdf_url = $1, csv_url = $2
       WHERE report_id = $3`,
      [pdfUrl, csvUrl, reportId]
    );
  } catch (error) {
    console.error('Error generating report files:', error);
  }
}

export default router;
