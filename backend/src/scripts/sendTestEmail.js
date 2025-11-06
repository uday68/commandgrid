import EmailService from '../utils/emailService.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create email service instance
const emailService = new EmailService();
const targetEmail = 'udaygamer68@gmail.com';

/**
 * Send a single test email template
 * @param {string} templateName - Name of the template to test
 */
async function sendSingleTemplateEmail(templateName) {
  // Template test data mapping
  const testData = {
    alert: {
      subject: 'Alert: System Notification',
      data: {
        title: 'System Alert',
        message: 'This is a test alert message',
        severity: 'medium',
        actionUrl: 'https://example.com/alerts',
        actionText: 'View Alert Details'
      }
    },
    congratulation: {
      subject: 'Congratulations on Your Achievement!',
      data: {
        title: 'Project Milestone Completed',
        recipientName: 'Team Member',
        achievementName: 'Project Alpha Launch',
        message: 'Your team has successfully completed the project milestone.',
        actionUrl: 'https://example.com/projects/alpha',
        actionText: 'View Project Details'
      }
    },
    warning: {
      subject: 'Warning: Action Required',
      data: {
        title: 'Approaching Deadline',
        message: 'A project deadline is approaching and requires your attention',
        severity: 'high',
        actionUrl: 'https://example.com/projects/tasks',
        actionText: 'Review Tasks'
      }
    },
    notification: {
      subject: 'New Notification',
      data: {
        title: 'New Comment on Your Task',
        message: 'Someone has commented on a task assigned to you',
        actionUrl: 'https://example.com/tasks/123',
        actionText: 'View Comment'
      }
    },
    invitation: {
      subject: 'Invitation to Join Project Team',
      data: {
        title: 'You\'ve Been Invited',
        inviterName: 'Project Manager',
        inviterRole: 'Project Admin',
        message: 'You have been invited to join the Project X team',
        invitationType: 'project',
        actionUrl: 'https://example.com/invitations/accept',
        actionText: 'Accept Invitation'
      }
    },
    taskAssignment: {
      subject: 'New Task Assignment',
      data: {
        title: 'New Task Assigned to You',
        taskName: 'Implement User Authentication',
        projectName: 'Project Management Tool',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        assignerName: 'Project Manager',
        priority: 'high',
        actionUrl: 'https://example.com/tasks/456',
        actionText: 'View Task Details'
      }
    },
    projectUpdate: {
      subject: 'Project Status Update',
      data: {
        title: 'Weekly Project Update',
        projectName: 'Project Management Tool',
        updateMessage: 'The project is progressing according to schedule with all milestones on track.',
        completedTasks: 12,
        pendingTasks: 8,
        nextMilestone: 'Beta Release',
        actionUrl: 'https://example.com/projects/pmt/dashboard',
        actionText: 'View Project Dashboard'
      }
    },
    deadlineReminder: {
      subject: 'Upcoming Deadline Reminder',
      data: {
        title: 'Task Deadline Reminder',
        taskName: 'Complete API Documentation',
        projectName: 'Project Management Tool',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        daysRemaining: 2,
        actionUrl: 'https://example.com/tasks/789',
        actionText: 'View Task'
      }
    },
    report: {
      subject: 'Monthly Project Report',
      data: {
        title: 'June 2025 Project Report',
        reportType: 'monthly',
        projectName: 'Project Management Tool',
        period: 'June 2025',
        summary: 'Project is on schedule with 85% tasks completed. Budget utilization is at 70%.',
        keyMetrics: {
          tasksCompleted: '85%',
          budgetUtilized: '70%',
          teamVelocity: '92%',
          issuesResolved: '28'
        },
        actionUrl: 'https://example.com/reports/june2025',
        actionText: 'View Full Report'
      }
    },
    systemAlert: {
      subject: 'System Maintenance Notice',
      data: {
        title: 'Scheduled System Maintenance',
        message: 'Our system will undergo scheduled maintenance on June 20, 2025 from 2:00 AM to 4:00 AM UTC.',
        severity: 'info',
        maintenanceTime: 'June 20, 2025, 2:00-4:00 AM UTC',
        actionUrl: 'https://example.com/system/status',
        actionText: 'System Status Page'
      }
    }
  };

  // Check if template exists
  if (!testData[templateName]) {
    logger.error(`Template "${templateName}" not found. Available templates: ${Object.keys(testData).join(', ')}`);
    process.exit(1);
  }

  const { subject, data } = testData[templateName];
  
  try {
    logger.info(`Sending ${templateName} template email to ${targetEmail}`);
    
    await emailService.sendEmail({
      to: targetEmail,
      template: templateName,
      data,
      subject
    });
    
    logger.info(`Successfully sent ${templateName} template email`);
  } catch (error) {
    logger.error(`Failed to send ${templateName} template email:`, error);
    process.exit(1);
  }
}

// Get template name from command line argument
const templateName = process.argv[2];

if (!templateName) {
  logger.error('Please provide a template name as a command line argument');
  logger.info('Available templates: alert, congratulation, warning, notification, invitation, taskAssignment, projectUpdate, deadlineReminder, report, systemAlert');
  process.exit(1);
}

// Execute the function
sendSingleTemplateEmail(templateName).catch(error => {
  logger.error('Error in test email script:', error);
  process.exit(1);
});
