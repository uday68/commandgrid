// src/extension.ts
import * as vscode from 'vscode';
import { ProjectManager } from './core/projectManager';
import { AIService } from './services/aiService';
import { GitHubService } from './services/githubService';
import { CollaborationService } from './services/collaborationService';
import { DashboardView } from './views/dashboardView';
import { GamificationEngine } from './features/gamification';
import { TemplateManager } from './features/templateManager';
import { WorkflowAutomation } from './features/workflowAutomation';
import { ThemeManager } from './features/themeManager';
import { OfflineManager } from './features/OfflineManager';

export async function activate(context: vscode.ExtensionContext) {
  // Initialize configuration
  const config = vscode.workspace.getConfiguration('projectJourney');
  
  // Initialize services
  const projectManager = new ProjectManager();
  const aiService = new AIService(context);
  const githubService = new GitHubService(context);
  const collaborationService = new CollaborationService();
  const dashboardView = new DashboardView(context);
  const gamification = new GamificationEngine(context);
  const templateManager = new TemplateManager();
  const workflowAutomation = new WorkflowAutomation();
  const themeManager = new ThemeManager(context);
  const offlineManager = new OfflineManager(context);

  // Register commands
  const registerCommand = (command: string, callback: (...args: any[]) => any) => {
    context.subscriptions.push(vscode.commands.registerCommand(command, callback));
  };

  registerCommand('projectJourney.initProject', async () => {
    const project = await projectManager.initializeProject();
    dashboardView.render(project);
    gamification.trackAction('projectCreated');
  });

  registerCommand('projectJourney.generateSuggestions', async () => {
    const project = projectManager.getCurrentProject();
    if (project) {
      const suggestions = await aiService.getSuggestions(project);
      dashboardView.showSuggestions(suggestions);
    }
  });

  // Register commands for previously unused services
  registerCommand('projectJourney.createFromTemplate', async () => {
    const templates = await templateManager.listTemplates();
    const selected = await vscode.window.showQuickPick(templates);
    if (selected) {
      await templateManager.applyTemplate(selected);
      vscode.window.showInformationMessage(`Template "${selected}" applied successfully.`);
    }
  });

  registerCommand('projectJourney.automateWorkflow', async () => {
    const workflows = workflowAutomation.getAvailableWorkflows();
    const workflowItems = workflows.map(workflow => ({ label: workflow.name, workflow }));
    const selected = await vscode.window.showQuickPick(workflowItems);
    if (selected) {
      await workflowAutomation.executeWorkflow(selected.workflow.trigger);
      vscode.window.showInformationMessage(`Workflow "${selected.label}" executed successfully.`);
    }
  });

  // Initialize collaboration service
  collaborationService.initialize(context, config.get('collaborationEndpoint') || 'wss://collaboration.projectjourney.com');

  // Setup event listeners
  collaborationService.onConnectionStatus((isConnected) => {
    if (isConnected) {
      vscode.window.showInformationMessage('Connected to collaboration server');
    } else {
      vscode.window.showWarningMessage('Disconnected from collaboration server');
    }
  });

  collaborationService.onUpdate((update) => {
    projectManager.applyUpdate(update);
    dashboardView.refresh();
  });

  githubService.onCommit(() => {
    gamification.trackAction('githubCommit');
    dashboardView.refreshGitHubStatus();
  });

  // Initialize offline support
  offlineManager.initialize(projectManager);

  // Apply initial theme
  themeManager.applyTheme(config.get('theme') || 'dark');

  // Register views
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'projectJourneyDashboard',
      dashboardView
    )
  );

  // Start services
  await githubService.initialize();
  collaborationService.connect();
}

export function deactivate() {
  // Clean up resources
}