import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    console.log('Running all migrations...');
    
    // Get all migration files
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(file => 
        file.match(/^\d{3,}-.*\.js$/) &&
        file !== 'run-migrations.js' &&
        !file.includes('.test.js')
      )
      .sort(); // Sort to ensure they run in order (001, 002, etc.)
    
    console.log(`Found ${migrationFiles.length} migration files:`);
    console.log(migrationFiles);
    
    // Run each migration in sequence
    for (const file of migrationFiles) {
      console.log(`\nRunning migration: ${file}`);
      
      try {
        // Construct the full path and convert to a file:// URL
        const filePath = path.join(__dirname, file);
        const fileUrl = pathToFileURL(filePath).href; // Convert path to file:// URL

        // Import and run the migration
        const migration = await import(fileUrl); // Use the file:// URL for import
        if (typeof migration.default === 'function') {
          await migration.default();
        } else if (typeof migration.runMigration === 'function') {
          await migration.runMigration();
        } else {
          console.warn(`Warning: No runnable migration function found in ${file}`);
        }
        
        console.log(`Migration ${file} completed successfully`);
      } catch (error) {
        console.error(`Failed to run migration ${file}:`, error);
        throw error; // Stop on first failure
      }
    }
    
    console.log('\nAll migrations completed successfully');
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  }
}

runMigrations().catch(console.error);
