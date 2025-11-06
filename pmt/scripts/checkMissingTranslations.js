/**
 * Script to check for missing translation keys in the project
 * This helps identify places where translations might be missing
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Paths for source and locales
const srcPath = path.join(__dirname, '..', 'src');
const localesPath = path.join(__dirname, '..', 'src', 'i18n', 'locales');

// Supported languages
const languages = ['en', 'hi', 'fr', 'es', 'zh', 'ar', 'he'];

// Get all translation keys from translation files
function getTranslationKeys(language) {
  const keys = new Map();
  
  // Function to recursively extract keys from an object with their dot paths
  const extractKeys = (obj, prefix = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        // Recursively extract nested keys
        extractKeys(value, fullKey);
      } else {
        // Add the leaf key
        keys.set(fullKey, value);
      }
    }
  };

  // Process all JSON files for the given language
  const langDir = path.join(localesPath, language);
  if (fs.existsSync(langDir) && fs.statSync(langDir).isDirectory()) {
    const files = glob.sync('**/*.json', { cwd: langDir });
    files.forEach(file => {
      try {
        const namespace = path.basename(file, '.json');
        const filePath = path.join(langDir, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Use namespace as prefix for keys from this file
        extractKeys(content, namespace);
      } catch (error) {
        console.error(`Error processing ${file} for ${language}: ${error.message}`);
      }
    });
  }
  
  return keys;
}

// Extract translation keys used in code
function extractKeysFromCode() {
  const usedKeys = new Set();
  const regex = /t\(['"]([^'"]+)['"]\)/g;
  const regexUseTranslation = /useTranslation\(\s*\[?\s*(['"])([^'"]+)['"]/g;
  const fileTypes = ['js', 'jsx', 'ts', 'tsx'];
  
  // Find all used namespaces
  const usedNamespaces = new Set(['translation']); // Default namespace
  const files = glob.sync(`${srcPath}/**/*.{${fileTypes.join(',')}}`, { nodir: true });
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      let match;
      
      // Extract namespaces from useTranslation hooks
      while ((match = regexUseTranslation.exec(content)) !== null) {
        const namespace = match[2];
        usedNamespaces.add(namespace);
      }
      
      // Extract used translation keys
      while ((match = regex.exec(content)) !== null) {
        usedKeys.add(match[1]);
      }
    } catch (error) {
      console.error(`Error processing ${file}: ${error.message}`);
    }
  });
  
  return { usedKeys, usedNamespaces };
}

// Check for missing translation keys
function checkMissingKeys() {
  console.log('Checking for missing translation keys...');
  
  const { usedKeys, usedNamespaces } = extractKeysFromCode();
  console.log(`Found ${usedKeys.size} unique translation keys used in code`);
  console.log(`Namespaces used: ${[...usedNamespaces].join(', ')}`);
  
  // Check each language
  languages.forEach(language => {
    const translationKeys = getTranslationKeys(language);
    console.log(`\nLanguage: ${language} (${translationKeys.size} keys found)`);
    
    // Check for keys used in code but missing in translations
    let missingCount = 0;
    usedKeys.forEach(key => {
      if (!translationKeys.has(key)) {
        console.log(`  Missing key: ${key}`);
        missingCount++;
      }
    });
    
    if (missingCount === 0) {
      console.log(`  All keys are present in ${language} translations`);
    } else {
      console.log(`  ${missingCount} keys are missing in ${language} translations`);
    }
  });
}

// Start the check
checkMissingKeys();
