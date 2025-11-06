import * as vscode from 'vscode';
import { TodoListProvider } from './providers/todoListProvider';
import { GoalTrackingService } from './services/goalTrackingService';
import { ProjectDocumentationService } from './services/projectDocumentationService';
import { TaskAutomationService } from './services/taskAutomationService';

export function activate(context: vscode.ExtensionContext) {
    // Register providers
    const todoListProvider = new TodoListProvider(context);
    const goalTrackingService = new GoalTrackingService(context);
    const documentationService = new ProjectDocumentationService();
    const taskAutomationService = new TaskAutomationService(context);
    
    // Register views
    vscode.window.registerTreeDataProvider('todoList', todoListProvider);
    vscode.window.registerTreeDataProvider('projectGoals', goalTrackingService);
    
    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('pmt.addTodo', () => todoListProvider.addTodoItem()),
        vscode.commands.registerCommand('pmt.completeTodo', (item) => todoListProvider.completeTodoItem(item)),
        vscode.commands.registerCommand('pmt.setGoal', () => goalTrackingService.createNewGoal()),
        vscode.commands.registerCommand('pmt.trackProgress', () => goalTrackingService.trackProgress()),
        vscode.commands.registerCommand('pmt.generateDocumentation', () => documentationService.generateDocumentation()),
        vscode.commands.registerCommand('pmt.createTaskAutomation', () => taskAutomationService.createAutomation()),
        vscode.commands.registerCommand('pmt.continueYesterday', () => todoListProvider.continuePreviousDayTasks())
    );

    console.log('Project Management Tool extension is now active');
}

export function deactivate() {}
