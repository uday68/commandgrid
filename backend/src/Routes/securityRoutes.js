import express from 'express';
import { pool } from '../Config/database.js';
import { scanForVulnerabilities } from '../utils/securityScanner.js';
import { generateSecurityReport } from '../utils/securityReporting.js';

const router = express.Router();

/**
 * @route   GET /api/security/dashboard
 * @desc    Get security dashboard metrics
 * @access  Admin
 */
router.get('/dashboard', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    // Get threat metrics
    const threatMetrics = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'high') as high,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium,
        COUNT(*) FILTER (WHERE severity = 'low') as low,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
      FROM security_threats
    `);
    
    // Get vulnerability metrics
    const vulnMetrics = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'high') as high,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium,
        COUNT(*) FILTER (WHERE severity = 'low') as low,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d
      FROM security_vulnerabilities
    `);
    
    // Get incident metrics
    const incidentMetrics = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'high') as high,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium,
        COUNT(*) FILTER (WHERE severity = 'low') as low,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) 
          FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time
      FROM security_incidents
    `);
    
    // Get security metrics history
    const metricsHistory = await pool.query(`
      SELECT security_score, measured_at, threat_count, vulnerability_count
      FROM security_metrics
      WHERE company_id = $1
      ORDER BY measured_at DESC
      LIMIT 30
    `, [companyId]);
    
    // Calculate security score trend
    let securityScoreTrend = 0;
    if (metricsHistory.rows.length >= 2) {
      const currentScore = metricsHistory.rows[0].security_score;
      const previousScore = metricsHistory.rows[metricsHistory.rows.length - 1].security_score;
      securityScoreTrend = currentScore - previousScore;
    }
    
    // Get recent failed login attempts
    const failedLogins = await pool.query(`
      SELECT 
        al.ip_address, 
        al.location_data,
        u.name as user_name,
        u.email as user_email,
        al.timestamp
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      WHERE al.action_type = 'login_failed'
      ORDER BY al.timestamp DESC
      LIMIT 5
    `);
    
    // Get the most recent security scan
    const recentScan = await pool.query(`
      SELECT *
      FROM security_scans
      ORDER BY started_at DESC
      LIMIT 1
    `);
    
    // The security score formula:
    // 100 - (high_threats*10 + medium_threats*5 + low_threats*2 + high_vulns*8 + medium_vulns*4 + open_incidents*5)
    const highThreats = parseInt(threatMetrics.rows[0].high);
    const mediumThreats = parseInt(threatMetrics.rows[0].medium);
    const lowThreats = parseInt(threatMetrics.rows[0].low);
    const highVulns = parseInt(vulnMetrics.rows[0].high);
    const mediumVulns = parseInt(vulnMetrics.rows[0].medium);
    const openIncidents = parseInt(incidentMetrics.rows[0].open);
    
    const securityScore = Math.max(0, Math.min(100, 100 - (
      highThreats * 10 + 
      mediumThreats * 5 + 
      lowThreats * 2 + 
      highVulns * 8 + 
      mediumVulns * 4 + 
      openIncidents * 5
    )));
    
    res.json({
      securityScore,
      securityScoreTrend,
      threatMetrics: threatMetrics.rows[0],
      vulnerabilityMetrics: vulnMetrics.rows[0],
      incidentMetrics: incidentMetrics.rows[0],
      failedLogins: failedLogins.rows,
      recentScan: recentScan.rows[0] || null,
      metricsHistory: metricsHistory.rows.map(m => ({
        score: m.security_score,
        date: m.measured_at,
        threats: m.threat_count,
        vulnerabilities: m.vulnerability_count
      }))
    });
    
  } catch (error) {
    console.error('Error fetching security dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch security dashboard' });
  }
});

/**
 * @route   GET /api/security/threats
 * @desc    Get security threats with filters
 * @access  Admin
 */
router.get('/threats', async (req, res) => {
  try {
    const { 
      severity,
      status,
      type,
      ip,
      startDate,
      endDate,
      limit = 20,
      page = 1,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        threat_id,
        type,
        description,
        severity,
        ip_address,
        status,
        user_id,
        admin_id,
        context_data,
        created_at,
        resolved_at,
        resolution_notes
      FROM security_threats
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Add filters
    if (severity) {
      queryParams.push(severity);
      query += ` AND severity = $${queryParams.length}`;
    }
    
    if (status) {
      queryParams.push(status);
      query += ` AND status = $${queryParams.length}`;
    }
    
    if (type) {
      queryParams.push(type);
      query += ` AND type = $${queryParams.length}`;
    }
    
    if (ip) {
      queryParams.push(`%${ip}%`);
      query += ` AND ip_address LIKE $${queryParams.length}`;
    }
    
    if (startDate) {
      queryParams.push(startDate);
      query += ` AND created_at >= $${queryParams.length}`;
    }
    
    if (endDate) {
      queryParams.push(endDate);
      query += ` AND created_at <= $${queryParams.length}`;
    }
    
    // Add count query for pagination
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].count);
    
    // Add sorting and pagination
    query += ` ORDER BY ${sort} ${order} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit), offset);
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      threats: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching security threats:', error);
    res.status(500).json({ error: 'Failed to fetch security threats' });
  }
});

