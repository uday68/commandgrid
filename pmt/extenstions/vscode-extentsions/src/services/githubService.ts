// src/services/githubService.ts
import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { Project, Task } from '../models/project';

export class GitHubService {
  private octokit?: Octokit;
  private listeners: Array<() => void> = [];

  constructor(private context: vscode.ExtensionContext) {}

  async initialize(): Promise<void> {
    const token = await this.getGitHubToken();
    if (token) {
      this.octokit = new Octokit({
        auth: token,
        userAgent: 'ProjectJourney/v1.0'
      });
    }
  }

  async connectRepository(project: Project): Promise<void> {
    if (!this.octokit) {
      throw new Error('GitHub not initialized');
    }

    try {
      const response = await this.octokit.repos.createForAuthenticatedUser({
        name: project.name,
        description: `Project managed by ProjectJourney: ${project.name}`,
        private: true,
        auto_init: true
      });

      project.githubRepo = {
        url: response.data.html_url,
        owner: response.data.owner.login,
        name: response.data.name
      };

      await this.setupRepository(project);
    } catch (error) {
      console.error('GitHub Error:', error);
      throw error;
    }
  }

  async setupRepository(project: Project): Promise<void> {
    // Implementation for setting up the repository
    if (!this.octokit || !project.githubRepo) return;
    
    // Create labels for the repository
    await this.octokit.issues.createLabel({
      owner: project.githubRepo.owner,
      repo: project.githubRepo.name,
      name: 'project-journey',
      color: '0366d6',
      description: 'Managed by Project Journey'
    });
  }

  async syncTasks(project: Project): Promise<void> {
    if (!this.octokit || !project.githubRepo) return;

    for (const task of project.tasks) {
      if (!task.githubIssueId) {
        await this.createIssueForTask(project, task);
      } else if (task.updatedAt && task.lastSyncedAt && task.updatedAt > task.lastSyncedAt) {
        await this.updateIssueForTask(project, task);
      }
    }
  }

  private async createIssueForTask(project: Project, task: Task): Promise<void> {
    if (!this.octokit || !project.githubRepo) return;

    const response = await this.octokit.issues.create({
      owner: project.githubRepo.owner,
      repo: project.githubRepo.name,
      title: task.title,
      body: this.buildIssueBody(task),
      labels: ['project-journey']
    });

    task.githubIssueId = response.data.id;
    task.githubIssueUrl = response.data.html_url;
    task.lastSyncedAt = new Date();

    this.notifyListeners();
  }

  private async updateIssueForTask(project: Project, task: Task): Promise<void> {
    if (!this.octokit || !project.githubRepo || !task.githubIssueId) return;
    
    await this.octokit.issues.update({
      owner: project.githubRepo.owner,
      repo: project.githubRepo.name,
      issue_number: task.githubIssueId,
      title: task.title,
      body: this.buildIssueBody(task),
      state: task.status === 'completed' ? 'closed' : 'open'
    });
    
    task.lastSyncedAt = new Date();
    this.notifyListeners();
  }

  private buildIssueBody(task: Task): string {
    return `## Task Details\n\n**Description:** ${task.description || 'No description'}\n\n` +
           `**Status:** ${task.status}\n\n` +
           `**Created:** ${task.createdAt.toISOString()}\n\n` +
           `_Managed by ProjectJourney_`;
  }

  onCommit(listener: () => void): void {
    this.listeners.push(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  private async getGitHubToken(): Promise<string | null> {
    // Implementation for secure token storage
    try {
      return await this.context.secrets.get('github-token') || null;
    } catch (error) {
      console.error('Error retrieving GitHub token:', error);
      return null;
    }
  }
}