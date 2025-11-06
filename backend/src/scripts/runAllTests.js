import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Convert exec to promise-based
const execAsync = promisify(exec);

// Email templates to test
const emailTemplates = [
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
 * Run a script and return the result
 */
async function runScript(scriptPath, args = []) {
  const command = `node ${scriptPath} ${args.join(' ')}`;
  logger.info(`Running command: ${command}`);
  
  try {
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      logger.warn(`Script stderr: ${stderr}`);
    }
    
    logger.info(`Script stdout: ${stdout}`);
    return true;
  } catch (error) {
    logger.error(`Error running script ${scriptPath}:`, error);
    return false;
  }
}

/**
 * Run all tests in sequence
 */
async function runAllTests() {
  logger.info('Starting all tests');
  
  // First, test project creation
  logger.info('Testing project creation...');
  const projectCreationSuccess = await runScript('./src/scripts/testProjectCreation.js');
  
  if (!projectCreationSuccess) {
    logger.error('Project creation test failed. Aborting remaining tests.');
    return false;
  }
  
  logger.info('Project creation test successful.');
  
  // Next, test email templates one by one with delay
  for (const template of emailTemplates) {
    logger.info(`Testing ${template} email template...`);
    await runScript('./src/scripts/sendTestEmail.js', [template]);
    
    // Wait for 2 minutes between email tests to avoid triggering spam filters
    logger.info(`Waiting 2 minutes before sending next email...`);
    await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));
  }
  
  logger.info('All tests completed successfully');
  return true;
}

// Run all tests
runAllTests()
  .then(success => {
    if (success) {
      logger.info('All tests completed successfully');
    } else {
      logger.error('Some tests failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    logger.error('Error running tests:', error);
    process.exit(1);
  });
