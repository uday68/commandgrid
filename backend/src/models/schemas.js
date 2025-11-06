const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

// Function to initialize all required database schemas
async function initializeSchemas() {
  try {
    console.log('Initializing database schemas...');
    
    // Core schema
    const coreSchema = fs.readFileSync(
      path.join(__dirname, 'db.sql'), 
      'utf8'
    );
    await pool.query(coreSchema);
    
    // Roles and permissions schema
    const rolesSchema = fs.readFileSync(
      path.join(__dirname, 'roles_permissions_schema.sql'), 
      'utf8'
    );
    await pool.query(rolesSchema);
    
    console.log('Database schemas initialized successfully ✅');
  } catch (error) {
    console.error('Error initializing database schemas:', error);
  }
}

module.exports = { initializeSchemas };
