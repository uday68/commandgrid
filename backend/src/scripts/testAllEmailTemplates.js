import EmailService from '../utils/emailService.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create email service instance
const emailService = new EmailService();
const targetEmail = 'udaygamer68@gmail.com';

// Define template test data mapping
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
      title: 'Task Assigned to You',
      taskName: 'Complete documentation',
      projectName: 'Project Management Tool',
      dueDate: '2025-06-25',
      priority: 'High',
      assignerName: 'Project Manager',
      actionUrl: 'https://example.com/tasks/456',
      actionText: 'View Task'
    }
  },
  projectUpdate: {
    subject: 'Project Status Update',
    data: {
      title: 'Project Status Changed',
      projectName: 'Project Management Tool',
      oldStatus: 'In Progress',
      newStatus: 'In Review',
      message: 'The project status has been updated from "In Progress" to "In Review"',
      updatedBy: 'Project Manager',
      actionUrl: 'https://example.com/projects/789',
      actionText: 'View Project'
    }
  },
  deadlineReminder: {
    subject: 'Upcoming Deadline Reminder',
    data: {
      title: 'Task Deadline Approaching',
      taskName: 'Finalize Testing',
      projectName: 'Project Management Tool',
      dueDate: '2025-06-18',
      daysRemaining: 3,
      priority: 'Critical',
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

/**
 * Send a single email template
 * @param {string} templateName - Name of the template to test
 * @returns {Promise<boolean>} Success status
 */
async function sendTemplateEmail(templateName) {
  // Check if template exists
  if (!testData[templateName]) {
    logger.error(`Template "${templateName}" not found. Available templates: ${Object.keys(testData).join(', ')}`);
    return false;
  }

  const { subject, data } = testData[templateName];
  
  try {
    logger.info(`Sending ${templateName} template email to ${targetEmail}`);
    
    await emailService.sendEmail({
      to: targetEmail,
      template: templateName,
      data,
      subject: `[Test] ${subject}`
    });
    
    logger.info(`Successfully sent ${templateName} template email`);
    return true;
  } catch (error) {
    logger.error(`Failed to send ${templateName} template email:`, error);
    return false;
  }
}

/**
 * Main function to send all template emails with time spacing
 */
async function sendAllTemplateEmails() {
  // Get all template names
  const templateNames = Object.keys(testData);
  let successCount = 0;
  let failCount = 0;
  
  logger.info(`Starting to send test emails for ${templateNames.length} templates`);
  logger.info(`Target email address: ${targetEmail}`);
  
  for (let i = 0; i < templateNames.length; i++) {
    const templateName = templateNames[i];
    
    // Send email
    const success = await sendTemplateEmail(templateName);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Wait between emails (2 minutes) unless this is the last email
    if (i < templateNames.length - 1) {
      const waitMinutes = 2;
      const waitMs = waitMinutes * 60 * 1000;
      logger.info(`Waiting ${waitMinutes} minutes before sending next email...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
  
  // Final summary
  logger.info('===== Email Test Summary =====');
  logger.info(`Total templates tested: ${templateNames.length}`);
  logger.info(`Successfully sent: ${successCount}`);
  logger.info(`Failed to send: ${failCount}`);
}

// Execute the main function
sendAllTemplateEmails()
  .then(() => {
    logger.info('Email testing completed');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Unexpected error in email testing:', error);
    process.exit(1);
  });
