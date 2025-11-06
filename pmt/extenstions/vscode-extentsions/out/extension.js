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
const vscode = __importStar(require("vscode"));
const todoListProvider_1 = require("./providers/todoListProvider");
const goalTrackingService_1 = require("./services/goalTrackingService");
const projectDocumentationService_1 = require("./services/projectDocumentationService");
const taskAutomationService_1 = require("./services/taskAutomationService");
function activate(context) {
    // Register providers
    const todoListProvider = new todoListProvider_1.TodoListProvider(context);
    const goalTrackingService = new goalTrackingService_1.GoalTrackingService(context);
    const documentationService = new projectDocumentationService_1.ProjectDocumentationService();
    const taskAutomationService = new taskAutomationService_1.TaskAutomationService(context);
    // Register views
    vscode.window.registerTreeDataProvider('todoList', todoListProvider);
    vscode.window.registerTreeDataProvider('projectGoals', goalTrackingService);
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('pmt.addTodo', () => todoListProvider.addTodoItem()), vscode.commands.registerCommand('pmt.completeTodo', (item) => todoListProvider.completeTodoItem(item)), vscode.commands.registerCommand('pmt.setGoal', () => goalTrackingService.createNewGoal()), vscode.commands.registerCommand('pmt.trackProgress', () => goalTrackingService.trackProgress()), vscode.commands.registerCommand('pmt.generateDocumentation', () => documentationService.generateDocumentation()), vscode.commands.registerCommand('pmt.createTaskAutomation', () => taskAutomationService.createAutomation()), vscode.commands.registerCommand('pmt.continueYesterday', () => todoListProvider.continuePreviousDayTasks()));
    console.log('Project Management Tool extension is now active');
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map