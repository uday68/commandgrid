import { pool } from '../Config/database.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Create a new project and add members with proper transaction handling
 * This function demonstrates the correct way to create a project and add members
 * @param {Object} params - Project parameters
 * @returns {Promise<Object>} Created project and members
 */
export const fixedCreateProject = async ({ name, creatorId, description = null, teamId = null, members = [] }) => {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    logger.info('Creating project with name:', name);
    
    // Step 1: Create the project first
    const projectResult = await client.query(
      `INSERT INTO projects (name, description, team_id, created_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [name, description, teamId, creatorId]
    );
    
    const project = projectResult.rows[0];
    
    // Validate project creation
    if (!project || !project.project_id) {
      throw new Error('Failed to create project: No project ID returned');
    }
    
    logger.info(`Created project with ID: ${project.project_id}`);
    
    // Step 2: Add creator as project admin
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role, joined_at)
       VALUES ($1, $2, 'admin', NOW())`,
      [project.project_id, creatorId]
    );
    
    logger.info(`Added creator (${creatorId}) as admin`);
    
    // Step 3: Add additional members if provided
    if (members && members.length > 0) {
      for (const member of members) {
        await client.query(
          `INSERT INTO project_members (project_id, user_id, role, joined_at)
           VALUES ($1, $2, $3, NOW())`,
          [project.project_id, member.userId, member.role || 'member']
        );
        
        logger.info(`Added member ${member.userId} with role ${member.role || 'member'}`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Query to get all project members for verification
    const membersResult = await client.query(
      `SELECT * FROM project_members WHERE project_id = $1`,
      [project.project_id]
    );
    
    return {
      project,
      members: membersResult.rows
    };
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    logger.error('Error creating project:', error);
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
};

/**
 * Test the fixed project creation function
 */
async function testFixedProjectCreation() {
  try {
    const projectData = {
      name: 'Test Fixed Project Creation',
      creatorId: process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000001',
      description: 'Project created with fixed function that handles transaction and member addition properly',
      members: [
        { userId: process.env.ADDITIONAL_MEMBER_1 || '00000000-0000-0000-0000-000000000002', role: 'member' },
        { userId: process.env.ADDITIONAL_MEMBER_2 || '00000000-0000-0000-0000-000000000003', role: 'viewer' }
      ]
    };
    
    logger.info('Testing fixed project creation with data:', projectData);
    
    const result = await fixedCreateProject(projectData);
    
    logger.info('Project created successfully:', result.project);
    logger.info(`Added ${result.members.length} members:`, result.members);
    
    return result;
  } catch (error) {
    logger.error('Test failed:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (process.argv[1].endsWith('fixProjectCreation.js')) {
  testFixedProjectCreation()
    .then(() => {
      logger.info('Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Test failed:', error);
      process.exit(1);
    });
}
