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
exports.deactivate = exports.activate = void 0;
// src/extension.ts
const vscode = __importStar(require("vscode"));
const projectManager_1 = require("./core/projectManager");
const aiService_1 = require("./services/aiService");
const githubService_1 = require("./services/githubService");
const collaborationService_1 = require("./services/collaborationService");
const dashboardView_1 = require("./views/dashboardView");
const gamification_1 = require("./features/gamification");
const templateManager_1 = require("./features/templateManager");
const workflowAutomation_1 = require("./features/workflowAutomation");
const themeManager_1 = require("./features/themeManager");
const OfflineManager_1 = require("./features/OfflineManager");
async function activate(context) {
    // Initialize configuration
    const config = vscode.workspace.getConfiguration('projectJourney');
    // Initialize services
    const projectManager = new projectManager_1.ProjectManager();
    const aiService = new aiService_1.AIService(context);
    const githubService = new githubService_1.GitHubService(context);
    const collaborationService = new collaborationService_1.CollaborationService();
    const dashboardView = new dashboardView_1.DashboardView(context);
    const gamification = new gamification_1.GamificationEngine(context);
    const templateManager = new templateManager_1.TemplateManager();
    const workflowAutomation = new workflowAutomation_1.WorkflowAutomation();
    const themeManager = new themeManager_1.ThemeManager(context);
    const offlineManager = new OfflineManager_1.OfflineManager(context);
    // Register commands
    const registerCommand = (command, callback) => {
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
        }
        else {
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
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('projectJourneyDashboard', dashboardView));
    // Start services
    await githubService.initialize();
    collaborationService.connect();
}
exports.activate = activate;
function deactivate() {
    // Clean up resources
}
exports.deactivate = deactivate;
//# sourceMappingURL=extensions.js.map