import express from 'express';
import { z } from 'zod';
import { cache } from '../middleware/cache.js';
import { apiLimiter, commentLimiter, likeLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { pool } from '../Config/database.js';
import { logActivity } from '../middleware/activityLogger.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const postSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(10000),
  category: z.string().optional(),
  tags: z.array(z.string()).optional()
});

const commentSchema = z.object({
  content: z.string().min(1).max(1000)
});

// Apply rate limiting
router.use(apiLimiter);

// Get all community posts with pagination
router.get('/posts', cache(300), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        p.*,
        u.first_name as author_first_name,
        u.last_name as author_last_name,
        COUNT(c.id) as comment_count,
        COUNT(DISTINCT l.user_id) as like_count
      FROM community_posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN post_replies c ON p.post_id = c.post_id AND c.is_deleted = false
      LEFT JOIN post_likes l ON p.post_id = l.post_id
      WHERE p.is_deleted = false
    `;

    const queryParams = [];
    const conditions = [];

    if (category) {
      conditions.push('p.category = $1');
      queryParams.push(category);
    }

    if (search) {
      conditions.push(`(p.title ILIKE $${queryParams.length + 1} OR p.content ILIKE $${queryParams.length + 1})`);
      queryParams.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY p.post_id, u.first_name, u.last_name
      ORDER BY p.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    queryParams.push(limit, offset);

    const posts = await pool.query(query, queryParams);
    res.json(posts.rows);
  } catch (error) {
    next(error);
  }
});

// Get post by ID
router.get('/posts/:id', cache(300), async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await pool.query(`
      SELECT 
        p.*,
        u.first_name as author_first_name,
        u.last_name as author_last_name,
        COUNT(DISTINCT l.user_id) as like_count
      FROM community_posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN post_likes l ON p.post_id = l.post_id
      WHERE p.post_id = $1 AND p.is_deleted = false
      GROUP BY p.post_id, u.first_name, u.last_name
    `, [id]);

    if (post.rows.length === 0) {
      throw new AppError('Post not found', 404);
    }

    res.json(post.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create new post
router.post('/posts', validateRequest(postSchema), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { title, content, category, tags } = req.body;
    const post = await client.query(
      `INSERT INTO community_posts (
        title,
        content,
        category,
        author_id,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`,
      [title, content, category, req.user.id]
    );

    if (tags && tags.length > 0) {
      const tagValues = tags.map(tag => `($1, $2)`).join(',');
      const tagParams = tags.map(tag => [post.rows[0].post_id, tag]).flat();
      await client.query(
        `INSERT INTO post_tags (post_id, tag_id)
         VALUES ${tagValues}`,
        tagParams
      );
    }

    await client.query('COMMIT');

    // Log activity
    await logActivity(req.user.id, null, null, 'create_post', {
      postId: post.rows[0].post_id,
      title
    });

    res.status(201).json(post.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Update post
router.put('/posts/:id', validateRequest(postSchema), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { title, content, category, tags } = req.body;

    const post = await client.query(
      `UPDATE community_posts
       SET title = $1, content = $2, category = $3, updated_at = NOW()
       WHERE post_id = $4 AND author_id = $5 AND is_deleted = false
       RETURNING *`,
      [title, content, category, id, req.user.id]
    );

    if (post.rows.length === 0) {
      throw new AppError('Post not found or unauthorized', 404);
    }

    if (tags) {
      await client.query('DELETE FROM post_tags WHERE post_id = $1', [id]);
      if (tags.length > 0) {
        const tagValues = tags.map(tag => `($1, $2)`).join(',');
        const tagParams = tags.map(tag => [id, tag]).flat();
        await client.query(
          `INSERT INTO post_tags (post_id, tag_id)
           VALUES ${tagValues}`,
          tagParams
        );
      }
    }

    await client.query('COMMIT');

    // Log activity
    await logActivity(req.user.id, null, null, 'update_post', {
      postId: id,
      title
    });

    res.json(post.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Soft delete post
router.delete('/posts/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const post = await client.query(
      `UPDATE community_posts 
       SET is_deleted = true, deleted_at = NOW()
       WHERE post_id = $1 AND author_id = $2 AND is_deleted = false
       RETURNING *`,
      [id, req.user.id]
    );

    if (post.rows.length === 0) {
      throw new AppError('Post not found or unauthorized', 404);
    }

    await client.query('COMMIT');

    // Log activity
    await logActivity(req.user.id, null, null, 'delete_post', {
      postId: id,
      title: post.rows[0].title
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Get post comments with pagination
router.get('/posts/:id/comments', cache(300), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const comments = await pool.query(`
      SELECT 
        c.*,
        u.first_name as author_first_name,
        u.last_name as author_last_name
      FROM post_replies c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.post_id = $1 AND c.is_deleted = false
      ORDER BY c.created_at ASC
      LIMIT $2 OFFSET $3
    `, [id, limit, offset]);
    res.json(comments.rows);
  } catch (error) {
    next(error);
  }
});

// Add comment to post
router.post('/posts/:id/comments', commentLimiter, validateRequest(commentSchema), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { content } = req.body;

    const comment = await client.query(
      `INSERT INTO post_replies (
        post_id,
        content,
        author_id,
        created_at
      ) VALUES ($1, $2, $3, NOW())
      RETURNING *`,
      [id, content, req.user.id]
    );

    await client.query('COMMIT');

    // Log activity
    await logActivity(req.user.id, null, null, 'add_comment', {
      postId: id,
      commentId: comment.rows[0].reply_id
    });

    res.status(201).json(comment.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Like/Unlike post
router.post('/posts/:id/like', likeLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const existingLike = await client.query(
      'SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existingLike.rows.length > 0) {
      // Unlike
      await client.query(
        'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      await client.query(
        'UPDATE community_posts SET likes = likes - 1 WHERE post_id = $1',
        [id]
      );
      res.json({ message: 'Post unliked successfully' });
    } else {
      // Like
      await client.query(
        'INSERT INTO post_likes (post_id, user_id, created_at) VALUES ($1, $2, NOW())',
        [id, req.user.id]
      );
      await client.query(
        'UPDATE community_posts SET likes = likes + 1 WHERE post_id = $1',
        [id]
      );
      res.json({ message: 'Post liked successfully' });
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Get help requests
router.get('/help-requests', cache(300), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        h.*,
        u.first_name as requester_first_name,
        u.last_name as requester_last_name,
        COUNT(r.id) as response_count
      FROM help_requests h
      LEFT JOIN users u ON h.requester_id = u.id
      LEFT JOIN help_responses r ON h.id = r.request_id
    `;

    const queryParams = [];
    const conditions = [];

    if (status) {
      conditions.push('h.status = $1');
      queryParams.push(status);
    }

    if (search) {
      conditions.push(`(h.title ILIKE $${queryParams.length + 1} OR h.description ILIKE $${queryParams.length + 1})`);
      queryParams.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY h.id, u.first_name, u.last_name
      ORDER BY h.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    queryParams.push(limit, offset);

    const requests = await pool.query(query, queryParams);
    res.json(requests.rows);
  } catch (error) {
    next(error);
  }
});

