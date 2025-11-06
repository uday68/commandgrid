import EmailService from '../utils/emailService.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create email service instance
const emailService = new EmailService();
const targetEmail = 'udaygamer68@gmail.com';

async function testEmailSending() {
  try {
    logger.info('Testing email sending');
    
    // Simple test data
    const emailData = {
      subject: 'Test Email from Project Management Tool',
      template: 'notification',
      data: {
        title: 'Email Test',
        message: 'This is a test email to verify the email service is working properly',
        actionUrl: 'https://example.com',
        actionText: 'View Details'
      }
    };
    
    // Send email
    logger.info('Sending test email to', targetEmail);
    const result = await emailService.sendEmail({
      to: targetEmail,
      template: emailData.template,
      data: emailData.data,
      subject: emailData.subject
    });
    
    logger.info('Email sent successfully:', result);
    return true;
  } catch (error) {
    logger.error('Error sending test email:', error);
    return false;
  }
}

// Run test
testEmailSending()
  .then(success => {
    logger.info(`Email test ${success ? 'completed successfully' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    logger.error('Unexpected error in email test:', error);
    process.exit(1);
  });
