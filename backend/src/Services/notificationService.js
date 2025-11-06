/**
 * Scheduled notification service that manages sending regular notifications
 * based on reminders, upcoming events, tasks, and template-based notifications.
 */
import pkg from 'pg';
const { Pool } = pkg;
import cron from 'node-cron';
import { logger } from '../utils/logger.js';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class NotificationService {
  /**
   * Creates a notification record for a specific user
   */
  async createNotification(userId, message, channel = 'email', templateId = null, 
                          senderType = 'system', actionUrl = null) {
    try {
      const result = await pool.query(`
        INSERT INTO notifications (
          notification_id, 
          user_id, 
          message, 
          is_read, 
          created_at, 
          template_id,
          delivery_status,
          channel,
          sender_type,
          action_url
        ) VALUES (uuid_generate_v4(), $1, $2, FALSE, NOW(), $3, 'pending', $4, $5, $6)
        RETURNING notification_id, message, created_at
      `, [userId, message, templateId, channel, senderType, actionUrl]);
      
      logger.info(`Notification created for user ${userId}: ${message}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Creates an admin notification
   */
  async createAdminNotification(adminId, message) {
    try {
      const result = await pool.query(`
        INSERT INTO admin_notifications (
          notification_id,
          admin_id,
          message,
          is_read,
          created_at
        ) VALUES (uuid_generate_v4(), $1, $2, FALSE, NOW())
        RETURNING notification_id, message, created_at
      `, [adminId, message]);
      
      logger.info(`Admin notification created for ${adminId}: ${message}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Failed to create admin notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets a user's notification preferences or default values if not set
   */
  async getUserNotificationPreferences(userId) {
    try {
      const result = await pool.query(`
        SELECT * FROM user_notification_preferences 
        WHERE user_id = $1
      `, [userId]);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      // Return default preferences if none exist
      return {
        enable_email: true,
        enable_push: true,
        enable_sms: false,
        min_priority_level: 2
      };
    } catch (error) {
      logger.error(`Failed to get notification preferences: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process reminders and convert them to notifications
   */
  async processReminders() {
    try {
      // Find pending reminders that need to be sent
      const pendingReminders = await pool.query(`
        SELECT 
          r.reminder_id,
          r.entity_type,
          r.entity_id,
          r.message,
          r.method,
          u.user_id,
          u.email
        FROM reminders r
        JOIN users u ON 
          (r.entity_type = 'user' AND r.entity_id::text = u.user_id::text)
        WHERE 
          r.status = 'pending' AND
          r.trigger_at <= NOW() AND
          (r.retry_count < r.max_retries OR r.max_retries IS NULL)
      `);

      logger.info(`Processing ${pendingReminders.rows.length} pending reminders`);
      
      // Process each reminder
      for (const reminder of pendingReminders.rows) {
        try {
          // Get user preferences
          const userPrefs = await this.getUserNotificationPreferences(reminder.user_id);
          
          // Choose delivery channel based on user preferences and reminder method
          let channel = reminder.method;
          if (reminder.method === 'email' && !userPrefs.enable_email) {
            channel = userPrefs.enable_push ? 'push' : 'email';
          } else if (reminder.method === 'push' && !userPrefs.enable_push) {
            channel = userPrefs.enable_email ? 'email' : 'push';
          }
          
          // Create notification from reminder
          const notification = await this.createNotification(
            reminder.user_id,
            reminder.message || `Reminder: You have a pending action to complete`,
            channel
          );
          
          // Update reminder status
          await pool.query(`
            UPDATE reminders
            SET status = 'sent', last_attempt_at = NOW()
            WHERE reminder_id = $1
          `, [reminder.reminder_id]);
          
          // Log successful delivery
          await pool.query(`
            INSERT INTO reminder_logs (
              log_id, reminder_id, status, response, created_at
            ) VALUES (
              uuid_generate_v4(), $1, 'success', $2, NOW()
            )
          `, [reminder.reminder_id, `Notification ${notification.notification_id} created`]);
        } catch (error) {
          logger.error(`Error processing reminder ${reminder.reminder_id}: ${error.message}`);
          
          // Update retry counter
          await pool.query(`
            UPDATE reminders
            SET 
              retry_count = retry_count + 1,
              status = CASE 
                WHEN retry_count + 1 >= max_retries THEN 'failed'
                ELSE 'pending'
              END,
              last_attempt_at = NOW(),
              next_retry_at = NOW() + (INTERVAL '30 minutes' * (retry_count + 1))
            WHERE reminder_id = $1
          `, [reminder.reminder_id]);
          
          // Log failed delivery
          await pool.query(`
            INSERT INTO reminder_logs (
              log_id, reminder_id, status, response, created_at
            ) VALUES (
              uuid_generate_v4(), $1, 'failed', $2, NOW()
            )
          `, [reminder.reminder_id, error.message]);
        }
      }
    } catch (error) {
      logger.error(`Failed to process reminders: ${error.message}`);
    }
  }

  /**
   * Send notifications for upcoming calendar events
   */
  async processCalendarEvents() {
    try {
      // Find events happening soon (next 24 hours) that haven't had notifications sent
      const upcomingEvents = await pool.query(`
        SELECT 
          ce.event_id, 
          ce.title, 
          ce.event_date,
          ce.project_id,
          ce.created_by
        FROM calendar_events ce
        LEFT JOIN notifications n ON 
          n.action_url = '/calendar/' || ce.event_id::text AND
          n.created_at > NOW() - INTERVAL '24 hours'
        WHERE 
          ce.event_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours' AND
          n.notification_id IS NULL
      `);
      
      logger.info(`Processing ${upcomingEvents.rows.length} upcoming calendar events`);
      
      for (const event of upcomingEvents.rows) {
        try {
          // For project-related events, notify all project members
          if (event.project_id) {
            const projectMembers = await pool.query(`
              SELECT user_id FROM project_members 
              WHERE project_id = $1
            `, [event.project_id]);
            
            for (const member of projectMembers.rows) {
              const userPrefs = await this.getUserNotificationPreferences(member.user_id);
              
              // Skip if below priority threshold
              if (userPrefs.min_priority_level > 2) {
                continue;
              }
              
              // Create event notification
              const eventDate = new Date(event.event_date).toLocaleDateString();
              await this.createNotification(
                member.user_id,
                `Upcoming event: ${event.title} on ${eventDate}`,
                userPrefs.enable_push ? 'push' : 'email',
                null,
                'system',
                `/calendar/${event.event_id}`
              );
            }
          }
          
          // Always notify the event creator
          if (event.created_by) {
            const userPrefs = await this.getUserNotificationPreferences(event.created_by);
            const eventDate = new Date(event.event_date).toLocaleDateString();
            
            await this.createNotification(
              event.created_by,
              `Reminder: Your event "${event.title}" is happening on ${eventDate}`,
              userPrefs.enable_push ? 'push' : 'email',
              null,
              'system',
              `/calendar/${event.event_id}`
            );
          }
        } catch (error) {
          logger.error(`Error processing event ${event.event_id}: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to process calendar events: ${error.message}`);
    }
  }

  /**
   * Process template-based notifications
   */
  async processTemplateNotifications() {
    try {
      // Get recurring notification templates
      const templates = await pool.query(`
        SELECT * FROM notification_templates
        WHERE template_name LIKE 'recurring_%'
      `);
      
      logger.info(`Processing ${templates.rows.length} notification templates`);
      
      for (const template of templates.rows) {
        try {
          // For simplicity, we're sending to all active users
          const activeUsers = await pool.query(`
            SELECT user_id FROM users
            WHERE status = 'active'
            LIMIT 100  
          `);
          
          for (const user of activeUsers.rows) {
            const userPrefs = await this.getUserNotificationPreferences(user.user_id);
            
            // Create notification from template
            await this.createNotification(
              user.user_id,
              template.body,
              userPrefs.enable_push ? 'push' : 'email',
              template.template_id
            );
          }
        } catch (error) {
          logger.error(`Error processing template ${template.template_id}: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to process template notifications: ${error.message}`);
    }
  }

  /**
   * Send task due date reminders
   */
  async processTaskReminders() {
    try {
      // Find tasks due soon (next 48 hours) that haven't had notifications sent recently
      const upcomingTasks = await pool.query(`
        SELECT 
          t.task_id, 
          t.title, 
          t.due_date,
          t.assigned_to,
          t.project_id,
          p.name AS project_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.project_id
        LEFT JOIN notifications n ON 
          n.action_url = '/tasks/' || t.task_id::text AND
          n.created_at > NOW() - INTERVAL '24 hours'
        WHERE 
          t.status != 'Completed' AND
          t.due_date BETWEEN NOW() AND NOW() + INTERVAL '48 hours' AND
          n.notification_id IS NULL AND
          t.assigned_to IS NOT NULL
      `);
      
      logger.info(`Processing ${upcomingTasks.rows.length} upcoming task reminders`);
      
      for (const task of upcomingTasks.rows) {
        try {
          const userPrefs = await this.getUserNotificationPreferences(task.assigned_to);
          const dueDate = new Date(task.due_date).toLocaleDateString();
          
          await this.createNotification(
            task.assigned_to,
            `Task Reminder: "${task.title}" in project "${task.project_name}" is due on ${dueDate}`,
            userPrefs.enable_push ? 'push' : 'email',
            null,
            'system',
            `/tasks/${task.task_id}`
          );
        } catch (error) {
          logger.error(`Error processing task reminder ${task.task_id}: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to process task reminders: ${error.message}`);
    }
  }

  /**
   * Main function to send regular notifications
   */
  async sendRegularNotifications() {
    logger.info('Starting scheduled notification processing');
    
    try {
      // Process all types of notifications
      await this.processReminders();
      await this.processCalendarEvents();
      await this.processTaskReminders();
      await this.processTemplateNotifications();
      
      logger.info('Completed scheduled notification processing');
    } catch (error) {
      logger.error(`Error in scheduled notifications: ${error.message}`);
    }
  }

  /**
   * Manual trigger to send notifications immediately
   */
  async triggerNotificationsNow() {
    try {
      logger.info('Manually triggering notifications');
      await this.sendRegularNotifications();
      return { success: true, message: 'Notifications processed successfully' };
    } catch (error) {
      logger.error(`Failed to trigger notifications: ${error.message}`);
      return { success: false, message: `Error: ${error.message}` };
    }
  }
}

// Create notification service instance
const notificationService = new NotificationService();

// Schedule the notification job to run every hour
try {
  if (typeof cron !== 'undefined') {
    cron.schedule('0 * * * *', async () => {
      try {
        await notificationService.sendRegularNotifications();
      } catch (error) {
        logger.error(`Error in notification cron job: ${error.stack}`);
      }
    });
    logger.info('Notification service scheduled to run every hour');
  } else {
    logger.warn('node-cron not available, scheduled notifications disabled');
  }
} catch (error) {
  logger.error(`Failed to initialize notification scheduler: ${error.message}`);
}

// Export the service for use elsewhere in the application
export default notificationService;
export { pool };