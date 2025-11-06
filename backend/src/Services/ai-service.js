const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * AI Service for handling AI-related functionality
 */
class AIService {
  /**
   * Create a new AI assistance session
   * @param {string} userId - User ID
   * @param {string} context - Context for the session
   * @param {string} initialPrompt - Initial prompt from the user
   * @returns {Promise<Object>} - Created session and interaction
   */
  async createSession(userId, context, initialPrompt) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create a new AI assistance session
      const sessionResult = await client.query(
        `INSERT INTO ai_assistance_sessions 
         (user_id, context, initial_prompt, status, model_version)
         VALUES ($1, $2, $3, 'active', $4)
         RETURNING *`,
        [userId, context, initialPrompt, process.env.AI_MODEL_VERSION || 'gpt-3.5-turbo']
      );
      
      const session = sessionResult.rows[0];
      
      // In a real implementation, we would call an external AI service here
      const aiResponse = await this.generateAIResponse(initialPrompt, context);
      
      // Log the interaction
      const interactionResult = await client.query(
        `INSERT INTO ai_interactions
         (session_id, user_message, ai_response, context_data)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [session.session_id, initialPrompt, aiResponse, JSON.stringify({ source: 'initial_prompt' })]
      );
      
      await client.query('COMMIT');
      
      return {
        session,
        interaction: interactionResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Send a message to an AI session and get a response
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID 
   * @param {string} message - User message
   * @param {Object} contextData - Additional context data
   * @returns {Promise<Object>} - AI response
   */
  async sendMessage(sessionId, userId, message, contextData = {}) {
    const client = await pool.connect();
    
    try {
      // Verify session exists and belongs to user
      const sessionResult = await client.query(
        'SELECT * FROM ai_assistance_sessions WHERE session_id = $1 AND user_id = $2',
        [sessionId, userId]
      );
      
      if (sessionResult.rows.length === 0) {
        throw new Error('Session not found or not authorized');
      }
      
      // Get previous interactions for context
      const previousInteractions = await client.query(
        `SELECT user_message, ai_response 
         FROM ai_interactions 
         WHERE session_id = $1 
         ORDER BY created_at ASC`,
        [sessionId]
      );
      
      // Build context from previous interactions
      const context = {
        sessionContext: sessionResult.rows[0].context,
        history: previousInteractions.rows,
        additionalContext: contextData || {}
      };
      
      // In a real implementation, we would call an external AI service with this context
      const aiResponse = await this.generateAIResponse(message, sessionResult.rows[0].context);
      
      // Log the interaction
      const interactionResult = await client.query(
        `INSERT INTO ai_interactions
         (session_id, user_message, ai_response, context_data)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [sessionId, message, aiResponse, JSON.stringify(contextData || {})]
      );
      
      return {
        interaction: interactionResult.rows[0],
        tokenInfo: {
          used: this.estimateTokenUsage(message, aiResponse),
          remaining: 10000 // This would be dynamically determined in a real implementation
        }
      };
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Close an AI session
   * @param {string} sessionId - Session ID 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Closed session
   */
  async closeSession(sessionId, userId) {
    try {
      const result = await pool.query(
        `UPDATE ai_assistance_sessions 
         SET status = 'closed', closed_at = NOW() 
         WHERE session_id = $1 AND user_id = $2
         RETURNING *`,
        [sessionId, userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Session not found or not authorized');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Generate AI recommendations for a user
   * @param {string} userId - User ID
   * @param {string} type - Recommendation type
   * @param {Object} data - Data for recommendation generation
   * @returns {Promise<void>}
   */
  async generateRecommendations(userId, type, data) {
    try {
      // This would use AI to generate relevant recommendations based on user data
      // For now, we'll create a sample recommendation
      const content = `Based on your recent activity, you might want to consider 
                      ${type === 'project' ? 'restructuring your project timeline' : 
                      type === 'task' ? 'breaking down this large task into subtasks' : 
                      'optimizing your team allocation'}`;
      
      await pool.query(
        `INSERT INTO ai_recommendations
         (user_id, recommendation_type, content, related_entity_type, confidence_score)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, type, content, data.entityType || null, 0.85]
      );
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  }
  
  /**
   * Get AI recommendations for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - AI recommendations
   */
  async getRecommendations(userId) {
    try {
      const result = await pool.query(
        `SELECT * FROM ai_recommendations
         WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC`,
        [userId]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  }
  
  /**
   * Mark recommendation as viewed or acted upon
   * @param {string} recommendationId - Recommendation ID
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated recommendation
   */
  async updateRecommendationStatus(recommendationId, userId, updates) {
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.viewed !== undefined) {
      updateFields.push(`viewed = $${paramCount}`);
      values.push(updates.viewed);
      paramCount++;
    }
    
    if (updates.actedUpon !== undefined) {
      updateFields.push(`acted_upon = $${paramCount}`);
      values.push(updates.actedUpon);
      paramCount++;
    }
    
    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(recommendationId, userId);
    
    try {
      const result = await pool.query(
        `UPDATE ai_recommendations
         SET ${updateFields.join(', ')}
         WHERE recommendation_id = $${paramCount++} AND user_id = $${paramCount}
         RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) {
        throw new Error('Recommendation not found or not authorized');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Generate an AI response (simulation for development)
   * @param {string} prompt - User prompt
   * @param {string} context - Context
   * @returns {Promise<string>} - AI response
   */
  async generateAIResponse(prompt, context) {
    // This is just a simulation - in production this would call an actual AI API
    const responses = {
      'project': `Based on the project context, I recommend focusing on the critical path items first. 
                Consider breaking down the larger tasks into smaller, manageable subtasks.`,
      'task': `This task looks complex. Consider the following approach:
              1. Start by gathering all requirements
              2. Create a detailed implementation plan
              3. Break it into subtasks for easier management`,
      'analysis': `My analysis shows this needs more detailed requirements. 
                  The timeline seems optimistic given the complexity.`,
      'recommendation': `I recommend adding at least one more team member with backend expertise to this project.
                        The current team composition may struggle with the database optimization tasks.`,
      'default': `I've analyzed your request. Please provide more specific information about what you need assistance with.
                I can help with project planning, task analysis, or technical recommendations.`
    };
    
    // Add a slight delay to simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return relevant response based on context, or default if no match
    const contextLower = (context || '').toLowerCase();
    if (contextLower.includes('project')) return responses.project;
    if (contextLower.includes('task')) return responses.task;
    if (contextLower.includes('analysis')) return responses.analysis;
    if (contextLower.includes('recommendation')) return responses.recommendation;
    return responses.default;
  }
  
  /**
   * Estimate token usage for billing/limits
   * @param {string} userMessage - User message
   * @param {string} aiResponse - AI response
   * @returns {number} - Estimated token count
   */
  estimateTokenUsage(userMessage, aiResponse) {
    // Very rough estimate: ~1 token per 4 characters
    const userTokens = Math.ceil(userMessage.length / 4);
    const aiTokens = Math.ceil(aiResponse.length / 4);
    return userTokens + aiTokens;
  }
}

module.exports = new AIService();
