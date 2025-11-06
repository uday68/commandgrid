/**
 * SECURITY MODULE CRUD OPERATIONS
 * 
 * This file contains the CRUD operations for the security module.
 * Copy these endpoints into your security.js file as needed.
 */

// VULNERABILITY CRUD OPERATIONS

/**
 * @desc    Create a new security vulnerability
 * @route   POST /api/security/vulnerabilities
 * @access  Admin
 */
router.post('/vulnerabilities', authenticateToken, async (req, res) => {
  try {
    const { name, description, severity, status, affectedComponent, details, recommendations } = req.body;
    
    if (!name || !description || !severity) {
      return res.status(400).json({ error: 'Name, description, and severity are required fields' });
    }
    
    const query = `
      INSERT INTO security_vulnerabilities 
        (vuln_id, name, description, severity, status, affected_component, details, recommendations, created_at)
      VALUES 
        (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name, 
      description, 
      severity, 
      status || 'open', 
      affectedComponent || null, 
      details ? JSON.stringify(details) : null,
      recommendations ? JSON.stringify(recommendations) : null
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating security vulnerability:', error);
    res.status(500).json({ error: 'Failed to create security vulnerability' });
  }
});

/**
 * @desc    Update an existing security vulnerability
 * @route   PUT /api/security/vulnerabilities/:vulnId
 * @access  Admin
 */
router.put('/vulnerabilities/:vulnId', authenticateToken, async (req, res) => {
  try {
    const { vulnId } = req.params;
    const { name, description, severity, status, affectedComponent, details, recommendations } = req.body;
    
    // Check if vulnerability exists
    const checkQuery = 'SELECT * FROM security_vulnerabilities WHERE vuln_id = $1';
    const checkResult = await pool.query(checkQuery, [vulnId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Security vulnerability not found' });
    }
    
    const query = `
      UPDATE security_vulnerabilities
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        severity = COALESCE($3, severity),
        status = COALESCE($4, status),
        affected_component = COALESCE($5, affected_component),
        details = COALESCE($6, details),
        recommendations = COALESCE($7, recommendations)
      WHERE vuln_id = $8
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name, 
      description, 
      severity, 
      status, 
      affectedComponent,
      details ? JSON.stringify(details) : null,
      recommendations ? JSON.stringify(recommendations) : null,
      vulnId
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating security vulnerability:', error);
    res.status(500).json({ error: 'Failed to update security vulnerability' });
  }
});

/**
 * @desc    Delete a security vulnerability
 * @route   DELETE /api/security/vulnerabilities/:vulnId
 * @access  Admin
 */
router.delete('/vulnerabilities/:vulnId', authenticateToken, async (req, res) => {
  try {
    const { vulnId } = req.params;
    
    const query = 'DELETE FROM security_vulnerabilities WHERE vuln_id = $1 RETURNING *';
    const result = await pool.query(query, [vulnId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Security vulnerability not found' });
    }
    
    res.json({ message: 'Security vulnerability deleted successfully' });
  } catch (error) {
    console.error('Error deleting security vulnerability:', error);
    res.status(500).json({ error: 'Failed to delete security vulnerability' });
  }
});

// THREAT CRUD OPERATIONS

/**
 * @desc    Create a new security threat
 * @route   POST /api/security/threats
 * @access  Admin
 */
router.post('/threats', authenticateToken, async (req, res) => {
  try {
    const { type, description, severity, ipAddress, userId, contextData } = req.body;
    
    if (!type || !description || !severity) {
      return res.status(400).json({ error: 'Type, description, and severity are required fields' });
    }
    
    const query = `
      INSERT INTO security_threats 
        (threat_id, type, description, severity, ip_address, user_id, status, context_data, created_at)
      VALUES 
        (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      type, 
      description, 
      severity, 
      ipAddress || null, 
      userId || null, 
      'active',
      contextData ? JSON.stringify(contextData) : null
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating security threat:', error);
    res.status(500).json({ error: 'Failed to create security threat' });
  }
});

/**
 * @desc    Update an existing security threat
 * @route   PUT /api/security/threats/:threatId
 * @access  Admin
 */
router.put('/threats/:threatId', authenticateToken, async (req, res) => {
  try {
    const { threatId } = req.params;
    const { type, description, severity, status, ipAddress, userId, contextData, resolutionNotes } = req.body;
    
    // Check if threat exists
    const checkQuery = 'SELECT * FROM security_threats WHERE threat_id = $1';
    const checkResult = await pool.query(checkQuery, [threatId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Security threat not found' });
    }
    
    // If status is being changed to resolved, add resolved timestamp
    let resolvedAt = null;
    if (status === 'resolved' && checkResult.rows[0].status !== 'resolved') {
      resolvedAt = new Date();
    }
    
    const query = `
      UPDATE security_threats
      SET 
        type = COALESCE($1, type),
        description = COALESCE($2, description),
        severity = COALESCE($3, severity),
        status = COALESCE($4, status),
        ip_address = COALESCE($5, ip_address),
        user_id = COALESCE($6, user_id),
        context_data = COALESCE($7, context_data),
        resolution_notes = COALESCE($8, resolution_notes),
        resolved_at = COALESCE($9, resolved_at),
        admin_id = CASE WHEN $4 = 'resolved' AND $10 IS NOT NULL THEN $10 ELSE admin_id END
      WHERE threat_id = $11
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      type, 
      description, 
      severity, 
      status, 
      ipAddress,
      userId,
      contextData ? JSON.stringify(contextData) : null,
      resolutionNotes,
      resolvedAt,
      req.user.adminId, // Current admin resolving the threat
      threatId
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating security threat:', error);
    res.status(500).json({ error: 'Failed to update security threat' });
  }
});

/**
 * @desc    Delete a security threat
 * @route   DELETE /api/security/threats/:threatId
 * @access  Admin
 */
router.delete('/threats/:threatId', authenticateToken, async (req, res) => {
  try {
    const { threatId } = req.params;
    
    const query = 'DELETE FROM security_threats WHERE threat_id = $1 RETURNING *';
    const result = await pool.query(query, [threatId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Security threat not found' });
    }
    
    res.json({ message: 'Security threat deleted successfully' });
  } catch (error) {
    console.error('Error deleting security threat:', error);
    res.status(500).json({ error: 'Failed to delete security threat' });
  }
});

/**
 * @desc    Get a single security vulnerability by ID
 * @route   GET /api/security/vulnerabilities/:vulnId
 * @access  Admin
 */
router.get('/vulnerabilities/:vulnId', authenticateToken, async (req, res) => {
  try {
    const { vulnId } = req.params;
    
    const query = `
      SELECT * FROM security_vulnerabilities 
      WHERE vuln_id = $1
    `;
    
    const result = await pool.query(query, [vulnId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Security vulnerability not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching security vulnerability:', error);
    res.status(500).json({ error: 'Failed to fetch security vulnerability' });
  }
});

/**
 * @desc    Get a single security threat by ID
 * @route   GET /api/security/threats/:threatId
 * @access  Admin
 */
router.get('/threats/:threatId', authenticateToken, async (req, res) => {
  try {
    const { threatId } = req.params;
    
    const query = `
      SELECT 
        t.*,
        u.name AS affected_user,
        a.first_name || ' ' || a.last_name AS resolved_by
      FROM security_threats t
      LEFT JOIN users u ON t.user_id = u.user_id
      LEFT JOIN admins a ON t.admin_id = a.admin_id
      WHERE t.threat_id = $1
    `;
    
    const result = await pool.query(query, [threatId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Security threat not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching security threat:', error);
    res.status(500).json({ error: 'Failed to fetch security threat' });
  }
});
