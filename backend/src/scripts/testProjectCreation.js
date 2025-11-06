import { createProject, getProjectDetails } from '../utils/projectManager.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test the project creation functionality
 */
async function testProjectCreation() {
  try {
    logger.info('Starting project creation test');
      // Test data
    const projectData = {
      name: 'Test Project ' + new Date().toISOString(),
      creatorId: process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000001', // Using a UUID format
      description: 'This is a test project created to verify project creation functionality'
    };
    
    // Create project
    logger.info('Creating project with data:', projectData);
    const project = await createProject(projectData);
    
    logger.info('Project created successfully:', project);
    
    // Verify project creation by retrieving the project details
    if (project && project.project_id) {
      logger.info(`Retrieving project details for project_id: ${project.project_id}`);
      const projectDetails = await getProjectDetails(project.project_id);
      logger.info('Project details retrieved successfully:', projectDetails);
    } else {
      throw new Error('Project created but no project_id was returned');
    }
    
    logger.info('Project creation test completed successfully');
    return project;
  } catch (error) {
    logger.error('Error testing project creation:', error);
    throw error;
  }
}

// Execute test
testProjectCreation()
  .then(project => {
    logger.info(`Test completed successfully. Created project: ${JSON.stringify(project)}`);
    process.exit(0);
  })
  .catch(error => {
    logger.error('Test failed:', error);
    process.exit(1);
  });
