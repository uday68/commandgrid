// src/features/templateManager.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class TemplateManager {
  private templateDir: string;
  private defaultTemplates: ProjectTemplate[] = [
    {
      id: 'basic-project',
      name: 'Basic Project',
      description: 'A simple starter project with minimal configuration',
      files: [
        {
          path: 'README.md',
          content: '# Basic Project\n\nA simple starter project.\n\n## Getting Started\n\nFollow these instructions to get your project up and running.'
        },
        {
          path: '.gitignore',
          content: 'node_modules/\n.vscode/\n*.log'
        },
        {
          path: 'package.json',
          content: `{
  "name": "basic-project",
  "version": "1.0.0",
  "description": "A basic starter project",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}`
        },
        {
          path: 'index.js',
          content: `console.log('Hello world!');`
        }
      ]
    },
    {
      id: 'web-application',
      name: 'Web Application',
      description: 'A web application with HTML, CSS, and JavaScript',
      files: [
        {
          path: 'README.md',
          content: '# Web Application\n\nA web application template with HTML, CSS, and JavaScript.\n\n## Getting Started\n\nOpen index.html in your browser to see the application.'
        },
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web Application</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <div class="container">
    <h1>Welcome to Your Web Application</h1>
    <p>This is a starter template for a web application.</p>
  </div>
  <script src="js/main.js"></script>
</body>
</html>`
        },
        {
          path: 'css/styles.css',
          content: `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f4f4f4;
}

.container {
  width: 80%;
  margin: 30px auto;
  padding: 20px;
  background-color: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}`
        },
        {
          path: 'js/main.js',
          content: `// Main JavaScript file
document.addEventListener('DOMContentLoaded', function() {
  console.log('Web application loaded successfully!');
});`
        },
        {
          path: '.gitignore',
          content: 'node_modules/\n.vscode/\n*.log'
        }
      ]
    },
    {
      id: 'api-service',
      name: 'API Service',
      description: 'A RESTful API service template with Express.js',
      files: [
        {
          path: 'README.md',
          content: '# API Service\n\nA RESTful API service template with Express.js.\n\n## Getting Started\n\nRun `npm install` and then `npm start` to start the server.'
        },
        {
          path: 'package.json',
          content: `{
  "name": "api-service",
  "version": "1.0.0",
  "description": "A RESTful API service",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": ["api", "rest", "express"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.17.1",
    "cors": "^2.8.5",
    "dotenv": "^10.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.12"
  }
}`
        },
        {
          path: 'src/index.js',
          content: `const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', require('./routes/api'));

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'API Service is running' });
});

// Start server
app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});`
        },
        {
          path: 'src/routes/api.js',
          content: `const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

router.get('/items', (req, res) => {
  res.json([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' }
  ]);
});

module.exports = router;`
        },
        {
          path: '.env',
          content: `PORT=3000`
        },
        {
          path: '.gitignore',
          content: `node_modules/