/**
 * @route   PUT /api/security/threats/:threatId
 * @desc    Update a security threat
 * @access  Admin
 */
router.put('/threats/:threatId', async (req, res) => {
  try {
    const { threatId } = req.params;
    const { status, resolution_notes } = req.body;
    
    // Validate input
    if (!status && !resolution_notes) {
      return res.status(400).json({ error: 'No update parameters provided' });
    }
    
    let query = 'UPDATE security_threats SET ';
    const queryParams = [];
    let paramCounter = 1;
    
    if (status) {
      queryParams.push(status);
      query += `status = $${paramCounter++}`;
      
      if (status === 'resolved') {
        query += `, resolved_at = NOW()`;
      }
    }
    
    if (resolution_notes) {
      if (status) query += ', ';
      queryParams.push(resolution_notes);
      query += `resolution_notes = $${paramCounter++}`;
    }
    
    queryParams.push(threatId);
    query += ` WHERE threat_id = $${paramCounter} RETURNING *`;
    
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Threat not found' });
    }
    
    // Log the update
    await pool.query(
      `INSERT INTO audit_logs 
       (admin_id, ip_address, action_type, action_details, severity, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        req.user.adminId,
        req.ip,
        'threat_updated',
        `Updated threat ${threatId} - Status: ${status || 'unchanged'}`,
        'info'
      ]
    );
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error updating security threat:', error);
    res.status(500).json({ error: 'Failed to update security threat' });
  }
});

/**
 * @route   GET /api/security/vulnerabilities
 * @desc    Get vulnerabilities with filters
 * @access  Admin
 */
router.get('/vulnerabilities', async (req, res) => {
  try {
    const { 
      severity,
      status,
      component,
      limit = 20,
      page = 1,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        vuln_id,
        name,
        description,
        severity,
        status,
        details,
        affected_component,
        recommendations,
        created_at
      FROM security_vulnerabilities
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Add filters
    if (severity) {
      queryParams.push(severity);
      query += ` AND severity = $${queryParams.length}`;
    }
    
    if (status) {
      queryParams.push(status);
      query += ` AND status = $${queryParams.length}`;
    }
    
    if (component) {
      queryParams.push(`%${component}%`);
      query += ` AND affected_component LIKE $${queryParams.length}`;
    }
    
    // Add count query for pagination
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].count);
    
    // Add sorting and pagination
    query += ` ORDER BY ${sort} ${order} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit), offset);
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      vulnerabilities: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching vulnerabilities:', error);
    res.status(500).json({ error: 'Failed to fetch vulnerabilities' });
  }
});

/**
 * @route   PUT /api/security/vulnerabilities/:vulnId
 * @desc    Update a vulnerability
 * @access  Admin
 */
