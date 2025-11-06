import createInitialSchema from '../migrations/001_initial_schema.js';
import createChatMessagesTable from '../migrations/create_chat_messages_table.js';

/**
 * Run all database migrations
 */
async function runMigrations() {
  console.log('Running database migrations...');
  
  try {
    // Run migrations in order
    await createInitialSchema();
    await createChatMessagesTable();
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

export default runMigrations;
