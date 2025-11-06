import express from 'express';
import { pool } from '../../Config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
const router = express.Router();

// Get notification stats for a given timeframe
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { timeframe } = req.query;
    const userId = req.user.id;

    let dateFilter;
    switch (timeframe) {
      case '24h':
        dateFilter = 'NOW() - INTERVAL 24 HOUR';
        break;
      case '7d':
        dateFilter = 'NOW() - INTERVAL 7 DAY';
        break;
      case '30d':
        dateFilter = 'NOW() - INTERVAL 30 DAY';
        break;
      case '90d':
        dateFilter = 'NOW() - INTERVAL 90 DAY';
        break;
      default:
        dateFilter = 'NOW() - INTERVAL 7 DAY';
    }

    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND created_at >= ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const [rows] = await pool.query(query, [userId]);
    res.json({ volumeOverTime: rows });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get engagement metrics
router.get('/engagement', authenticateToken, async (req, res) => {
  try {
    const { timeframe } = req.query;
    const userId = req.user.id;

    let dateFilter;
    switch (timeframe) {
      case '24h':
        dateFilter = 'NOW() - INTERVAL 24 HOUR';
        break;
      case '7d':
        dateFilter = 'NOW() - INTERVAL 7 DAY';
        break;
      case '30d':
        dateFilter = 'NOW() - INTERVAL 30 DAY';
        break;
      case '90d':
        dateFilter = 'NOW() - INTERVAL 90 DAY';
        break;
      default:
        dateFilter = 'NOW() - INTERVAL 7 DAY';
    }

    const query = `
      SELECT 
        'Views' as metric,
        COUNT(CASE WHEN viewed_at IS NOT NULL THEN 1 END) as value
      FROM notifications
      WHERE user_id = ? AND created_at >= ${dateFilter}
      UNION ALL
      SELECT 
        'Clicks' as metric,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as value
      FROM notifications
      WHERE user_id = ? AND created_at >= ${dateFilter}
      UNION ALL
      SELECT 
        'Actions' as metric,
        COUNT(CASE WHEN action_taken IS NOT NULL THEN 1 END) as value
      FROM notifications
      WHERE user_id = ? AND created_at >= ${dateFilter}
    `;

    const [rows] = await pool.query(query, [userId, userId, userId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification type statistics
router.get('/type-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT 
        type as name,
        COUNT(*) as value
      FROM notifications
      WHERE user_id = ?
      GROUP BY type
    `;

    const [rows] = await pool.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notification type stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user engagement stats
router.get('/user/:userId/engagement', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const query = `
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN viewed_at IS NOT NULL THEN 1 END) as viewed,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked,
        COUNT(CASE WHEN action_taken IS NOT NULL THEN 1 END) as actions_taken,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, viewed_at)) as avg_view_time,
        AVG(TIMESTAMPDIFF(MINUTE, viewed_at, clicked_at)) as avg_click_time
      FROM notifications
      WHERE user_id = ?
    `;

    const [rows] = await pool.query(query, [userId]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user engagement stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification delivery stats
router.get('/delivery-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT 
        delivery_status as status,
        COUNT(*) as count
      FROM notifications
      WHERE user_id = ?
      GROUP BY delivery_status
    `;

    const [rows] = await pool.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching delivery stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification response time
router.get('/response-time', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT 
        type,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, viewed_at)) as time
      FROM notifications
      WHERE user_id = ? AND viewed_at IS NOT NULL
      GROUP BY type
    `;

    const [rows] = await pool.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching response time:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track notification view
router.post('/:id/view', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = `
      UPDATE notifications
      SET viewed_at = NOW()
      WHERE id = ? AND user_id = ?
    `;

    await pool.query(query, [id, userId]);
    res.json({ message: 'View tracked successfully' });
  } catch (error) {
    console.error('Error tracking notification view:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track notification click
router.post('/:id/click', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = `
      UPDATE notifications
      SET clicked_at = NOW()
      WHERE id = ? AND user_id = ?
    `;

    await pool.query(query, [id, userId]);
    res.json({ message: 'Click tracked successfully' });
  } catch (error) {
    console.error('Error tracking notification click:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track notification action
router.post('/:id/action', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const userId = req.user.id;

    const query = `
      UPDATE notifications
      SET action_taken = ?, action_at = NOW()
      WHERE id = ? AND user_id = ?
    `;

    await pool.query(query, [action, id, userId]);
    res.json({ message: 'Action tracked successfully' });
  } catch (error) {
    console.error('Error tracking notification action:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 