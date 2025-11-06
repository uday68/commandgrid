"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectDocumentationService = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Service for generating and managing project documentation
 */
class ProjectDocumentationService {
    constructor() {
        // Initialize any required properties or services here
    }
    /**
     * Generate documentation for the current project
     */
    async generateDocumentation() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Please open a project folder to generate documentation');
            return;
        }
        try {
            // Get project structure
            const rootPath = workspaceFolders[0].uri.fsPath;
            const projectInfo = await this.analyzeProject(rootPath);
            // Generate markdown content
            const markdown = this.generateMarkdown(projectInfo, rootPath);
            // Create documentation file
            const docsFolder = path.join(rootPath, 'docs');
            if (!fs.existsSync(docsFolder)) {
                fs.mkdirSync(docsFolder, { recursive: true });
            }
            const docFilePath = path.join(docsFolder, 'project-documentation.md');
            fs.writeFileSync(docFilePath, markdown, 'utf8');
            // Show success and open file
            vscode.window.showInformationMessage('Project documentation generated successfully!');
            const docUri = vscode.Uri.file(docFilePath);
            vscode.commands.executeCommand('markdown.showPreview', docUri);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error generating documentation: ${error.message}`);
        }
    }
    /**
     * Analyze project structure and gather information
     */
    async analyzeProject(rootPath) {
        // Basic project information
        const projectName = path.basename(rootPath);
        // Count files by type
        const fileStats = await this.getFileStats(rootPath);
        // Get package info if available
        const packageInfo = this.getPackageInfo(rootPath);
        return {
            name: projectName,
            path: rootPath,
            stats: fileStats,
            packageInfo: packageInfo,
            generatedAt: new Date()
        };
    }
    /**
     * Get file statistics for the project
     */
    async getFileStats(rootPath) {
        const stats = {
            totalFiles: 0,
            byExtension: {}
        };
        // Use VS Code file search to find files
        const filesPattern = new vscode.RelativePattern(rootPath, '**/*.*');
        const excludePattern = new vscode.RelativePattern(rootPath, '**/{node_modules,dist,build,out,coverage}/**');
        const files = await vscode.workspace.findFiles(filesPattern, excludePattern);
        stats.totalFiles = files.length;
        // Count files by extension
        for (const file of files) {
            const ext = path.extname(file.fsPath);
            if (ext) {
                const extension = ext.substring(1); // Remove leading dot
                stats.byExtension[extension] = (stats.byExtension[extension] || 0) + 1;
            }
        }
        return stats;
    }
    /**
     * Get package.json information if available
     */
    getPackageInfo(rootPath) {
        const packageJsonPath = path.join(rootPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                return {
                    name: packageJson.name || 'unknown',
                    version: packageJson.version || 'unknown',
                    description: packageJson.description || 'No description provided',
                    dependencies: Object.keys(packageJson.dependencies || {}).length,
                    devDependencies: Object.keys(packageJson.devDependencies || {}).length
                };
            }
            catch (error) {
                console.error('Error parsing package.json:', error);
            }
        }
        return null;
    }
    /**
     * Generate markdown documentation
     */
    generateMarkdown(info, rootPath) {
        // Get current date/time in locale format
        const dateStr = info.generatedAt.toLocaleDateString();
        const timeStr = info.generatedAt.toLocaleTimeString();
        // Generate extensions list by popularity
        const extensions = Object.entries(info.stats.byExtension)
            .sort(([, countA], [, countB]) => countB - countA)
            .slice(0, 10)
            .map(([ext, count]) => `- \`.${ext}\`: ${count} files`);
        let markdown = `# ${info.name}\n\n`;
        markdown += `*Documentation generated on ${dateStr} at ${timeStr}*\n\n`;
        // Add package info if available
        if (info.packageInfo) {
            markdown += `## Project Overview\n\n`;
            markdown += `- **Name:** ${info.packageInfo.name}\n`;
            markdown += `- **Version:** ${info.packageInfo.version}\n`;
            markdown += `- **Description:** ${info.packageInfo.description}\n`;
            markdown += `- **Dependencies:** ${info.packageInfo.dependencies}\n`;
            markdown += `- **Dev Dependencies:** ${info.packageInfo.devDependencies}\n\n`;
        }
        // Add file statistics
        markdown += `## Project Statistics\n\n`;
        markdown += `- **Total Files:** ${info.stats.totalFiles}\n\n`;
        // Add top file extensions
        markdown += `### File Types\n\n`;
        markdown += extensions.join('\n');
        markdown += `\n\n`;
        // Project structure section
        markdown += `## Project Structure\n\n`;
        markdown += `\`\`\`\n`;
        // Generate simplified project structure (top-level folders)
        try {
            const entries = fs.readdirSync(rootPath, { withFileTypes: true });
            const dirs = entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && !['node_modules', 'dist', 'build', 'coverage'].includes(entry.name));
            for (const dir of dirs) {
                markdown += `/${dir.name}/\n`;
                // Add first level of subdirectories
                try {
                    const subEntries = fs.readdirSync(path.join(rootPath, dir.name), { withFileTypes: true });
                    const subDirs = subEntries.filter(entry => entry.isDirectory());
                    for (const subDir of subDirs) {
                        markdown += `  /${dir.name}/${subDir.name}/\n`;
                    }
                }
                catch (error) {
                    // Skip on error
                }
            }
        }
        catch (error) {
            markdown += `Error retrieving project structure\n`;
        }
        markdown += `\`\`\`\n\n`;
        // Getting started section
        markdown += `## Getting Started\n\n`;
        markdown += `*This section should be customized with specific instructions for your project.*\n\n`;
        markdown += `### Prerequisites\n\n`;
        markdown += `- Node.js and npm (if applicable)\n`;
        markdown += `- Any other project dependencies\n\n`;
        markdown += `### Installation\n\n`;
        markdown += `\`\`\`bash\n`;
        markdown += `# Clone the repository\n`;
        markdown += `git clone [repository-url]\n\n`;
        markdown += `# Install dependencies\n`;
        markdown += `npm install\n\n`;
        markdown += `# Run the project\n`;
        markdown += `npm start\n`;
        markdown += `\`\`\`\n\n`;
        markdown += `---\n\n`;
        markdown += `*This documentation was automatically generated by Project Management Tool VSCode Extension.*`;
        return markdown;
    }
}
exports.ProjectDocumentationService = ProjectDocumentationService;
//# sourceMappingURL=projectDocumentationService.js.map