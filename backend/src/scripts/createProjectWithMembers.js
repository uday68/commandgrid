import { pool } from '../Config/database.js';
import { createProject } from '../utils/projectManager.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Fix for the project creation issue
 * This script demonstrates how to properly create a project and add members
 * The main issue was that we need to first create the project, get its ID, and then add members
 */
async function createProjectWithMembers() {
  try {
    logger.info('Starting project creation with members test');
    
    // Step 1: Create a project first
    const projectData = {
      name: 'Test Project Creation Fix',
      creatorId: process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000001', // Using a UUID format
      description: 'This is a test project to fix the project_id null issue'
    };
    
    logger.info('Creating project with data:', projectData);
    const project = await createProject(projectData);
    
    if (!project || !project.project_id) {
      throw new Error('Failed to create project: No project ID returned');
    }
    
    logger.info(`Project created successfully with ID: ${project.project_id}`);
    
    // Step 2: Now add additional members to the project
    // Note: The creator should already be added as a member by the createProject function
    const additionalMembers = [
      { userId: process.env.ADDITIONAL_MEMBER_1 || '00000000-0000-0000-0000-000000000002', role: 'member' },
      { userId: process.env.ADDITIONAL_MEMBER_2 || '00000000-0000-0000-0000-000000000003', role: 'viewer' }
    ];
    
    logger.info(`Adding ${additionalMembers.length} additional members to project`);
    
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Add each member to the project_members table
      for (const member of additionalMembers) {
        await client.query(
          `INSERT INTO project_members (project_id, user_id, role, joined_at)
           VALUES ($1, $2, $3, NOW())`,
          [project.project_id, member.userId, member.role]
        );
        
        logger.info(`Added member ${member.userId} with role ${member.role}`);
      }
      
      await client.query('COMMIT');
      logger.info('All members added successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error adding members to project:', error);
      throw error;
    } finally {
      client.release();
    }
    
    // Verify project members
    const membersResult = await pool.query(
      `SELECT * FROM project_members WHERE project_id = $1`,
      [project.project_id]
    );
    
    logger.info(`Project now has ${membersResult.rows.length} members:`);
    for (const member of membersResult.rows) {
      logger.info(`- User ID: ${member.user_id}, Role: ${member.role}`);
    }
    
    return {
      project,
      membersCount: membersResult.rows.length
    };
    
  } catch (error) {
    logger.error('Project creation with members test failed:', error);
    throw error;
  }
}

// Execute the function
createProjectWithMembers()
  .then(result => {
    logger.info('Test completed successfully:', result);
    process.exit(0);
  })
  .catch(error => {
    logger.error('Test failed:', error);
    process.exit(1);
  });
