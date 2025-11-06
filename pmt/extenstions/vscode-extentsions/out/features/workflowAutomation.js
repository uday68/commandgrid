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
exports.WorkflowAutomation = void 0;
// src/features/workflowAutomation.ts
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Class for automating common workflows in projects
 */
class WorkflowAutomation {
    constructor() {
        this.workflows = [];
        this.templates = [
            {
                id: 'ci-cd',
                name: 'CI/CD Pipeline',
                description: 'Basic CI/CD pipeline with testing and deployment',
                files: [
                    {
                        path: '.github/workflows/ci.yml',
                        content: `name: CI Pipeline
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test`
                    }
                ]
            }
        ];
        // Initialize with some default workflows
        this.initDefaultWorkflows();
    }
    /**
     * Register a new workflow
     * @param workflow Workflow to register
     */
    registerWorkflow(workflow) {
        // Check for duplicate triggers
        const existingIndex = this.workflows.findIndex(w => w.trigger === workflow.trigger);
        if (existingIndex !== -1) {
            this.workflows[existingIndex] = workflow; // Replace existing workflow
        }
        else {
            this.workflows.push(workflow); // Add new workflow
        }
    }
    /**
     * Execute a workflow by its trigger
     * @param trigger The workflow trigger
     * @param context Context data for the workflow
     */
    async executeWorkflow(trigger, context = {}) {
        const workflow = this.workflows.find(w => w.trigger === trigger);
        if (!workflow) {
            console.log(`No workflow found for trigger: ${trigger}`);
            return;
        }
        try {
            await workflow.execute(context);
            vscode.window.showInformationMessage(`Workflow '${workflow.name}' executed successfully`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Workflow '${workflow.name}' failed: ${error.message}`);
        }
    }
    /**
     * Get available workflows
     */
    getAvailableWorkflows() {
        return [...this.workflows];
    }
    /**
     * Initialize default workflows
     */
    initDefaultWorkflows() {
        this.registerWorkflow({
            name: 'Task Completion',
            description: 'Updates project status when all tasks are complete',
            trigger: 'task-completed',
            execute: async (context) => {
                console.log('Task completion workflow triggered', context);
                // Example implementation
            }
        });
        this.registerWorkflow({
            name: 'Milestone Reached',
            description: 'Notifies team when a milestone is reached',
            trigger: 'milestone-reached',
            execute: async (context) => {
                console.log('Milestone workflow triggered', context);
                // Example implementation
            }
        });
    }
    async setupWorkflow(project, workflowId) {
        const template = this.templates.find(t => t.id === workflowId);
        if (!template) {
            throw new Error(`Workflow template ${workflowId} not found`);
        }
        for (const file of template.files) {
            const filePath = path.join(project.path, file.path);
            const dirPath = path.dirname(filePath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            fs.writeFileSync(filePath, file.content);
        }
        vscode.window.showInformationMessage(`${template.name} workflow has been set up for your project`);
    }
    getAvailableWorkflowTemplates() {
        return this.templates;
    }
}
exports.WorkflowAutomation = WorkflowAutomation;
//# sourceMappingURL=workflowAutomation.js.map