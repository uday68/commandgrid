import createChatRoomsTables from './src/migrations/create_chat_rooms_tables.js';

(async () => {
  try {
    await createChatRoomsTables();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
})();
