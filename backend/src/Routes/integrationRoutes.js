import express from 'express';
import { cache } from '../middleware/cache.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import integrationController from '../controllers/integrationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../Config/database.js';

const router = express.Router();

// Apply rate limiting
router.use(apiLimiter);

// Get all integrations
router.get('/', cache(300), authenticateToken, integrationController.getAllIntegrations);

// Get integration by ID
router.get('/:id', cache(300), authenticateToken, integrationController.getIntegrationById);

// Create new integration
router.post('/', authenticateToken, integrationController.createIntegration);

// Update integration
router.put('/:id', authenticateToken, integrationController.updateIntegration);

// Delete integration
router.delete('/:id', authenticateToken, integrationController.deleteIntegration);

// Test integration connection
router.post('/:id/test', authenticateToken, integrationController.testConnection);

// Get integration status
router.get('/:service/status', cache(300), async (req, res, next) => {
  try {
    const { service } = req.params;
    const status = await pool.query(
      'SELECT status, last_sync, error_message FROM integrations WHERE service = $1',
      [service]
    );
    if (status.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    res.json(status.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Connect Google Drive
router.post('/google-drive', async (req, res) => {
  try {
    const { accessToken } = req.body;
    // Validate access token
    const isValid = await validateGoogleToken(accessToken);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid access token' });
    }

    // Store integration
    const integration = await pool.query(
      `INSERT INTO integrations (service, access_token, status, connected_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      ['google-drive', accessToken, 'active', req.user.id]
    );
    res.json(integration.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Connect Dropbox
router.post('/dropbox', async (req, res) => {
  try {
    const { accessToken } = req.body;
    // Validate access token
    const isValid = await validateDropboxToken(accessToken);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid access token' });
    }

    // Store integration
    const integration = await pool.query(
      `INSERT INTO integrations (service, access_token, status, connected_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      ['dropbox', accessToken, 'active', req.user.id]
    );
    res.json(integration.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Connect GitHub
router.post('/github', async (req, res) => {
  try {
    const { accessToken } = req.body;
    // Validate access token
    const isValid = await validateGitHubToken(accessToken);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid access token' });
    }

    // Store integration
    const integration = await pool.query(
      `INSERT INTO integrations (service, access_token, status, connected_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      ['github', accessToken, 'active', req.user.id]
    );
    res.json(integration.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Connect Slack
router.post('/slack', async (req, res) => {
  try {
    const { accessToken } = req.body;
    // Validate access token
    const isValid = await validateSlackToken(accessToken);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid access token' });
    }

    // Store integration
    const integration = await pool.query(
      `INSERT INTO integrations (service, access_token, status, connected_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      ['slack', accessToken, 'active', req.user.id]
    );
    res.json(integration.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Connect Jira
router.post('/jira', async (req, res) => {
  try {
    const { apiToken, domain } = req.body;
    // Validate API token and domain
    const isValid = await validateJiraCredentials(apiToken, domain);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Store integration
    const integration = await pool.query(
      `INSERT INTO integrations (service, api_token, domain, status, connected_by, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      ['jira', apiToken, domain, 'active', req.user.id]
    );
    res.json(integration.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Connect Figma
router.post('/figma', async (req, res) => {
  try {
    const { accessToken } = req.body;
    // Validate access token
    const isValid = await validateFigmaToken(accessToken);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid access token' });
    }

    // Store integration
    const integration = await pool.query(
      `INSERT INTO integrations (service, access_token, status, connected_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      ['figma', accessToken, 'active', req.user.id]
    );
    res.json(integration.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Connect QuickBooks
router.post('/quickbooks', async (req, res) => {
  try {
    const { clientId, clientSecret, refreshToken } = req.body;
    // Validate credentials
    const isValid = await validateQuickBooksCredentials(clientId, clientSecret, refreshToken);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Store integration
    const integration = await pool.query(
      `INSERT INTO integrations (service, client_id, client_secret, refresh_token, status, connected_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      ['quickbooks', clientId, clientSecret, refreshToken, 'active', req.user.id]
    );
    res.json(integration.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Connect AutoCAD
router.post('/autocad', async (req, res) => {
  try {
    const { apiKey } = req.body;
    // Validate API key
    const isValid = await validateAutoCADKey(apiKey);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid API key' });
    }

    // Store integration
    const integration = await pool.query(
      `INSERT INTO integrations (service, api_key, status, connected_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      ['autocad', apiKey, 'active', req.user.id]
    );
    res.json(integration.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Connect Canvas
router.post('/canvas', async (req, res) => {
  try {
    const { apiKey, domain } = req.body;
    // Validate API key and domain
    const isValid = await validateCanvasCredentials(apiKey, domain);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Store integration
    const integration = await pool.query(
      `INSERT INTO integrations (service, api_key, domain, status, connected_by, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      ['canvas', apiKey, domain, 'active', req.user.id]
    );
    res.json(integration.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Disconnect integration
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE integrations SET status = $1, disconnected_at = NOW() WHERE id = $2',
      ['disconnected', id]
    );
    res.json({ message: 'Integration disconnected successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;