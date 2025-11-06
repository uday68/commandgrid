const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { authenticateToken } = require('../../middleware/auth');
const dbConfig = require('../../Config/db');

const pool = mysql.createPool(dbConfig);

// Get all posts in a community space
router.get('/space/:spaceId', authenticateToken, async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { sort = 'newest', filter = 'all', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Construct ordering
    let orderClause;
    switch (sort) {
      case 'newest':
        orderClause = 'p.created_at DESC';
        break;
      case 'oldest':
        orderClause = 'p.created_at ASC';
        break;
      case 'most_viewed':
        orderClause = 'p.view_count DESC';
        break;
      case 'most_reactions':
        orderClause = '(SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.id) DESC';
        break;
      default:
        orderClause = 'p.created_at DESC';
    }
    
    // Construct filter
    let filterClause = '';
    if (filter === 'announcements') {
      filterClause = 'AND p.is_announcement = 1';
    } else if (filter === 'pinned') {
      filterClause = 'AND p.is_pinned = 1';
    }
    
    // Get posts with user info and reaction counts
    const [posts] = await pool.execute(
      `SELECT p.*, u.username, u.avatar_url,
        (SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.id) as reaction_count,
        (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comment_count
      FROM community_posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.space_id = ? ${filterClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?`,
      [spaceId, parseInt(limit), parseInt(offset)]
    );
    
    // Get total count for pagination
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM community_posts 
       WHERE space_id = ? ${filterClause}`,
      [spaceId]
    );
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      posts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single post with details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Increment view count
    await pool.execute(
      'UPDATE community_posts SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );
    
    // Get post with user info
    const [posts] = await pool.execute(
      `SELECT p.*, u.username, u.avatar_url
       FROM community_posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );
    
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = posts[0];
    
    // Get reactions grouped by type
    const [reactions] = await pool.execute(
      `SELECT reaction_type, COUNT(*) as count,
       (SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = ? AND pr.user_id = ?) as user_reacted
       FROM post_reactions
       WHERE post_id = ?
       GROUP BY reaction_type`,
      [id, userId, id]
    );
    
    // Check if user bookmarked this post
    const [bookmarks] = await pool.execute(
      'SELECT id FROM user_bookmarks WHERE post_id = ? AND user_id = ?',
      [id, userId]
    );
    
    // Get poll if exists
    const [polls] = await pool.execute(
      'SELECT * FROM post_polls WHERE post_id = ?',
      [id]
    );
    
    const poll = polls.length > 0 ? polls[0] : null;
    
    // If poll exists, get user's votes
    let userVotes = [];
    if (poll) {
      const [votes] = await pool.execute(
        'SELECT option_index FROM poll_votes WHERE poll_id = ? AND user_id = ?',
        [poll.id, userId]
      );
      userVotes = votes.map(v => v.option_index);
      
      // Get vote counts by option
      const [voteCounts] = await pool.execute(
        'SELECT option_index, COUNT(*) as count FROM poll_votes WHERE poll_id = ? GROUP BY option_index',
        [poll.id]
      );
      
      poll.vote_counts = voteCounts;
      poll.user_votes = userVotes;
    }
    
    // Build response
    post.reactions = reactions;
    post.is_bookmarked = bookmarks.length > 0;
    post.poll = poll;
    
    res.json({ post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new post
router.post('/', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { 
      space_id, 
      title, 
      content, 
      content_format = 'markdown', 
      tags = [],
      is_announcement = false,
      poll = null
    } = req.body;
    
    const userId = req.user.userId;
    
    // Validate required fields
    if (!space_id || !title || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'Space ID, title and content are required' 
      });
    }
    
    await connection.beginTransaction();
    
    // Check if user is a member of the space
    const [members] = await connection.execute(
      'SELECT id FROM space_members WHERE space_id = ? AND user_id = ?',
      [space_id, userId]
    );
    
    if (members.length === 0) {
      await connection.rollback();
      return res.status(403).json({ error: 'Only space members can create posts' });
    }
    
    // For announcements, check if user is admin/moderator
    if (is_announcement) {
      const [admins] = await connection.execute(
        'SELECT id FROM space_members WHERE space_id = ? AND user_id = ? AND role IN (?, ?)',
        [space_id, userId, 'admin', 'moderator']
      );
      
      if (admins.length === 0) {
        await connection.rollback();
        return res.status(403).json({ error: 'Only space admins or moderators can create announcements' });
      }
    }
    
    // Insert post
    const [result] = await connection.execute(
      'INSERT INTO community_posts (space_id, user_id, title, content, content_format, tags, is_announcement, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [space_id, userId, title, content, content_format, JSON.stringify(tags), is_announcement]
    );
    
    const postId = result.insertId;
    
    // If poll is included, create it
    if (poll) {
      await connection.execute(
        'INSERT INTO post_polls (post_id, question, options, closes_at, is_multiple_choice, is_anonymous) VALUES (?, ?, ?, ?, ?, ?)',
        [
          postId, 
          poll.question, 
          JSON.stringify(poll.options), 
          poll.closes_at || null, 
          poll.is_multiple_choice || false, 
          poll.is_anonymous || false
        ]
      );
    }
    
    // Update analytics
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Check if analytics entry exists for today
    const [analytics] = await connection.execute(
      'SELECT id FROM space_analytics WHERE space_id = ? AND date = ?',
      [space_id, currentDate]
    );
    
    if (analytics.length > 0) {
      await connection.execute(
        'UPDATE space_analytics SET new_posts = new_posts + 1 WHERE id = ?',
        [analytics[0].id]
      );
    } else {
      await connection.execute(
        'INSERT INTO space_analytics (space_id, date, new_posts) VALUES (?, ?, 1)',
        [space_id, currentDate]
      );
    }
    
    // Update post count in the space
    await connection.execute(
      'UPDATE community_spaces SET posts = posts + 1 WHERE space_id = ?',
      [space_id]
    );
    
    await connection.commit();
    
    // Log activity
    try {
      await pool.execute(
        `INSERT INTO activity_logs (user_id, action_type, target_type, target_id, timestamp)
         VALUES (?, ?, ?, ?, NOW())`,
        [userId, 'create_post', 'post', postId]
      );
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }
    
    res.status(201).json({ 
      message: 'Post created successfully',
      postId,
      title
    });
  } catch (error) {
    await connection.rollback();
    console.error('Post creation error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Update a post
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      content, 
      content_format, 
      tags,
      is_pinned 
    } = req.body;
    
    const userId = req.user.userId;
    
    // Check if user is the author or admin/moderator
    const [posts] = await pool.execute(
      'SELECT user_id, space_id FROM community_posts WHERE id = ?',
      [id]
    );
    
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = posts[0];
    
    if (post.user_id !== userId) {
      // Check if user is admin/moderator of the space
      const [admins] = await pool.execute(
        'SELECT id FROM space_members WHERE space_id = ? AND user_id = ? AND role IN (?, ?)',
        [post.space_id, userId, 'admin', 'moderator']
      );
      
      if (admins.length === 0) {
        return res.status(403).json({ error: 'Only the author, space admins, or moderators can update this post' });
      }
    }
    
    // Build update query based on provided fields
    let updateQuery = 'UPDATE community_posts SET updated_at = NOW()';
    const updateParams = [];
    
    if (title !== undefined) {
      updateQuery += ', title = ?';
      updateParams.push(title);
    }
    
    if (content !== undefined) {
      updateQuery += ', content = ?';
      updateParams.push(content);
    }
    
    if (content_format !== undefined) {
      updateQuery += ', content_format = ?';
      updateParams.push(content_format);
    }
    
    if (tags !== undefined) {
      updateQuery += ', tags = ?';
      updateParams.push(JSON.stringify(tags));
    }
    
    if (is_pinned !== undefined) {
      updateQuery += ', is_pinned = ?';
      updateParams.push(is_pinned);
    }
    
    updateQuery += ' WHERE id = ?';
    updateParams.push(id);
    
    // Update the post
    await pool.execute(updateQuery, updateParams);
    
    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Check if user is the author or admin/moderator
    const [posts] = await pool.execute(
      'SELECT user_id, space_id FROM community_posts WHERE id = ?',
      [id]
    );
    
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = posts[0];
    
    if (post.user_id !== userId) {
      // Check if user is admin/moderator of the space
      const [admins] = await pool.execute(
        'SELECT id FROM space_members WHERE space_id = ? AND user_id = ? AND role IN (?, ?)',
        [post.space_id, userId, 'admin', 'moderator']
      );
      
      if (admins.length === 0) {
        return res.status(403).json({ error: 'Only the author, space admins, or moderators can delete this post' });
      }
    }
    
    // Log moderation action if not the author
    if (post.user_id !== userId) {
      await pool.execute(
        'INSERT INTO moderation_logs (moderator_id, action_type, target_type, target_id, action_reason) VALUES (?, ?, ?, ?, ?)',
        [userId, 'post_remove', 'post', id, req.body.reason || 'No reason provided']
      );
    }
    
    // Delete the post (cascades to reactions, comments, etc.)
    await pool.execute('DELETE FROM community_posts WHERE id = ?', [id]);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// React to a post
router.post('/:id/react', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reaction_type } = req.body;
    const userId = req.user.userId;
    
    // Check if already reacted with this type
    const [reactions] = await pool.execute(
      'SELECT id FROM post_reactions WHERE post_id = ? AND user_id = ? AND reaction_type = ?',
      [id, userId, reaction_type]
    );
    
    if (reactions.length > 0) {
      // Remove reaction (toggle)
      await pool.execute(
        'DELETE FROM post_reactions WHERE post_id = ? AND user_id = ? AND reaction_type = ?',
        [id, userId, reaction_type]
      );
      res.json({ message: 'Reaction removed' });
    } else {
      // Add reaction
      await pool.execute(
        'INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES (?, ?, ?)',
        [id, userId, reaction_type]
      );
      res.status(201).json({ message: 'Reaction added' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bookmark a post
router.post('/:id/bookmark', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user.userId;
    
    // Check if already bookmarked
    const [bookmarks] = await pool.execute(
      'SELECT id FROM user_bookmarks WHERE post_id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (bookmarks.length > 0) {
      // If notes provided, update them
      if (notes !== undefined) {
        await pool.execute(
          'UPDATE user_bookmarks SET notes = ? WHERE id = ?',
          [notes, bookmarks[0].id]
        );
        res.json({ message: 'Bookmark updated' });
      } else {
        // Remove bookmark (toggle)
        await pool.execute(
          'DELETE FROM user_bookmarks WHERE id = ?',
          [bookmarks[0].id]
        );
        res.json({ message: 'Bookmark removed' });
      }
    } else {
      // Add bookmark
      await pool.execute(
        'INSERT INTO user_bookmarks (post_id, user_id, notes) VALUES (?, ?, ?)',
        [id, userId, notes || null]
      );
      res.status(201).json({ message: 'Bookmark added' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vote on a poll
router.post('/:id/poll/vote', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { option_index } = req.body;
    const userId = req.user.userId;
    
    // Get poll ID from post ID
    const [polls] = await pool.execute(
      'SELECT id, is_multiple_choice FROM post_polls WHERE post_id = ?',
      [id]
    );
    
    if (polls.length === 0) {
      return res.status(404).json({ error: 'Poll not found for this post' });
    }
    
    const poll = polls[0];
    
    // If not multiple choice, remove previous votes
    if (!poll.is_multiple_choice) {
      await pool.execute(
        'DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ?',
        [poll.id, userId]
      );
    }
    
    // Check if already voted for this option
    const [votes] = await pool.execute(
      'SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ? AND option_index = ?',
      [poll.id, userId, option_index]
    );
    
    if (votes.length > 0) {
      // Remove vote (toggle)
      await pool.execute(
        'DELETE FROM poll_votes WHERE id = ?',
        [votes[0].id]
      );
      res.json({ message: 'Vote removed' });
    } else {
      // Add vote
      await pool.execute(
        'INSERT INTO poll_votes (poll_id, user_id, option_index) VALUES (?, ?, ?)',
        [poll.id, userId, option_index]
      );
      res.status(201).json({ message: 'Vote recorded' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;