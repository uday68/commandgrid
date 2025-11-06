import { scheduleJob } from 'node-schedule';
import { pool } from '../config/db.js';
import { scanForVulnerabilities, checkDatabaseVulnerabilities, checkDependencies } from './securityScanner.js';

/**
 * Initialize security scan schedules
 */
function initializeSecuritySchedules() {
  console.log('Initializing security scan schedules...');
  
  // Daily basic security scan (runs at midnight)
  scheduleJob('0 0 * * *', async () => {
    console.log('Running daily security scan...');
    try {
      await recordScanStart('basic');
      const vulnerabilities = await scanForVulnerabilities({ systemOnly: true });
      await recordScanCompletion('basic', vulnerabilities.length);
      console.log(`Daily security scan complete. Found ${vulnerabilities.length} issues.`);
    } catch (error) {
      console.error('Error in scheduled security scan:', error);
      await recordScanError('basic', error.message);
    }
  });

  // Weekly full security scan (runs on Sunday at 2 AM)
  scheduleJob('0 2 * * 0', async () => {
    console.log('Running weekly full security scan...');
    try {
      await recordScanStart('full');
      const vulnerabilities = await scanForVulnerabilities({ fullScan: true });
      await recordScanCompletion('full', vulnerabilities.length);
      console.log(`Weekly full security scan complete. Found ${vulnerabilities.length} issues.`);
    } catch (error) {
      console.error('Error in scheduled full security scan:', error);
      await recordScanError('full', error.message);
    }
  });

  // Database security scan (runs every 3 days at 3 AM)
  scheduleJob('0 3 */3 * *', async () => {
    console.log('Running database security scan...');
    try {
      await recordScanStart('database');
      const vulnerabilities = await checkDatabaseVulnerabilities();
      await recordScanCompletion('database', vulnerabilities.length);
      console.log(`Database security scan complete. Found ${vulnerabilities.length} issues.`);
    } catch (error) {
      console.error('Error in database security scan:', error);
      await recordScanError('database', error.message);
    }
  });

  // Dependency security scan (runs every Monday at 4 AM)
  scheduleJob('0 4 * * 1', async () => {
    console.log('Running dependency security scan...');
    try {
      await recordScanStart('dependency');
      const vulnerabilities = await checkDependencies();
      await recordScanCompletion('dependency', vulnerabilities.length);
      console.log(`Dependency security scan complete. Found ${vulnerabilities.length} issues.`);
    } catch (error) {
      console.error('Error in dependency security scan:', error);
      await recordScanError('dependency', error.message);
    }
  });

  // Generate monthly security metrics report (runs on the 1st of each month)
  scheduleJob('0 5 1 * *', generateMonthlySecurityMetrics);

  console.log('Security scan schedules initialized');
}

/**
 * Records the start of a security scan
 * @param {string} scanType - The type of scan being started
 */
async function recordScanStart(scanType) {
  try {
    await pool.query(
      `INSERT INTO security_scans (scan_type, status, started_at)
       VALUES ($1, 'in_progress', NOW())
       RETURNING scan_id`,
      [scanType]
    );
  } catch (error) {
    console.error('Error recording scan start:', error);
  }
}

/**
 * Records the successful completion of a security scan
 * @param {string} scanType - The type of scan that was completed
 * @param {number} issuesFound - The number of issues found
 */
async function recordScanCompletion(scanType, issuesFound) {
  try {
    await pool.query(
      `UPDATE security_scans 
       SET status = 'completed', 
           completed_at = NOW(),
           issues_found = $1
       WHERE scan_type = $2 
         AND status = 'in_progress'
         AND completed_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`,
      [issuesFound, scanType]
    );
  } catch (error) {
    console.error('Error recording scan completion:', error);
  }
}

/**
 * Records an error that occurred during a security scan
 * @param {string} scanType - The type of scan that failed
 * @param {string} errorMessage - The error message
 */
async function recordScanError(scanType, errorMessage) {
  try {
    await pool.query(
      `UPDATE security_scans 
       SET status = 'failed', 
           completed_at = NOW(),
           scan_report = jsonb_build_object('error', $1)
       WHERE scan_type = $2 
         AND status = 'in_progress'
         AND completed_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`,
      [errorMessage, scanType]
    );
  } catch (error) {
    console.error('Error recording scan error:', error);
  }
}

/**
 * Generates monthly security metrics for all companies
 */
async function generateMonthlySecurityMetrics() {
  try {
    console.log('Generating monthly security metrics...');
    
    // Get all companies
    const companies = await pool.query('SELECT company_id FROM companies');
    
    for (const company of companies.rows) {
      const companyId = company.company_id;
      
      // Calculate security metrics for the company
      const threatCountResult = await pool.query(
        `SELECT COUNT(*) FROM security_threats 
         WHERE created_at > NOW() - INTERVAL '30 days'`
      );
      
      const vulnCountResult = await pool.query(
        `SELECT COUNT(*) FROM security_vulnerabilities 
         WHERE status = 'open'`
      );
      
      const incidentCountResult = await pool.query(
        `SELECT COUNT(*) FROM security_incidents 
         WHERE created_at > NOW() - INTERVAL '30 days'`
      );
      
      const loginFailureResult = await pool.query(
        `SELECT COUNT(*) FROM audit_logs 
         WHERE action_type = 'login_failed'
         AND timestamp > NOW() - INTERVAL '30 days'`
      );
      
      // Calculate security score based on threats, vulnerabilities, and incidents
      const threatCount = parseInt(threatCountResult.rows[0].count);
      const vulnCount = parseInt(vulnCountResult.rows[0].count);
      const incidentCount = parseInt(incidentCountResult.rows[0].count);
      const loginFailureCount = parseInt(loginFailureResult.rows[0].count);
      
      // Formula: 100 - (threats*3 + vulnerabilities*5 + incidents*10 + login_failures*0.5)
      // Capped at 0-100
      const securityScore = Math.max(0, Math.min(100, 100 - (
        threatCount * 3 + 
        vulnCount * 5 + 
        incidentCount * 10 +
        loginFailureCount * 0.5
      )));
      
      // Save the metrics
      await pool.query(
        `INSERT INTO security_metrics 
         (company_id, security_score, threat_count, vulnerability_count, incident_count, login_failure_count)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [companyId, securityScore, threatCount, vulnCount, incidentCount, loginFailureCount]
      );
      
      console.log(`Generated security metrics for company ${companyId}: Score ${securityScore}`);
    }
    
    console.log('Monthly security metrics generation completed');
  } catch (error) {
    console.error('Error generating security metrics:', error);
  }
}

export {
  initializeSecuritySchedules
};