.env
npm-debug.log*
.vscode/`
        }
      ]
    }
  ];

  constructor() {
    // Templates could be stored in a specific location
    this.templateDir = path.join(__dirname, '../../templates');
    
    // Ensure template directory exists
    if (!fs.existsSync(this.templateDir)) {
      fs.mkdirSync(this.templateDir, { recursive: true });
    }
    
    // Initialize default templates if they don't exist
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default templates if they don't exist yet
   */
  private initializeDefaultTemplates(): void {
    this.defaultTemplates.forEach(template => {
      const templatePath = path.join(this.templateDir, `${template.id}.json`);
      if (!fs.existsSync(templatePath)) {
        this.saveTemplate(template.id, template);
      }
    });
  }

  /**
   * Get a list of available templates
   */
  public getAvailableTemplates(): string[] {
    try {
      if (fs.existsSync(this.templateDir)) {
        return fs.readdirSync(this.templateDir)
          .filter(file => file.endsWith('.json'))
          .map(file => path.basename(file, '.json'));
      }
    } catch (error) {
      console.error('Error reading templates:', error);
    }
    return [];
  }

  /**
   * List templates for selection in the UI
   */
  public async listTemplates(): Promise<string[]> {
    const templateIds = this.getAvailableTemplates();
    const templates: string[] = [];
    
    for (const id of templateIds) {
      const template = this.loadTemplate(id);
      if (template && template.name) {
        templates.push(template.name);
      }
    }
    
    return templates;
  }

  /**
   * Load a template by name
   */
  public loadTemplate(name: string): ProjectTemplate | null {
    try {
      const templatePath = path.join(this.templateDir, `${name}.json`);
      if (fs.existsSync(templatePath)) {
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        return JSON.parse(templateContent);
      }
    } catch (error) {
      console.error(`Error loading template ${name}:`, error);
    }
    return null;
  }

  /**
   * Save a new template
   */
  public saveTemplate(name: string, templateData: any): boolean {
    try {
      if (!fs.existsSync(this.templateDir)) {
        fs.mkdirSync(this.templateDir, { recursive: true });
      }
      
      const templatePath = path.join(this.templateDir, `${name}.json`);
      fs.writeFileSync(templatePath, JSON.stringify(templateData, null, 2));
      return true;
    } catch (error) {
      console.error(`Error saving template ${name}:`, error);
      return false;
    }
  }
  
  /**
   * Apply a template to create a new project
   */
  public async applyTemplate(templateName: string): Promise<void> {
    try {
      // Find template by name
      const templateIds = this.getAvailableTemplates();
      let templateId = null;
      
      for (const id of templateIds) {
        const template = this.loadTemplate(id);
        if (template && template.name === templateName) {
          templateId = id;
          break;
        }
      }
      
      if (!templateId) {
        throw new Error(`Template "${templateName}" not found`);
      }
      
      const template = this.loadTemplate(templateId);
      if (!template) {
        throw new Error(`Failed to load template "${templateName}"`);
      }
      
      // Ask for project location
      const workspaceFolders = vscode.workspace.workspaceFolders;
      let targetDirectory: string;
      
      if (workspaceFolders) {
        targetDirectory = workspaceFolders[0].uri.fsPath;
      } else {
        const folderUri = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: 'Select project location'
        });
        
        if (!folderUri || folderUri.length === 0) {
          throw new Error('No folder selected');
        }
        
        targetDirectory = folderUri[0].fsPath;
      }
      
      // Ask for project name
      const projectName = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        placeHolder: templateName.toLowerCase().replace(/\s+/g, '-'),
        validateInput: (input) => {
          if (!input) return 'Project name cannot be empty';
          if (!/^[a-zA-Z0-9_\-]+$/.test(input)) return 'Project name can only contain letters, numbers, underscores and hyphens';
          return null;
        }
      });
      
      if (!projectName) {
        throw new Error('Project creation cancelled');
      }
      
      const projectDir = path.join(targetDirectory, projectName);
      
      // Check if directory already exists
      if (fs.existsSync(projectDir)) {
        const overwrite = await vscode.window.showWarningMessage(
          `Directory ${projectName} already exists. Overwrite?`,
          { modal: true },
          'Yes', 'No'
        );
        
        if (overwrite !== 'Yes') {
          throw new Error('Project creation cancelled');
        }
      } else {
        fs.mkdirSync(projectDir, { recursive: true });
      }
      
      // Create files from template
      for (const file of template.files) {
        const filePath = path.join(projectDir, file.path);
        const dirPath = path.dirname(filePath);
        
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        
        // Replace template variables if any
        let content = file.content;
        content = content.replace(/\{\{projectName\}\}/g, projectName);
        
        fs.writeFileSync(filePath, content);
      }
      
      // Open the new project in VSCode
      const uri = vscode.Uri.file(projectDir);
      await vscode.commands.executeCommand('vscode.openFolder', uri);
      
    } catch (error) {
      vscode.window.showErrorMessage(`Error applying template: ${(error as Error).message}`);
      throw error;
    }
  }
}

/**
 * Interface for project template structure
 */
interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  files: TemplateFile[];
}

/**
 * Interface for template file structure
 */
interface TemplateFile {
  path: string;
  content: string;
}