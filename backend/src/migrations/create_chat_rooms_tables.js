import { pool } from '../Config/database.js';

async function createChatRoomsTables() {
  const client = await pool.connect();
    try {
    await client.query('BEGIN');

    // Enable UUID extension if not already enabled
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');    // Create chat_rooms table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_rooms (
        room_id UUID NOT NULL DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL DEFAULT 'general',
        project_id UUID,
        team_id UUID,
        is_private BOOLEAN NOT NULL DEFAULT FALSE,
        company_id UUID,
        created_by UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chat_rooms_pkey PRIMARY KEY (room_id)
      );
    `);    // Create chat_room_members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_room_members (
        member_id UUID NOT NULL DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL,
        user_id UUID NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chat_room_members_pkey PRIMARY KEY (member_id),
        CONSTRAINT chat_room_members_unique UNIQUE (room_id, user_id)
      );
    `);

    // Update chat_messages table to use room_id as conversation_id
    await client.query(`
      ALTER TABLE chat_messages 
      ADD COLUMN IF NOT EXISTS room_id UUID;
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS chat_rooms_company_id_idx 
      ON chat_rooms (company_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS chat_rooms_type_idx 
      ON chat_rooms (type);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS chat_room_members_room_id_idx 
      ON chat_room_members (room_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS chat_room_members_user_id_idx 
      ON chat_room_members (user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS chat_messages_room_id_idx 
      ON chat_messages (room_id);
    `);

    await client.query('COMMIT');
    console.log('Chat rooms tables created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating chat rooms tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default createChatRoomsTables;
