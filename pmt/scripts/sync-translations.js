/**
 * Script to synchronize translation files between src/i18n/locales and public/locales
 * This ensures consistency between both directories
 */

const fs = require('fs');
const path = require('path');

// Paths for source and destination
const srcPath = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const publicPath = path.join(__dirname, '..', 'public', 'locales');

// Create destination directory if it doesn't exist
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
  console.log(`Created directory: ${publicPath}`);
}

// Function to sync files recursively
function syncTranslations(sourcePath, destPath) {
  // Create the destination directory if it doesn't exist
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
    console.log(`Created directory: ${destPath}`);
  }

  // Read all entries in the source directory
  const entries = fs.readdirSync(sourcePath, { withFileTypes: true });

  // Process each entry
  entries.forEach(entry => {
    const sourceFullPath = path.join(sourcePath, entry.name);
    const destFullPath = path.join(destPath, entry.name);

    if (entry.isDirectory()) {
      // Recursively sync subdirectories
      syncTranslations(sourceFullPath, destFullPath);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      // Copy JSON files
      try {
        const sourceContent = fs.readFileSync(sourceFullPath, 'utf8');
        // Parse and stringify to ensure valid JSON and consistent formatting
        const jsonContent = JSON.parse(sourceContent);
        const formattedContent = JSON.stringify(jsonContent, null, 2);

        // Write to destination
        fs.writeFileSync(destFullPath, formattedContent);
        console.log(`Synchronized: ${destFullPath}`);
      } catch (error) {
        console.error(`Error synchronizing ${sourceFullPath}: ${error.message}`);
      }
    }
  });
}

// Start the synchronization process
console.log('Starting translation synchronization...');
syncTranslations(srcPath, publicPath);
console.log('Translation synchronization completed!');
