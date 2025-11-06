const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { authenticateToken } = require('../../middleware/auth');
const dbConfig = require('../../Config/db');

const pool = mysql.createPool(dbConfig);

// Get all community spaces (with optional filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { parent_id, search } = req.query;
    let query = 'SELECT * FROM community_spaces WHERE 1=1';
    const queryParams = [];

    if (parent_id) {
      query += ' AND parent_space_id = ?';
      queryParams.push(parent_id);
    } else if (parent_id === 'null') {
      query += ' AND parent_space_id IS NULL';
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC';
    
    const [spaces] = await pool.execute(query, queryParams);
    res.json({ spaces });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get space by ID with details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get space details
    const [spaces] = await pool.execute(
      'SELECT * FROM community_spaces WHERE id = ?',
      [id]
    );
    
    if (spaces.length === 0) {
      return res.status(404).json({ error: 'Space not found' });
    }
    
    const space = spaces[0];
    
    // Get child spaces
    const [childSpaces] = await pool.execute(
      'SELECT id, name, icon_url, member_count FROM community_spaces WHERE parent_space_id = ?',
      [id]
    );
    
    // Get space member count
    const [memberCountResult] = await pool.execute(
      'SELECT COUNT(*) as member_count FROM space_members WHERE space_id = ?',
      [id]
    );
    
    // Get recent posts
    const [recentPosts] = await pool.execute(
      'SELECT p.*, u.username, u.avatar_url FROM community_posts p JOIN users u ON p.user_id = u.id WHERE p.space_id = ? ORDER BY p.created_at DESC LIMIT 5',
      [id]
    );
    
    // Add all these details to the space object
    space.child_spaces = childSpaces;
    space.member_count = memberCountResult[0].member_count;
    space.recent_posts = recentPosts;
    
    res.json({ space });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new community space
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, parent_space_id, icon_url, is_public, access_rules } = req.body;
    const userId = req.user.userId;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required for community space' });
    }
    
    // Insert the new space into database
    const [result] = await pool.execute(
      `INSERT INTO community_spaces (
        name, 
        description, 
        parent_space_id, 
        icon_url, 
        is_public, 
        access_rules, 
        created_by, 
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        name, 
        description || '', 
        parent_space_id || null, 
        icon_url || null, 
        is_public || true, 
        JSON.stringify(access_rules || {}), 
        userId
      ]
    );
    
    const spaceId = result.insertId;
    
    // Add creator as admin member
    await pool.execute(
      'INSERT INTO space_members (space_id, user_id, role, joined_at) VALUES (?, ?, ?, NOW())',
      [spaceId, userId, 'admin']
    );
    
    res.status(201).json({ 
      message: 'Community space created successfully', 
      spaceId,
      name,
      description
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a community space
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parent_space_id, icon_url, is_public, access_rules } = req.body;
    const userId = req.user.userId;
    
    // Check if user is admin of this space
    const [members] = await pool.execute(
      'SELECT role FROM space_members WHERE space_id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (members.length === 0 || members[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only space admins can update space details' });
    }
    
    // Update the space
    await pool.execute(
      'UPDATE community_spaces SET name = ?, description = ?, parent_space_id = ?, icon_url = ?, is_public = ?, access_rules = ?, updated_at = NOW() WHERE id = ?',
      [name, description, parent_space_id || null, icon_url, is_public, JSON.stringify(access_rules || {}), id]
    );
    
    res.json({ message: 'Community space updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a community space
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Check if user is admin of this space
    const [members] = await pool.execute(
      'SELECT role FROM space_members WHERE space_id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (members.length === 0 || members[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only space admins can delete spaces' });
    }
    
    // Check if this space has child spaces
    const [childSpaces] = await pool.execute(
      'SELECT id FROM community_spaces WHERE parent_space_id = ?',
      [id]
    );
    
    if (childSpaces.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete space with child spaces. Please delete or move child spaces first.' 
      });
    }
    
    // Delete the space (cascade will handle related entries)
    await pool.execute('DELETE FROM community_spaces WHERE id = ?', [id]);
    
    res.json({ message: 'Community space deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join a community space
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Check if already a member
    const [existingMembers] = await pool.execute(
      'SELECT id FROM space_members WHERE space_id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (existingMembers.length > 0) {
      return res.status(400).json({ error: 'Already a member of this space' });
    }
    
    // Add as member
    await pool.execute(
      'INSERT INTO space_members (space_id, user_id, role) VALUES (?, ?, ?)',
      [id, userId, 'member']
    );
    
    // Update member count
    await pool.execute(
      'UPDATE community_spaces SET member_count = member_count + 1 WHERE id = ?',
      [id]
    );
    
    res.status(201).json({ message: 'Joined community space successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave a community space
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Check if a member
    const [members] = await pool.execute(
      'SELECT id, role FROM space_members WHERE space_id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (members.length === 0) {
      return res.status(400).json({ error: 'Not a member of this space' });
    }
    
    // Check if last admin
    if (members[0].role === 'admin') {
      const [adminCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM space_members WHERE space_id = ? AND role = ?',
        [id, 'admin']
      );
      
      if (adminCount[0].count <= 1) {
        return res.status(400).json({ 
          error: 'Cannot leave as you are the last admin. Transfer admin role first or delete the space.' 
        });
      }
    }
    
    // Remove membership
    await pool.execute(
      'DELETE FROM space_members WHERE space_id = ? AND user_id = ?',
      [id, userId]
    );
    
    // Update member count
    await pool.execute(
      'UPDATE community_spaces SET member_count = member_count - 1 WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Left community space successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get space analytics
router.get('/:id/analytics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '7days' } = req.query;
    const userId = req.user.userId;
    
    // Check if user is a member
    const [members] = await pool.execute(
      'SELECT role FROM space_members WHERE space_id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (members.length === 0) {
      return res.status(403).json({ error: 'Only members can view space analytics' });
    }
    
    // Define date range based on period
    let dateFilter;
    switch (period) {
      case '7days':
        dateFilter = 'AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)';
        break;
      case '30days':
        dateFilter = 'AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)';
        break;
      case 'all':
        dateFilter = '';
        break;
      default:
        dateFilter = 'AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)';
    }
    
    // Get analytics
    const [analytics] = await pool.execute(
      `SELECT date, active_users, new_posts, new_comments, views, new_members 
       FROM space_analytics 
       WHERE space_id = ? ${dateFilter}
       ORDER BY date ASC`,
      [id]
    );
    
    // Get totals
    const [totals] = await pool.execute(
      `SELECT 
        SUM(active_users) as total_active_users,
        SUM(new_posts) as total_posts,
        SUM(new_comments) as total_comments,
        SUM(views) as total_views,
        SUM(new_members) as total_new_members
       FROM space_analytics 
       WHERE space_id = ? ${dateFilter}`,
      [id]
    );
    
    res.json({ 
      analytics,
      totals: totals[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;