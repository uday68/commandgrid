import { pool } from '../Config/database.js';
import { AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';

export const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    if (!apiKey) {
      throw new AppError('API key is required', 401);
    }

    // Check if API key exists and is valid
    const query = `
      SELECT 
        ak.*,
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE ak.key = $1 
      AND ak.is_active = true 
      AND ak.expires_at > NOW()
    `;

    const result = await pool.query(query, [apiKey]);

    if (result.rows.length === 0) {
      throw new AppError('Invalid or expired API key', 401);
    }

    // Attach user and API key info to request
    req.apiKey = result.rows[0];
    req.user = {
      id: result.rows[0].user_id,
      email: result.rows[0].email,
      firstName: result.rows[0].first_name,
      lastName: result.rows[0].last_name
    };

    // Log API key usage
    logger.info('API key used', {
      userId: req.user.id,
      apiKeyId: req.apiKey.id,
      endpoint: req.originalUrl,
      method: req.method
    });

    next();
  } catch (error) {
    next(error);
  }
}; 