router.put('/vulnerabilities/:vulnId', async (req, res) => {
  try {
    const { vulnId } = req.params;
    const { status, recommendations } = req.body;
    
    // Validate input
    if (!status && !recommendations) {
      return res.status(400).json({ error: 'No update parameters provided' });
    }
    
    let query = 'UPDATE security_vulnerabilities SET ';
    const queryParams = [];
    let paramCounter = 1;
    
    if (status) {
      queryParams.push(status);
      query += `status = $${paramCounter++}`;
    }
    
    if (recommendations) {
      if (status) query += ', ';
      queryParams.push(JSON.stringify(recommendations));
      query += `recommendations = $${paramCounter++}`;
    }
    
    queryParams.push(vulnId);
    query += ` WHERE vuln_id = $${paramCounter} RETURNING *`;
    
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vulnerability not found' });
    }
    
    // Log the update
    await pool.query(
      `INSERT INTO audit_logs 
       (admin_id, ip_address, action_type, action_details, severity, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        req.user.adminId,
        req.ip,
        'vulnerability_updated',
        `Updated vulnerability ${vulnId} - Status: ${status || 'unchanged'}`,
        'info'
      ]
    );
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error updating vulnerability:', error);
    res.status(500).json({ error: 'Failed to update vulnerability' });
  }
});

/**
 * @route   POST /api/security/scan
 * @desc    Run a security scan
 * @access  Admin
 */
router.post('/scan', async (req, res) => {
  try {
    const { fullScan = false } = req.body;
    
    // Start scan in the background
    scanForVulnerabilities({ fullScan })
      .then(vulnerabilities => {
        // Log successful scan
        pool.query(
          `INSERT INTO audit_logs 
           (admin_id, ip_address, action_type, action_details, severity, timestamp)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            req.user.adminId,
            req.ip,
            'security_scan_completed',
            `${fullScan ? 'Full' : 'Basic'} security scan completed, found ${vulnerabilities.length} issues`,
            'info'
          ]
        );
      })
      .catch(error => {
        console.error('Error during security scan:', error);
        
        // Log scan error
        pool.query(
          `INSERT INTO audit_logs 
           (admin_id, ip_address, action_type, action_details, severity, timestamp)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            req.user.adminId,
            req.ip,
            'security_scan_error',
            `Error in ${fullScan ? 'full' : 'basic'} security scan: ${error.message}`,
            'warning'
          ]
        );
      });
    
    // Record the scan start
    const scanResult = await pool.query(
      `INSERT INTO security_scans (scan_type, status, admin_id, started_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING scan_id`,
      [fullScan ? 'full' : 'basic', 'in_progress', req.user.adminId]
    );
    
    res.json({
      message: 'Security scan initiated',
      scanId: scanResult.rows[0].scan_id,
      scanType: fullScan ? 'full' : 'basic',
      estimatedCompletionTime: fullScan ? '5-10 minutes' : '1-2 minutes'
    });
    
  } catch (error) {
    console.error('Error initiating security scan:', error);
    res.status(500).json({ error: 'Failed to initiate security scan' });
  }
});

/**
 * @route   GET /api/security/scans
 * @desc    Get security scan history
 * @access  Admin
 */
router.get('/scans', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        s.*,
        a.first_name || ' ' || a.last_name AS admin_name
      FROM security_scans s
      LEFT JOIN admins a ON s.admin_id = a.admin_id
      ORDER BY s.started_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM security_scans');
    const totalItems = parseInt(countResult.rows[0].count);
    
    res.json({
      scans: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching security scans:', error);
    res.status(500).json({ error: 'Failed to fetch security scans' });
  }
});

/**
 * @route   GET /api/security/reports
 * @desc    Get security report history
 * @access  Admin
 */
router.get('/reports', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        r.*,
        a.first_name || ' ' || a.last_name AS generated_by_name
      FROM security_reports r
      LEFT JOIN admins a ON r.generated_by = a.admin_id
      WHERE r.company_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [req.user.companyId, limit, offset]);
    
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM security_reports WHERE company_id = $1',
      [req.user.companyId]
    );
    const totalItems = parseInt(countResult.rows[0].count);
    
    res.json({
      reports: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching security reports:', error);
    res.status(500).json({ error: 'Failed to fetch security reports' });
  }
});

/**
 * @route   POST /api/security/reports
 * @desc    Generate a new security report
 * @access  Admin
 */
router.post('/reports', async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.body;
    
    if (!reportType || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Report type, start date, and end date are required' 
      });
    }
    
    const validReportTypes = ['threat', 'vulnerability', 'incident', 'overview'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({ 
        error: `Report type must be one of: ${validReportTypes.join(', ')}` 
      });
    }
    
    // Generate the report in the background
    const reportInfo = await generateSecurityReport({
      companyId: req.user.companyId,
      reportType,
      startDate,
      endDate,
      adminId: req.user.adminId
    });
    
    res.json({
      message: 'Security report generated',
      reportId: reportInfo.reportId,
      pdfUrl: reportInfo.pdfUrl,
      csvUrl: reportInfo.csvUrl
    });
    
  } catch (error) {
    console.error('Error generating security report:', error);
    res.status(500).json({ error: 'Failed to generate security report' });
  }
});

/**
 * @route   GET /api/security/metrics
 * @desc    Get security metrics history
 * @access  Admin
 */
router.get('/metrics', async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    
    const query = `
      SELECT 
        security_score,
        threat_count,
        vulnerability_count,
        incident_count,
        login_failure_count,
        measured_at
      FROM security_metrics
      WHERE company_id = $1
      AND measured_at > NOW() - INTERVAL '${period} days'
      ORDER BY measured_at ASC
    `;
    
    const result = await pool.query(query, [req.user.companyId]);
    
    res.json({
      metrics: result.rows,
      period: parseInt(period)
    });
    
  } catch (error) {
    console.error('Error fetching security metrics:', error);
    res.status(500).json({ error: 'Failed to fetch security metrics' });
  }
});

export default router;
