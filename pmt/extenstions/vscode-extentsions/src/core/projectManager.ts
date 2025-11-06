// src/core/projectManager.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Project, Task } from '../models/project';
import { DependencyGraph } from '../utils/dependencyGraph';

export class ProjectManager {
  private currentProject: Project | null = null;
  private dependencyGraph = new DependencyGraph();
  private fileWatchers: vscode.FileSystemWatcher[] = [];



  async initializeProject(): Promise<Project> {
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

  getCurrentProject(): Project | null {
    return this.currentProject;
  }

  async addTask(task: Task): Promise<void> {
    if (!this.currentProject) return;
    
    this.currentProject.tasks.push(task);
    this.dependencyGraph.addNodeToGraph(task.id);
    await this.saveProject();
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    if (!this.currentProject) return;
    
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
  
  applyUpdate(update: any): void {
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

  private async saveProject(): Promise<void> {
    if (!this.currentProject) return;
    
    const projectPath = path.join(this.currentProject.path, '.projectjourney');
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath);
    }

    fs.writeFileSync(
      path.join(projectPath, 'project.json'),
      JSON.stringify(this.currentProject, null, 2)
    );

    this.currentProject.updatedAt = new Date();
  }

  private setupFileWatchers(): void {
    if (!this.currentProject) return;

    this.fileWatchers.forEach(watcher => watcher.dispose());
    this.fileWatchers = [];

    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.currentProject.path, '**/*')
    );

    watcher.onDidChange(uri => this.handleFileChange(uri));
    watcher.onDidCreate(uri => this.handleFileChange(uri));
    watcher.onDidDelete(uri => this.handleFileDelete(uri));

    this.fileWatchers.push(watcher);
  }

  private handleFileChange(_uri: vscode.Uri): void {
    // Implement file change tracking
  }

  private handleFileDelete(_uri: vscode.Uri): void {
    // Implement file deletion tracking
  }

  private generateProjectId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}