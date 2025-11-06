import { createProject } from '../utils/projectManager.js';
import EmailService from '../utils/emailService.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create email service instance
const emailService = new EmailService();
const targetEmail = 'udaygamer68@gmail.com';

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

/**
 * Test project creation and attach a specific email template
 */
async function testProjectWithEmail(templateName) {
  try {
    // Skip if template doesn't exist
    if (!testData[templateName]) {
      logger.error(`Template "${templateName}" not found. Available templates: ${Object.keys(testData).join(', ')}`);
      return false;
    }    // First create a test project
    const projectData = {
      name: `Test Project - ${templateName} template test`,
      creatorId: process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000001', // Using a UUID format
      description: `This project was created to test the ${templateName} email template`
    };
    
    logger.info(`Creating test project for template: ${templateName}`);
    const project = await createProject(projectData);
    logger.info(`Project created with ID: ${project.project_id}`);
    
    // Now send email using the specified template
    const { subject, data } = testData[templateName];
    
    logger.info(`Sending ${templateName} template email to ${targetEmail}`);
    await emailService.sendEmail({
      to: targetEmail,
      template: templateName,
      data,
      subject: `${subject} - Project ID: ${project.project_id}`
    });
    
    logger.info(`Successfully sent ${templateName} template email`);
    return true;
  } catch (error) {
    logger.error(`Error in test for ${templateName}:`, error);
    return false;
  }
}

/**
 * Main test runner function
 */
async function runTests() {
  const templates = Object.keys(testData);
  logger.info(`Starting tests for ${templates.length} templates`);
  
  for (const template of templates) {
    logger.info(`=== Testing ${template} template ===`);
    const success = await testProjectWithEmail(template);
    
    if (success) {
      logger.info(`✓ Test for ${template} completed successfully`);
    } else {
      logger.error(`✗ Test for ${template} failed`);
    }
    
    // Wait 2 minutes between tests to avoid spam filters
    if (templates.indexOf(template) < templates.length - 1) {
      logger.info(`Waiting 2 minutes before next test...`);
      await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));
    }
  }
  
  logger.info('All tests completed');
}

// Run the tests
runTests()
  .then(() => {
    logger.info('Tests finished');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Error running tests:', error);
    process.exit(1);
  });
