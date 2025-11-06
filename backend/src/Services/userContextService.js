import { pool } from '../Config/database.js';
import { logger } from '../utils/logger.js';

export class UserContextService {
  async getUserContexts(userId) {
    try {
      // Get user's personal context
      const personalContext = {
        id: `user_${userId}`,
        type: 'user',
        name: 'Personal Dashboard',
        dashboardUrl: '/dashboard'
      };

      // Get user's company contexts
      const companyContexts = await pool.query(`
        SELECT 
          c.id,
          c.name,
          ur.role
        FROM companies c
        JOIN user_roles ur ON c.id = ur.company_id
        WHERE ur.user_id = $1
      `, [userId]);

      // Get user's team contexts
      const teamContexts = await pool.query(`
        SELECT 
          t.id,
          t.name,
          t.company_id,
          c.name as company_name,
          ut.role
        FROM teams t
        JOIN user_teams ut ON t.id = ut.team_id
        JOIN companies c ON t.company_id = c.id
        WHERE ut.user_id = $1
      `, [userId]);

      // Format contexts
      const contexts = [
        personalContext,
        ...companyContexts.rows.map(company => ({
          id: `company_${company.id}`,
          type: 'company',
          name: company.name,
          role: company.role,
          dashboardUrl: `/company/${company.id}/dashboard`
        })),
        ...teamContexts.rows.map(team => ({
          id: `team_${team.id}`,
          type: 'team',
          name: `${team.name} (${team.company_name})`,
          role: team.role,
          dashboardUrl: `/team/${team.id}/dashboard`
        }))
      ];

      return contexts;
    } catch (error) {
      logger.error('Error getting user contexts:', error);
      throw error;
    }
  }

  async getCurrentContext(userId) {
    try {
      const result = await pool.query(`
        SELECT context_id, context_type
        FROM user_current_context
        WHERE user_id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return {
          id: `user_${userId}`,
          type: 'user',
          name: 'Personal Dashboard',
          dashboardUrl: '/dashboard'
        };
      }

      const { context_id, context_type } = result.rows[0];

      if (context_type === 'user') {
        return {
          id: `user_${userId}`,
          type: 'user',
          name: 'Personal Dashboard',
          dashboardUrl: '/dashboard'
        };
      }

      // Get context details based on type
      if (context_type === 'company') {
        const company = await pool.query(`
          SELECT c.name, ur.role
          FROM companies c
          JOIN user_roles ur ON c.id = ur.company_id
          WHERE c.id = $1 AND ur.user_id = $2
        `, [context_id, userId]);

        if (company.rows.length > 0) {
          return {
            id: `company_${context_id}`,
            type: 'company',
            name: company.rows[0].name,
            role: company.rows[0].role,
            dashboardUrl: `/company/${context_id}/dashboard`
          };
        }
      }

      if (context_type === 'team') {
        const team = await pool.query(`
          SELECT t.name, c.name as company_name, ut.role
          FROM teams t
          JOIN companies c ON t.company_id = c.id
          JOIN user_teams ut ON t.id = ut.team_id
          WHERE t.id = $1 AND ut.user_id = $2
        `, [context_id, userId]);

        if (team.rows.length > 0) {
          return {
            id: `team_${context_id}`,
            type: 'team',
            name: `${team.rows[0].name} (${team.rows[0].company_name})`,
            role: team.rows[0].role,
            dashboardUrl: `/team/${context_id}/dashboard`
          };
        }
      }

      // If context not found or user doesn't have access, return personal context
      return {
        id: `user_${userId}`,
        type: 'user',
        name: 'Personal Dashboard',
        dashboardUrl: '/dashboard'
      };
    } catch (error) {
      logger.error('Error getting current context:', error);
      throw error;
    }
  }

  async switchContext(userId, contextId) {
    try {
      const [type, id] = contextId.split('_');

      // Verify user has access to the context
      let hasAccess = false;
      let contextType = type;

      if (type === 'user' && id === userId.toString()) {
        hasAccess = true;
      } else if (type === 'company') {
        const result = await pool.query(`
          SELECT 1
          FROM user_roles
          WHERE user_id = $1 AND company_id = $2
        `, [userId, id]);
        hasAccess = result.rows.length > 0;
      } else if (type === 'team') {
        const result = await pool.query(`
          SELECT 1
          FROM user_teams
          WHERE user_id = $1 AND team_id = $2
        `, [userId, id]);
        hasAccess = result.rows.length > 0;
      }

      if (!hasAccess) {
        return false;
      }

      // Update current context
      await pool.query(`
        INSERT INTO user_current_context (user_id, context_id, context_type)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          context_id = $2,
          context_type = $3,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, id, contextType]);

      return true;
    } catch (error) {
      logger.error('Error switching context:', error);
      throw error;
    }
  }
} 