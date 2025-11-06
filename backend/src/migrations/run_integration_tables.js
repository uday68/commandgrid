// Run the integration tables migration
import { up } from './005_create_integration_tables.js';
import { logger } from '../utils/logger.js';

async function runMigration() {
  try {
    logger.info('Starting integration tables migration');
    await up();
    logger.info('Integration tables migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Integration tables migration failed:', error);
    process.exit(1);
  }
}

runMigration();
