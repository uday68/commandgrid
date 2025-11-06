import { pool } from '../Config/database.js';

async function addMissingChatColumns() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Add missing columns to chat_messages table
    await client.query(`
      ALTER TABLE PUBLIC.CHAT_MESSAGES 
      ADD COLUMN IF NOT EXISTS IS_PINNED BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS PINNED_AT TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS ROOM_ID UUID;
    `);
    
    // Create index on room_id for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS CHAT_MESSAGES_ROOM_ID_IDX 
      ON PUBLIC.CHAT_MESSAGES (ROOM_ID);
    `);
    
    // Create index on pinned messages
    await client.query(`
      CREATE INDEX IF NOT EXISTS CHAT_MESSAGES_PINNED_IDX 
      ON PUBLIC.CHAT_MESSAGES (IS_PINNED, PINNED_AT);
    `);
    
    await client.query('COMMIT');
    console.log('Missing chat columns added successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding missing chat columns:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default addMissingChatColumns;
