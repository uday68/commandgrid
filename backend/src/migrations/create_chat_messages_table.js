import { pool } from '../Config/database.js';

async function createChatMessagesTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');    // Create chat messages table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS PUBLIC.CHAT_MESSAGES (
        MESSAGE_ID UUID NOT NULL DEFAULT UUID_GENERATE_V4(),
        USER_ID UUID NOT NULL,
        CONTENT TEXT NOT NULL,
        IS_BOT BOOLEAN NOT NULL DEFAULT FALSE,
        CONVERSATION_ID UUID NOT NULL,
        CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UPDATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        IS_PINNED BOOLEAN NOT NULL DEFAULT FALSE,
        PINNED_AT TIMESTAMP WITH TIME ZONE,
        ROOM_ID UUID,
        METADATA JSONB,
        CONSTRAINT CHAT_MESSAGES_PKEY PRIMARY KEY (MESSAGE_ID),
        CONSTRAINT CHAT_MESSAGES_USER_ID_FKEY FOREIGN KEY (USER_ID)
          REFERENCES PUBLIC.USERS (ID) ON DELETE CASCADE
      );
    `);

    // Create index on conversation_id for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS CHAT_MESSAGES_CONVERSATION_ID_IDX 
      ON PUBLIC.CHAT_MESSAGES (CONVERSATION_ID);
    `);

    await client.query('COMMIT');
    console.log('Chat messages table created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating chat messages table:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default createChatMessagesTable;
