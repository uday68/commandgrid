import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class MarketplaceService {
  async getTools(userId, contextType, contextId) {
    try {
      // Get user's purchased tools
      const purchasedTools = await db.query(`
        SELECT tool_id
        FROM marketplace_purchases
        WHERE user_id = $1
      `, [userId]);

      const purchasedToolIds = purchasedTools.rows.map(row => row.tool_id);

      // Get available tools based on user context
      const tools = await db.query(`
        SELECT 
          t.*,
          COALESCE(AVG(r.rating), 0) as rating,
          COUNT(r.id) as review_count
        FROM marketplace_tools t
        LEFT JOIN marketplace_reviews r ON t.id = r.tool_id
        WHERE 
          t.is_active = true
          AND (
            t.available_for = 'all'
            OR (t.available_for = 'company' AND $2 = 'company')
            OR (t.available_for = 'team' AND $2 = 'team')
            OR (t.available_for = 'user' AND $2 = 'user')
          )
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `, [contextType]);

      // Format tools with purchase status
      return tools.rows.map(tool => ({
        ...tool,
        isPurchased: purchasedToolIds.includes(tool.id),
        rating: parseFloat(tool.rating),
        reviewCount: parseInt(tool.review_count)
      }));
    } catch (error) {
      logger.error('Error getting marketplace tools:', error);
      throw error;
    }
  }

  async purchaseTool(userId, toolId) {
    try {
      // Start transaction
      await db.query('BEGIN');

      // Get tool details
      const tool = await db.query(`
        SELECT *
        FROM marketplace_tools
        WHERE id = $1 AND is_active = true
      `, [toolId]);

      if (tool.rows.length === 0) {
        throw new Error('Tool not found or inactive');
      }

      // Check if already purchased
      const existingPurchase = await db.query(`
        SELECT 1
        FROM marketplace_purchases
        WHERE user_id = $1 AND tool_id = $2
      `, [userId, toolId]);

      if (existingPurchase.rows.length > 0) {
        throw new Error('Tool already purchased');
      }

      // Create purchase record
      await db.query(`
        INSERT INTO marketplace_purchases (user_id, tool_id, purchase_date)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `, [userId, toolId]);

      // Commit transaction
      await db.query('COMMIT');

      return true;
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      logger.error('Error purchasing tool:', error);
      throw error;
    }
  }

  async getPurchasedTools(userId) {
    try {
      const result = await db.query(`
        SELECT 
          t.*,
          p.purchase_date,
          COALESCE(AVG(r.rating), 0) as rating,
          COUNT(r.id) as review_count
        FROM marketplace_purchases p
        JOIN marketplace_tools t ON p.tool_id = t.id
        LEFT JOIN marketplace_reviews r ON t.id = r.tool_id
        WHERE p.user_id = $1
        GROUP BY t.id, p.purchase_date
        ORDER BY p.purchase_date DESC
      `, [userId]);

      return result.rows.map(tool => ({
        ...tool,
        rating: parseFloat(tool.rating),
        reviewCount: parseInt(tool.review_count)
      }));
    } catch (error) {
      logger.error('Error getting purchased tools:', error);
      throw error;
    }
  }

  async addReview(userId, toolId, rating, comment) {
    try {
      // Check if user has purchased the tool
      const purchase = await db.query(`
        SELECT 1
        FROM marketplace_purchases
        WHERE user_id = $1 AND tool_id = $2
      `, [userId, toolId]);

      if (purchase.rows.length === 0) {
        throw new Error('Cannot review a tool that has not been purchased');
      }

      // Add or update review
      await db.query(`
        INSERT INTO marketplace_reviews (user_id, tool_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, tool_id) 
        DO UPDATE SET 
          rating = $3,
          comment = $4,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, toolId, rating, comment]);

      return true;
    } catch (error) {
      logger.error('Error adding review:', error);
      throw error;
    }
  }
} 