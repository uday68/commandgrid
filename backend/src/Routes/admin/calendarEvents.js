// Calendar Events Router
import express from 'express';
import { pool } from '../../Config/database.js';
import { authenticateToken, isAdmin } from '../../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import ical from 'ical-generator';
import pkg from 'rrule';
const { RRule } = pkg;

const router = express.Router();

// Function to emit calendar updates via WebSocket
const emitCalendarUpdate = (io, projectId) => {
  if (io) {
    io.to(`project:${projectId}`).emit('calendar:update', { projectId });
  }
};

// Get events with filters
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { start, end, project_id, show_recurring } = req.query;
    const userId = req.userId;

    let sql = `
      SELECT 
        ce.*,
        array_agg(json_build_object(
          'user_id', ea.user_id,
          'status', ea.status
        )) as attendees
      FROM calendar_events ce
      LEFT JOIN event_attendees ea ON ce.event_id = ea.event_id
      WHERE (
        ce.event_date BETWEEN $1 AND $2
        OR ce.end_date BETWEEN $1 AND $2
        OR (ce.event_date <= $1 AND ce.end_date >= $2)
      )
    `;

    const params = [start, end];

    if (project_id) {
      sql += ` AND ce.project_id = $${params.length + 1}`;
      params.push(project_id);
    }

    if (show_recurring === 'false') {
      sql += ` AND ce.recurrence_rule IS NULL`;
    }

    sql += `
      GROUP BY ce.event_id
      ORDER BY ce.event_date
    `;    const { rows } = await pool.query(sql, params);
    
    // Expand recurring events
    const events = rows.flatMap(event => {
      if (!event.recurrence_rule) return [event];
        try {
        const rule = RRule.fromString(event.recurrence_rule);
        const dates = rule.between(new Date(start), new Date(end));
        
        return dates.map(date => ({
          ...event,
          event_id: `${event.event_id}-${date.getTime()}`,
          event_date: date,
          end_date: new Date(date.getTime() + (new Date(event.end_date) - new Date(event.event_date))),
          is_recurring_instance: true,
          parent_event_id: event.event_id
        }));
      } catch (err) {
        console.error('Error parsing recurrence rule', err);
        return [event];
      }
    });

    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create new event
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      event_date,
      end_date,
      all_day,
      project_id,
      event_color,
      location,
      recurrence_rule,
      attendees,
      reminders
    } = req.body;

    const eventId = uuidv4();    const userId = req.userId;

    await pool.query('BEGIN');

    // Insert main event
    const eventSql = `
      INSERT INTO calendar_events (
        event_id, title, description, event_date, end_date, all_day,
        project_id, created_by, event_color, location, recurrence_rule
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const eventParams = [
      eventId, title, description, event_date, end_date, all_day,
      project_id, userId, event_color, location, recurrence_rule    ];
    const { rows: [event] } = await pool.query(eventSql, eventParams);

    // Add attendees
    if (attendees && attendees.length) {
      const attendeeSql = `        INSERT INTO event_attendees (event_id, user_id)
        VALUES ${attendees.map((_, i) => `($1, $${i + 2})`).join(',')}
      `;
      await pool.query(attendeeSql, [eventId, ...attendees]);
    }

    // Add reminders
    if (reminders && reminders.length) {
      const reminderSql = `        INSERT INTO event_reminders (event_id, minutes_before)
        VALUES ${reminders.map((_, i) => `($1, $${i + 2})`).join(',')}
      `;
      await pool.query(reminderSql, [eventId, ...reminders]);
    }    await pool.query('COMMIT');
    
    // Send real-time update
    emitCalendarUpdate(req.io, project_id);    res.status(201).json(event);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Export calendar to iCal
router.get('/export', authenticateToken, isAdmin, async (req, res) => {
  try {    const { project_id } = req.query;
    const userId = req.user.id;

    const { rows: events } = await pool.query(`
      SELECT * FROM calendar_events
      WHERE project_id = $1 OR created_by = $2
    `, [project_id, userId]);

    const calendar = ical({
      name: 'Project Calendar',
      timezone: 'UTC'
    });

    events.forEach(event => {
      calendar.createEvent({
        id: event.event_id,
        start: event.event_date,
        end: event.end_date,
        summary: event.title,
        description: event.description,
        location: event.location,
        url: `${process.env.FRONTEND_URL}/calendar/event/${event.event_id}`,
        organizer: {
          name: event.created_by_name,
          email: event.created_by_email
        }
      });
    });

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
    res.send(calendar.toString());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export calendar' });
  }
});

export default router;