// src/features/workflowAutomation.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Project } from '../models/project';

/**
 * Class for automating common workflows in projects
 */
export class WorkflowAutomation {
  private workflows: Workflow[] = [];
  private templates: WorkflowTemplate[] = [
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

  constructor() {
    // Initialize with some default workflows
    this.initDefaultWorkflows();
  }

  /**
   * Register a new workflow
   * @param workflow Workflow to register
   */
  public registerWorkflow(workflow: Workflow): void {
    // Check for duplicate triggers
    const existingIndex = this.workflows.findIndex(w => w.trigger === workflow.trigger);
    if (existingIndex !== -1) {
      this.workflows[existingIndex] = workflow; // Replace existing workflow
    } else {
      this.workflows.push(workflow); // Add new workflow
    }
  }

  /**
   * Execute a workflow by its trigger
   * @param trigger The workflow trigger
   * @param context Context data for the workflow
   */
  public async executeWorkflow(trigger: string, context: any = {}): Promise<void> {
    const workflow = this.workflows.find(w => w.trigger === trigger);
    if (!workflow) {
      console.log(`No workflow found for trigger: ${trigger}`);
      return;
    }

    try {
      await workflow.execute(context);
      vscode.window.showInformationMessage(`Workflow '${workflow.name}' executed successfully`);
    } catch (error) {
      vscode.window.showErrorMessage(`Workflow '${workflow.name}' failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get available workflows
   */
  public getAvailableWorkflows(): Workflow[] {
    return [...this.workflows];
  }

  /**
   * Initialize default workflows
   */
  private initDefaultWorkflows(): void {
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

  async setupWorkflow(project: Project, workflowId: string): Promise<void> {
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

    vscode.window.showInformationMessage(
      `${template.name} workflow has been set up for your project`
    );
  }

  getAvailableWorkflowTemplates(): WorkflowTemplate[] {
    return this.templates;
  }
}

/**
 * Interface for workflow definitions
 */
export interface Workflow {
  name: string;
  description: string;
  trigger: string;
  execute: (context: any) => Promise<void>;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  files: WorkflowFile[];
}

interface WorkflowFile {
  path: string;
  content: string;
}