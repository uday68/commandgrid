import { pool } from '../config/db.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

/**
 * Generate a security report PDF
 * @param {Object} options - Report options
 * @param {string} options.companyId - The company ID
 * @param {string} options.reportType - The report type (e.g. 'threat', 'vulnerability', 'incident', 'overview')
 * @param {Date} options.startDate - The start date for the report
 * @param {Date} options.endDate - The end date for the report
 * @param {string} options.adminId - The admin ID generating the report
 * @returns {Promise<Object>} The report file information
 */
async function generateSecurityReport(options) {
  const { companyId, reportType, startDate, endDate, adminId } = options;
  
  // Get report data based on type
  const reportData = await getReportData(reportType, companyId, startDate, endDate);
  
  // Create report folder if it doesn't exist
  const reportDir = path.join(__dirname, '..', '..', 'uploads', 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // Generate report filenames
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileBase = `security-${reportType}-${timestamp}`;
  const pdfPath = path.join(reportDir, `${fileBase}.pdf`);
  const csvPath = path.join(reportDir, `${fileBase}.csv`);
  
  // Generate PDF report
  await generatePDF(pdfPath, reportType, reportData, { startDate, endDate });
  
  // Generate CSV report
  await generateCSV(csvPath, reportType, reportData);
  
  // Store report metadata in database
  const result = await pool.query(
    `INSERT INTO security_reports 
     (company_id, report_type, time_period, start_date, end_date, report_data, generated_by, pdf_url, csv_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING report_id`,
    [
      companyId,
      reportType,
      'custom',
      startDate,
      endDate,
      JSON.stringify(reportData),
      adminId,
      `/uploads/reports/${path.basename(pdfPath)}`,
      `/uploads/reports/${path.basename(csvPath)}`
    ]
  );
  
  return {
    reportId: result.rows[0].report_id,
    pdfUrl: `/uploads/reports/${path.basename(pdfPath)}`,
    csvUrl: `/uploads/reports/${path.basename(csvPath)}`
  };
}

/**
 * Get report data based on type
 * @param {string} reportType - The report type
 * @param {string} companyId - The company ID
 * @param {Date} startDate - The start date for the report
 * @param {Date} endDate - The end date for the report
 * @returns {Promise<Object>} The report data
 */
async function getReportData(reportType, companyId, startDate, endDate) {
  switch (reportType) {
    case 'threat':
      return await getThreatReportData(companyId, startDate, endDate);
    
    case 'vulnerability':
      return await getVulnerabilityReportData(companyId, startDate, endDate);
      
    case 'incident':
      return await getIncidentReportData(companyId, startDate, endDate);
      
    case 'overview':
      return await getOverviewReportData(companyId, startDate, endDate);
      
    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}

/**
 * Get threat report data
 */
async function getThreatReportData(companyId, startDate, endDate) {
  // Get threats by severity
  const threatsBySeverity = await pool.query(
    `SELECT severity, COUNT(*) as count
     FROM security_threats
     WHERE created_at BETWEEN $1 AND $2
     GROUP BY severity
     ORDER BY 
       CASE 
         WHEN severity = 'high' THEN 1
         WHEN severity = 'medium' THEN 2
         WHEN severity = 'low' THEN 3
         ELSE 4
       END`,
    [startDate, endDate]
  );
  
  // Get threats by type
  const threatsByType = await pool.query(
    `SELECT type, COUNT(*) as count
     FROM security_threats
     WHERE created_at BETWEEN $1 AND $2
     GROUP BY type
     ORDER BY count DESC
     LIMIT 10`,
    [startDate, endDate]
  );
  
  // Get threats by day
  const threatsByDay = await pool.query(
    `SELECT 
       DATE(created_at) as date,
       COUNT(*) as count
     FROM security_threats
     WHERE created_at BETWEEN $1 AND $2
     GROUP BY DATE(created_at)
     ORDER BY date`,
    [startDate, endDate]
  );
  
  // Get top IP addresses
  const topIpAddresses = await pool.query(
    `SELECT ip_address, COUNT(*) as count
     FROM security_threats
     WHERE created_at BETWEEN $1 AND $2
     GROUP BY ip_address
     ORDER BY count DESC
     LIMIT 5`,
    [startDate, endDate]
  );
  
  // Get detailed threat list
  const threats = await pool.query(
    `SELECT
       threat_id,
       type,
       description,
       severity,
       ip_address,
       status,
       created_at,
       resolved_at
     FROM security_threats
     WHERE created_at BETWEEN $1 AND $2
     ORDER BY created_at DESC`,
    [startDate, endDate]
  );
  
  return {
    threatsBySeverity: threatsBySeverity.rows,
    threatsByType: threatsByType.rows,
    threatsByDay: threatsByDay.rows,
    topIpAddresses: topIpAddresses.rows,
    threats: threats.rows,
    totalThreats: threats.rows.length,
    period: {
      start: startDate,
      end: endDate
    }
  };
}

/**
 * Get vulnerability report data
 */
async function getVulnerabilityReportData(companyId, startDate, endDate) {
  // Get vulnerabilities by severity
  const vulnBySeverity = await pool.query(
    `SELECT severity, COUNT(*) as count
     FROM security_vulnerabilities
     WHERE created_at BETWEEN $1 AND $2
     GROUP BY severity
     ORDER BY 
       CASE 
         WHEN severity = 'high' THEN 1
         WHEN severity = 'medium' THEN 2
         WHEN severity = 'low' THEN 3
         ELSE 4
       END`,
    [startDate, endDate]
  );
  
  // Get vulnerabilities by status
  const vulnByStatus = await pool.query(
    `SELECT status, COUNT(*) as count
     FROM security_vulnerabilities
     WHERE created_at BETWEEN $1 AND $2
     GROUP BY status`,
    [startDate, endDate]
  );
  
  // Get vulnerabilities by component
  const vulnByComponent = await pool.query(
    `SELECT affected_component, COUNT(*) as count
     FROM security_vulnerabilities
     WHERE created_at BETWEEN $1 AND $2
     GROUP BY affected_component
     ORDER BY count DESC`,
    [startDate, endDate]
  );
  
  // Get detailed vulnerabilities
  const vulnerabilities = await pool.query(
    `SELECT
       vuln_id,
       name,
       description,
       severity,
       status,
       affected_component,
       created_at
     FROM security_vulnerabilities
     WHERE created_at BETWEEN $1 AND $2
     ORDER BY 
       CASE 
         WHEN severity = 'high' THEN 1
         WHEN severity = 'medium' THEN 2
         WHEN severity = 'low' THEN 3
         ELSE 4
       END,
       created_at DESC`,
    [startDate, endDate]
  );
  
  return {
    vulnBySeverity: vulnBySeverity.rows,
    vulnByStatus: vulnByStatus.rows,
    vulnByComponent: vulnByComponent.rows,
    vulnerabilities: vulnerabilities.rows,
    totalVulnerabilities: vulnerabilities.rows.length,
    period: {
      start: startDate,
      end: endDate
    }
  };
}

/**
 * Get incident report data
 */
async function getIncidentReportData(companyId, startDate, endDate) {
  // Get incidents by severity
  const incidentsBySeverity = await pool.query(
    `SELECT severity, COUNT(*) as count
     FROM security_incidents
     WHERE created_at BETWEEN $1 AND $2
     GROUP BY severity
     ORDER BY 
       CASE 
         WHEN severity = 'high' THEN 1
         WHEN severity = 'medium' THEN 2
         WHEN severity = 'low' THEN 3
         ELSE 4
       END`,
    [startDate, endDate]
  );
  
  // Get incidents by status
  const incidentsByStatus = await pool.query(
    `SELECT status, COUNT(*) as count
     FROM security_incidents
     WHERE created_at BETWEEN $1 AND $2
     GROUP BY status`,
    [startDate, endDate]
  );
  
  // Get resolution times
  const resolutionTimes = await pool.query(
    `SELECT
       incident_id,
       EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 as hours_to_resolve
     FROM security_incidents
     WHERE 
       created_at BETWEEN $1 AND $2
       AND resolved_at IS NOT NULL
     ORDER BY hours_to_resolve DESC`,
    [startDate, endDate]
  );
  
  // Calculate average resolution time
  let avgResolutionTime = 0;
  if (resolutionTimes.rows.length > 0) {
    avgResolutionTime = resolutionTimes.rows.reduce((sum, incident) => 
      sum + parseFloat(incident.hours_to_resolve), 0) / resolutionTimes.rows.length;
  }
  
  // Get detailed incidents
  const incidents = await pool.query(
    `SELECT 
       i.incident_id,
       i.title,
       i.description,
       i.severity,
       i.status,
       i.created_at,
       i.resolved_at,
       u.name as assigned_to_name
     FROM security_incidents i
     LEFT JOIN users u ON i.assigned_to = u.user_id
     WHERE i.created_at BETWEEN $1 AND $2
     ORDER BY i.created_at DESC`,
    [startDate, endDate]
  );
  
  return {
    incidentsBySeverity: incidentsBySeverity.rows,
    incidentsByStatus: incidentsByStatus.rows,
    avgResolutionTime,
    incidents: incidents.rows,
    totalIncidents: incidents.rows.length,
    period: {
      start: startDate,
      end: endDate
    }
  };
}

/**
 * Get overview report data
 */
async function getOverviewReportData(companyId, startDate, endDate) {
  // Get threat summary
  const threatSummary = await pool.query(
    `SELECT 
       COUNT(*) as total_threats,
       COUNT(*) FILTER (WHERE severity = 'high') as high_threats,
       COUNT(*) FILTER (WHERE severity = 'medium') as medium_threats,
       COUNT(*) FILTER (WHERE severity = 'low') as low_threats
     FROM security_threats
     WHERE created_at BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  
  // Get vulnerability summary
  const vulnSummary = await pool.query(
    `SELECT 
       COUNT(*) as total_vulnerabilities,
       COUNT(*) FILTER (WHERE severity = 'high') as high_vulnerabilities,
       COUNT(*) FILTER (WHERE severity = 'medium') as medium_vulnerabilities,
       COUNT(*) FILTER (WHERE severity = 'low') as low_vulnerabilities,
       COUNT(*) FILTER (WHERE status = 'open') as open_vulnerabilities
     FROM security_vulnerabilities
     WHERE created_at BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  
  // Get incident summary
  const incidentSummary = await pool.query(
    `SELECT 
       COUNT(*) as total_incidents,
       COUNT(*) FILTER (WHERE severity = 'high') as high_incidents,
       COUNT(*) FILTER (WHERE severity = 'medium') as medium_incidents,
       COUNT(*) FILTER (WHERE severity = 'low') as low_incidents,
       COUNT(*) FILTER (WHERE status = 'open') as open_incidents,
       COUNT(*) FILTER (WHERE status = 'resolved') as resolved_incidents
     FROM security_incidents
     WHERE created_at BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  
  // Get audit log summary
  const auditSummary = await pool.query(
    `SELECT 
       COUNT(*) as total_logs,
       COUNT(*) FILTER (WHERE action_type = 'login_failed') as failed_logins,
       COUNT(*) FILTER (WHERE action_type = 'login_success') as successful_logins
     FROM audit_logs
     WHERE timestamp BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  
  // Get daily metrics
  const dailyMetrics = await pool.query(
    `WITH dates AS (
       SELECT 
         generate_series(
           $1::timestamp, 
           $2::timestamp, 
           '1 day'
         )::date as date
     )
     SELECT 
       dates.date,
       COUNT(DISTINCT t.threat_id) as threats,
       COUNT(DISTINCT v.vuln_id) as vulnerabilities,
       COUNT(DISTINCT i.incident_id) as incidents,
       COUNT(DISTINCT CASE WHEN a.action_type = 'login_failed' THEN a.log_id END) as failed_logins
     FROM dates
     LEFT JOIN security_threats t ON dates.date = DATE(t.created_at)
     LEFT JOIN security_vulnerabilities v ON dates.date = DATE(v.created_at)
     LEFT JOIN security_incidents i ON dates.date = DATE(i.created_at)
     LEFT JOIN audit_logs a ON dates.date = DATE(a.timestamp)
     GROUP BY dates.date
     ORDER BY dates.date`,
    [startDate, endDate]
  );
  
  return {
    threatSummary: threatSummary.rows[0],
    vulnSummary: vulnSummary.rows[0],
    incidentSummary: incidentSummary.rows[0],
    auditSummary: auditSummary.rows[0],
    dailyMetrics: dailyMetrics.rows,
    period: {
      start: startDate,
      end: endDate
    }
  };
}

/**
 * Generate a PDF report
 * @param {string} filePath - The output file path
 * @param {string} reportType - The report type
 * @param {Object} data - The report data
 * @param {Object} options - Options for the report
 */
async function generatePDF(filePath, reportType, data, options) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);
      
      // Add title and header
      doc.fontSize(20).text(`Security ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Report Period: ${formatDate(options.startDate)} to ${formatDate(options.endDate)}`, { align: 'center' });
      doc.moveDown();
      doc.text(`Generated on: ${formatDate(new Date())}`, { align: 'center' });
      doc.moveDown(2);

      // Add report content based on type
      switch (reportType) {
        case 'threat':
          addThreatReportContent(doc, data);
          break;
        
        case 'vulnerability':
          addVulnerabilityReportContent(doc, data);
          break;
          
        case 'incident':
          addIncidentReportContent(doc, data);
          break;
          
        case 'overview':
          addOverviewReportContent(doc, data);
          break;
      }
      
      // Finalize the PDF
      doc.end();
      
      // When the stream is finished, resolve the promise
      stream.on('finish', () => {
        resolve(filePath);
      });
      
      // If there's an error, reject the promise
      stream.on('error', (error) => {
        reject(error);
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Format a date for display
 * @param {Date} date - The date to format
 * @returns {string} The formatted date
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Add threat report content to PDF
 */
function addThreatReportContent(doc, data) {
  // Add summary
  doc.fontSize(14).text('Threat Summary', { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Total Threats: ${data.totalThreats}`);
  doc.moveDown();
  
  // Add threats by severity
  doc.fontSize(14).text('Threats by Severity');
  doc.moveDown();
  
  data.threatsBySeverity.forEach(item => {
    doc.text(`${item.severity.toUpperCase()}: ${item.count}`);
  });
  
  doc.moveDown();
  
  // Add threats by type
  doc.fontSize(14).text('Top Threat Types');
  doc.moveDown();
  
  data.threatsByType.forEach(item => {
    doc.text(`${item.type}: ${item.count}`);
  });
  
  doc.moveDown();
  
  // Add top IP addresses
  doc.fontSize(14).text('Top Source IP Addresses');
  doc.moveDown();
  
  data.topIpAddresses.forEach((item, index) => {
    doc.text(`${index + 1}. ${item.ip_address}: ${item.count} threats`);
  });
  
  doc.moveDown(2);
  
  // Add detailed threat list
  doc.fontSize(16).text('Detailed Threat List', { align: 'center' });
  doc.moveDown();
  
  // Only include the first 20 threats to avoid making the PDF too large
  const threatsToShow = data.threats.slice(0, 20);
  
  threatsToShow.forEach(threat => {
    doc.fontSize(12).text(`Type: ${threat.type}`);
    doc.text(`Severity: ${threat.severity}`);
    doc.text(`Created: ${formatDate(threat.created_at)}`);
    doc.text(`Status: ${threat.status}`);
    doc.text(`Description: ${threat.description}`);
    doc.moveDown();
  });
  
  if (data.threats.length > 20) {
    doc.text(`... and ${data.threats.length - 20} more threats.`);
  }
}

/**
 * Add vulnerability report content to PDF
 */
function addVulnerabilityReportContent(doc, data) {
  // Add similar content structure to threat report
  // ...
  doc.fontSize(14).text('Vulnerability Summary', { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Total Vulnerabilities: ${data.totalVulnerabilities}`);
  doc.moveDown();
}

/**
 * Add incident report content to PDF
 */
function addIncidentReportContent(doc, data) {
  // Add incident-specific content
  // ...
  doc.fontSize(14).text('Security Incident Summary', { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Total Incidents: ${data.totalIncidents}`);
  doc.text(`Average Resolution Time: ${data.avgResolutionTime.toFixed(2)} hours`);
  doc.moveDown();
}

/**
 * Add overview report content to PDF
 */
function addOverviewReportContent(doc, data) {
  // Add comprehensive overview content
  // ...
  doc.fontSize(14).text('Security Overview', { underline: true });
  doc.moveDown();
  
  // Add threat summary
  doc.fontSize(12).text(`Total Threats: ${data.threatSummary.total_threats}`);
  doc.text(`High Severity Threats: ${data.threatSummary.high_threats}`);
  doc.text(`Medium Severity Threats: ${data.threatSummary.medium_threats}`);
  doc.text(`Low Severity Threats: ${data.threatSummary.low_threats}`);
  doc.moveDown();
  
  // Add vulnerability summary
  doc.fontSize(12).text(`Total Vulnerabilities: ${data.vulnSummary.total_vulnerabilities}`);
  doc.text(`Open Vulnerabilities: ${data.vulnSummary.open_vulnerabilities}`);
  doc.text(`High Severity Vulnerabilities: ${data.vulnSummary.high_vulnerabilities}`);
  doc.moveDown();
}

/**
 * Generate a CSV report
 * @param {string} filePath - The output file path
 * @param {string} reportType - The report type
 * @param {Object} data - The report data
 */
async function generateCSV(filePath, reportType, data) {
  const records = [];
  let headers = [];
  
  switch (reportType) {
    case 'threat':
      headers = [
        { id: 'threat_id', title: 'Threat ID' },
        { id: 'type', title: 'Type' },
        { id: 'severity', title: 'Severity' },
        { id: 'description', title: 'Description' },
        { id: 'ip_address', title: 'Source IP' },
        { id: 'status', title: 'Status' },
        { id: 'created_at', title: 'Created At' },
        { id: 'resolved_at', title: 'Resolved At' }
      ];
      records.push(...data.threats);
      break;
      
    case 'vulnerability':
      headers = [
        { id: 'vuln_id', title: 'Vulnerability ID' },
        { id: 'name', title: 'Name' },
        { id: 'severity', title: 'Severity' },
        { id: 'description', title: 'Description' },
        { id: 'status', title: 'Status' },
        { id: 'affected_component', title: 'Component' },
        { id: 'created_at', title: 'Discovered At' }
      ];
      records.push(...data.vulnerabilities);
      break;
      
    case 'incident':
      headers = [
        { id: 'incident_id', title: 'Incident ID' },
        { id: 'title', title: 'Title' },
        { id: 'severity', title: 'Severity' },
        { id: 'description', title: 'Description' },
        { id: 'status', title: 'Status' },
        { id: 'assigned_to_name', title: 'Assigned To' },
        { id: 'created_at', title: 'Created At' },
        { id: 'resolved_at', title: 'Resolved At' }
      ];
      records.push(...data.incidents);
      break;
      
    case 'overview':
      // For overview, we'll create a daily metrics table
      headers = [
        { id: 'date', title: 'Date' },
        { id: 'threats', title: 'Threats' },
        { id: 'vulnerabilities', title: 'Vulnerabilities' },
        { id: 'incidents', title: 'Incidents' },
        { id: 'failed_logins', title: 'Failed Logins' }
      ];
      records.push(...data.dailyMetrics);
      break;
  }
  
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers
  });
  
  return csvWriter.writeRecords(records);
}

export {
  generateSecurityReport,
  getReportData,
  getThreatReportData,
  getVulnerabilityReportData,
  getIncidentReportData,
  getOverviewReportData
};
