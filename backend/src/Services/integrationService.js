import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { pool } from '../Config/database.js';
import slackService from './integrations/slackService.js';
import githubService from './integrations/githubService.js';
import jiraService from './integrations/jiraService.js';
import trelloService from './integrations/trelloService.js';

class IntegrationService {
  async getIntegrations(userId) {
    try {
      const query = `
        SELECT i.*, ui.status, ui.credentials
        FROM integrations i
        LEFT JOIN user_integrations ui ON i.id = ui.integration_id AND ui.user_id = $1
        WHERE i.is_active = true
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting integrations:', error);
      throw error;
    }
  }

  async getAvailableIntegrations() {
    try {
      const query = `
        SELECT id, name, description, icon_url, category
        FROM integrations
        WHERE is_active = true
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting available integrations:', error);
      throw error;
    }
  }

  async checkIntegrationStatus(userId, integrationId) {
    try {
      const query = `
        SELECT ui.*, i.name, i.type
        FROM user_integrations ui
        JOIN integrations i ON ui.integration_id = i.id
        WHERE ui.user_id = $1 AND ui.integration_id = $2
      `;
      const result = await pool.query(query, [userId, integrationId]);
      
      if (result.rows.length === 0) {
        return {
          status: 'disconnected',
          details: 'Integration not connected'
        };
      }

      const integration = result.rows[0];
      const credentials = JSON.parse(integration.credentials);
      
      // Initialize and check status based on integration type
      switch (integration.type) {
        case 'google_drive':
          return await this.checkGoogleDriveStatus(credentials);
        case 'slack':
          return await this.checkSlackStatus(credentials);
        case 'github':
          return await this.checkGithubStatus(credentials);
        case 'jira':
          return await this.checkJiraStatus(credentials);
        case 'trello':
          return await this.checkTrelloStatus(credentials);
        default:
          return {
            status: 'error',
            details: 'Unknown integration type'
          };
      }
    } catch (error) {
      console.error('Error checking integration status:', error);
      return {
        status: 'error',
        details: error.message
      };
    }
  }

  async checkGoogleDriveStatus(credentials) {
    try {
      const oauth2Client = new OAuth2Client();
      oauth2Client.setCredentials(credentials);

      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      await drive.files.list({ pageSize: 1 });

      return {
        status: 'connected',
        details: 'Google Drive is connected and working properly'
      };
    } catch (error) {
      return {
        status: 'disconnected',
        details: 'Google Drive connection failed: ' + error.message
      };
    }
  }

  async checkSlackStatus(credentials) {
    try {
      await slackService.initialize(credentials.access_token);
      return await slackService.checkStatus();
    } catch (error) {
      return {
        status: 'disconnected',
        details: 'Slack connection failed: ' + error.message
      };
    }
  }

  async checkGithubStatus(credentials) {
    try {
      await githubService.initialize(credentials.access_token);
      return await githubService.checkStatus();
    } catch (error) {
      return {
        status: 'disconnected',
        details: 'GitHub connection failed: ' + error.message
      };
    }
  }

  async checkJiraStatus(credentials) {
    try {
      await jiraService.initialize(credentials);
      return await jiraService.checkStatus();
    } catch (error) {
      return {
        status: 'disconnected',
        details: 'Jira connection failed: ' + error.message
      };
    }
  }

  async checkTrelloStatus(credentials) {
    try {
      await trelloService.initialize(credentials.apiKey, credentials.token);
      return await trelloService.checkStatus();
    } catch (error) {
      return {
        status: 'disconnected',
        details: 'Trello connection failed: ' + error.message
      };
    }
  }

  async connectIntegration(userId, integrationId, credentials) {
    try {
      const query = `
        INSERT INTO user_integrations (user_id, integration_id, credentials, status)
        VALUES ($1, $2, $3, 'connected')
        ON CONFLICT (user_id, integration_id)
        DO UPDATE SET credentials = $3, status = 'connected', updated_at = NOW()
        RETURNING *
      `;
      const result = await pool.query(query, [userId, integrationId, JSON.stringify(credentials)]);
      return result.rows[0];
    } catch (error) {
      console.error('Error connecting integration:', error);
      throw error;
    }
  }

  async disconnectIntegration(userId, integrationId) {
    try {
      const query = `
        UPDATE user_integrations
        SET status = 'disconnected', updated_at = NOW()
        WHERE user_id = $1 AND integration_id = $2
        RETURNING *
      `;
      const result = await pool.query(query, [userId, integrationId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      throw error;
    }
  }
}

export default new IntegrationService(); 