// Create help request
router.post('/help-requests', async (req, res) => {
  try {
    const { title, description, priority, category } = req.body;
    const request = await pool.query(
      `INSERT INTO help_requests (
        title,
        description,
        priority,
        category,
        requester_id,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, 'open', NOW())
      RETURNING *`,
      [title, description, priority, category, req.user.id]
    );

    // Log activity
    await logActivity(req.user.id, null, null, 'create_help_request', {
      requestId: request.rows[0].id,
      title
    });

    res.json(request.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update help request status
router.put('/help-requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const request = await pool.query(
      `UPDATE help_requests
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND requester_id = $3
       RETURNING *`,
      [status, id, req.user.id]
    );

    if (request.rows.length === 0) {
      throw new AppError('Request not found or unauthorized', 404);
    }

    // Log activity
    await logActivity(req.user.id, null, null, 'update_help_request', {
      requestId: id,
      status
    });

    res.json(request.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Add response to help request
router.post('/help-requests/:id/responses', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const response = await pool.query(
      `INSERT INTO help_responses (
        request_id,
        content,
        responder_id,
        created_at
      ) VALUES ($1, $2, $3, NOW())
      RETURNING *`,
      [id, content, req.user.id]
    );

    // Log activity
    await logActivity(req.user.id, null, null, 'add_help_response', {
      requestId: id,
      responseId: response.rows[0].id
    });

    res.json(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router; 