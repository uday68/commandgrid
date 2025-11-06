import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert exec to Promise-based
const execPromise = promisify(exec);

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define email templates to test
const templates = [
  'alert',
  'congratulation',
  'warning',
  'notification',
  'invitation',
  'taskAssignment',
  'projectUpdate',
  'deadlineReminder',
  'report',
  'systemAlert'
];

/**
 * Send a template email using the sendSpecificTemplate.js script
 * @param {string} templateName - Name of the template
 * @returns {Promise<boolean>} Success status
 */
async function sendTemplate(templateName) {
  try {
    const scriptPath = path.join(__dirname, 'sendSpecificTemplate.js');
    const command = `node ${scriptPath} ${templateName}`;
    
    logger.info(`Executing command: ${command}`);
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      logger.error(`Error output for ${templateName}:`, stderr);
    }
    
    if (stdout) {
      logger.info(`Output for ${templateName}:`, stdout);
    }
    
    logger.info(`Completed sending ${templateName} template`);
    return true;
  } catch (error) {
    logger.error(`Failed to send ${templateName} template:`, error);
    return false;
  }
}

/**
 * Send all templates with time spacing between them
 */
async function sendAllTemplatesWithSpacing() {
  let successCount = 0;
  let failCount = 0;
  
  logger.info(`===== Starting Email Template Test =====`);
  logger.info(`Total templates to test: ${templates.length}`);
  
  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    logger.info(`===== Processing template ${i+1}/${templates.length}: ${template} =====`);
    
    const success = await sendTemplate(template);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Add time spacing before sending the next template (skip for the last one)
    if (i < templates.length - 1) {
      const waitMinutes = 2;
      logger.info(`Waiting ${waitMinutes} minutes before sending the next template...`);
      await new Promise(resolve => setTimeout(resolve, waitMinutes * 60 * 1000));
    }
  }
  
  logger.info(`===== Email Template Test Complete =====`);
  logger.info(`Total templates: ${templates.length}`);
  logger.info(`Successfully sent: ${successCount}`);
  logger.info(`Failed: ${failCount}`);
}

// Start sending templates with spacing
sendAllTemplatesWithSpacing()
  .then(() => {
    logger.info('All template tests completed');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Error in template testing:', error);
    process.exit(1);
  });
