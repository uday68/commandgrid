import dotenv from 'dotenv';
import runInitialMigration from './001-initial-schema.js';
import runNotificationMigration from './002-notification-system-sql.js';
import runAITablesMigration from './003-ai-tables-sql.js';
import runSettingsMigration from './004-settings-tables-sql.js';

dotenv.config();

async function runMigrations() {
  try {
    console.log('Starting migrations...');
    
    console.log('\nRunning initial schema migration...');
    await runInitialMigration();
    
    console.log('\nRunning notification system migration...');
    await runNotificationMigration();
    
    console.log('\nRunning AI tables migration...');
    await runAITablesMigration();
    
    console.log('\nRunning settings tables migration...');
    await runSettingsMigration();
    
    console.log('\nAll migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations(); 