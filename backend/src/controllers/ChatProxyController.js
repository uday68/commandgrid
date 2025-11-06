import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { pool } from '../Config/database.js';

dotenv.config();

// AI Backend URL
const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:8000';

class ChatProxyController {
  /**
   * Proxy a chat message to the AI backend
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async proxyMessage(req, res) {
    try {
      const { message } = req.body;
      const userId = req.user.userId || req.user.adminId;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      // Get user details to include in token
      const userQuery = 'SELECT name, email, role FROM users WHERE id = $1';
      const userResult = await pool.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = userResult.rows[0];
      
      // Create a token for the AI backend
      const token = jwt.sign(
        { userId, email: user.email, name: user.name, role: user.role },
        process.env.SECRET_KEY,
        { expiresIn: '1h' }
      );
      
      // Forward the request to the AI backend
      const aiResponse = await axios.post(
        `${AI_BACKEND_URL}/ai/query`,
        {
          query: message,
          context: {
            userId,
            source: 'chat_interface'
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Transform the response to the format expected by the front-end
      const transformedResponse = {
        message: aiResponse.data.response,
        follow_up_questions: aiResponse.data.follow_up || [],
        data: aiResponse.data.data || {},
        timestamp: new Date().toISOString()
      };
      
      // Store the message in the database
      await this.storeMessage(userId, message, transformedResponse.message);
      
      res.json(transformedResponse);
    } catch (error) {
      console.error('Error proxying message to AI backend:', error);
      
      // Return a graceful error
      res.status(500).json({
        message: 'Sorry, I was unable to process your message. Please try again later.',
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    }
  }
  
  /**
   * Get chat history for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getChatHistory(req, res) {
    try {
      const userId = req.user.userId || req.user.adminId;
      
      // Get most recent chat history (last 50 messages)
      const historyQuery = `
        SELECT 
          id, 
          user_message as content, 
          false as is_bot, 
          created_at as timestamp
        FROM 
          chat_messages
        WHERE 
          user_id = $1
        UNION
        SELECT 
          id, 
          ai_response as content,
          true as is_bot,
          created_at as timestamp
        FROM 
          chat_messages
        WHERE 
          user_id = $1
        ORDER BY 
          timestamp DESC
        LIMIT 50
      `;
      
      const historyResult = await pool.query(historyQuery, [userId]);
      
      // Return the messages in chronological order
      res.json(historyResult.rows.reverse());
    } catch (error) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Failed to load chat history' : error.message
      });
    }
  }
  
  /**
   * Store a chat message in the database
   * @param {string} userId - User ID
   * @param {string} userMessage - User message
   * @param {string} aiResponse - AI response
   */
  async storeMessage(userId, userMessage, aiResponse) {
    try {
      const query = `
        INSERT INTO chat_messages
        (user_id, user_message, ai_response)
        VALUES ($1, $2, $3)
      `;
      
      await pool.query(query, [userId, userMessage, aiResponse]);
    } catch (error) {
      console.error('Error storing chat message:', error);
      // Don't throw - this is a non-critical operation
    }
  }
}

export default ChatProxyController;
