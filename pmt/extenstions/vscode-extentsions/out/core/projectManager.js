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
exports.ProjectManager = void 0;
// src/core/projectManager.ts
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const dependencyGraph_1 = require("../utils/dependencyGraph");
class ProjectManager {
    constructor() {
        this.currentProject = null;
        this.dependencyGraph = new dependencyGraph_1.DependencyGraph();
        this.fileWatchers = [];
    }
    async initializeProject() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder open');
        }
        const projectName = path.basename(workspaceFolders[0].uri.fsPath);
        this.currentProject = {
            id: this.generateProjectId(),
            name: projectName,
            path: workspaceFolders[0].uri.fsPath,
            type: '',
            features: [],
            tasks: [],
            timeline: [],
            team: [],
            githubRepo: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            config: {}
        };
        this.setupFileWatchers();
        await this.saveProject();
        return this.currentProject;
    }
    getCurrentProject() {
        return this.currentProject;
    }
    async addTask(task) {
        if (!this.currentProject)
            return;
        this.currentProject.tasks.push(task);
        this.dependencyGraph.addNodeToGraph(task.id);
        await this.saveProject();
    }
    async updateTask(taskId, updates) {
        if (!this.currentProject)
            return;
        const taskIndex = this.currentProject.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.currentProject.tasks[taskIndex] = {
                ...this.currentProject.tasks[taskIndex],
                ...updates,
                updatedAt: new Date()
            };
            await this.saveProject();
        }
    }
    applyUpdate(update) {
        // Implementation needed based on your project requirements
        console.log('Applying update:', update);
        // Example implementation:
        if (update && this.currentProject) {
            if (update.tasks) {
                this.currentProject.tasks = update.tasks;
            }
            if (update.team) {
                this.currentProject.team = update.team;
            }
            this.currentProject.updatedAt = new Date();
        }
    }
    async saveProject() {
        if (!this.currentProject)
            return;
        const projectPath = path.join(this.currentProject.path, '.projectjourney');
        if (!fs.existsSync(projectPath)) {
            fs.mkdirSync(projectPath);
        }
        fs.writeFileSync(path.join(projectPath, 'project.json'), JSON.stringify(this.currentProject, null, 2));
        this.currentProject.updatedAt = new Date();
    }
    setupFileWatchers() {
        if (!this.currentProject)
            return;
        this.fileWatchers.forEach(watcher => watcher.dispose());
        this.fileWatchers = [];
        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.currentProject.path, '**/*'));
        watcher.onDidChange(uri => this.handleFileChange(uri));
        watcher.onDidCreate(uri => this.handleFileChange(uri));
        watcher.onDidDelete(uri => this.handleFileDelete(uri));
        this.fileWatchers.push(watcher);
    }
    handleFileChange(_uri) {
        // Implement file change tracking
    }
    handleFileDelete(_uri) {
        // Implement file deletion tracking
    }
    generateProjectId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
}
exports.ProjectManager = ProjectManager;
//# sourceMappingURL=projectManager.js.map