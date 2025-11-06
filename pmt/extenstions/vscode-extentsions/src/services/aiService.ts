import * as vscode from 'vscode';
import { Task, Project } from '../models/project';

/**
 * Interface for complexity estimates of tasks
 */
export interface ComplexityEstimate {
  score: number; // 1-10
  timeEstimate: string;
  factors: string[];
  confidence: number; // 0-1
}

/**
 * Interface for dependency analysis results
 */
export interface DependencyAnalysis {
  dependencies: {source: string, target: string}[];
  suggestedOrder: string[];
  potentialBlockers: string[];
  parallelizableTasks: string[][];
}

/**
 * Service for AI-powered features in the extension
 */
export class AIService {
  private context: vscode.ExtensionContext;
  private apiEndpoint: string | undefined;
  private apiKey: string | undefined;
  
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadConfiguration();
  }
  
  /**
   * Load API configuration from workspace settings
   */
  private loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('pmt');
    this.apiEndpoint = config.get('aiEndpoint') as string;
    
    // Try to get API key from secure storage
    this.getApiKey().then(key => {
      this.apiKey = key;
      // Ensure apiEndpoint is configured
      if (!this.apiEndpoint) {
        vscode.window.showWarningMessage('AI endpoint not configured. Some AI features may not be available.');
      }
    });
  }
  
  /**
   * Get API key from secure storage or ask user to provide it
   */
  private async getApiKey(): Promise<string | undefined> {
    let apiKey = await this.context.secrets.get('pmt.aiApiKey');
    
    if (!apiKey) {
      apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your AI API Key for the Project Management Tool',
        password: true,
        ignoreFocusOut: true
      });
      
      if (apiKey) {
        await this.context.secrets.store('pmt.aiApiKey', apiKey);
      }
    }
    
    return apiKey;
  }
  
  /**
   * Make an API request to the AI service
   * @param endpoint The endpoint to call
   * @param _data The data to send
   */
  private async makeApiRequest<T>(endpoint: string, _data: any): Promise<T> {
    if (!this.apiKey || !this.apiEndpoint) {
      throw new Error('API key or endpoint not configured');
    }
    
    try {
      // In a real implementation, this would be an actual fetch request
      // This is just a simulation
      console.log(`Making API request to ${this.apiEndpoint}${endpoint} with API key ${this.apiKey.substring(0, 3)}...`);
      
      // Simulate API response
      return Promise.resolve({} as T);
    } catch (error) {
      vscode.window.showErrorMessage(`API request failed: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Get AI-powered suggestions for a project
   * @param project The project to analyze
   * @returns An array of suggestions
   */
  async getSuggestions(project: Project): Promise<string[]> {
    try {
      if (!this.apiKey) {
        throw new Error('AI API Key not configured');
      }
      
      // Use the API endpoint in a call (simulated)
      if (this.apiEndpoint) {
        // This would be a real API call in production
        await this.makeApiRequest('/suggestions', { project });
      }
      
      // This is a placeholder implementation
      const suggestions = [
        'Consider breaking down large tasks into smaller ones for better tracking',
        'Some tasks might benefit from adding more detailed acceptance criteria',
        `The project "${project.name}" might need a clearer project goal`,
        'Add time estimates to tasks to improve planning',
        'Consider using milestones to track project progress'
      ];
      
      return suggestions;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to get suggestions: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Generate project documentation based on project structure
   * @param projectRoot The project root folder path
   * @param _includeFiles Whether to include file content in the analysis
   */
  async generateDocumentation(projectRoot: string, _includeFiles = false): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('AI API Key not configured');
      }
      
      // This is a placeholder implementation
      // In a real implementation, we'd send project data to an API
      return `# Project Documentation\n\nThis is AI-generated documentation for your project.\n\n## Structure\n\n- Generated: ${new Date().toLocaleDateString()}\n- Path: ${projectRoot}\n\n## Overview\n\nThis project appears to be a VS Code extension for project management.`;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to generate documentation: ${(error as Error).message}`);
      return '';
    }
  }
  
  /**
   * Suggest improvements for a specific file
   * @param fileContent The content of the file to analyze
   * @param filePath The path of the file
   */
  async suggestImprovements(): Promise<string[]> {
    try {
      if (!this.apiKey) {
        throw new Error('AI API Key not configured');
      }
      
      // This is a placeholder implementation
      return [
        'Consider adding more comprehensive error handling',
        'The function X could be optimized for better performance',
        'Documentation could be improved for better readability'
      ];
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to suggest improvements: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Analyze dependencies between tasks and suggest an optimal order
   * @param tasks Array of tasks to analyze
   */
  async analyzeDependencies(tasks: Task[]): Promise<DependencyAnalysis> {
    try {
      // For the MVP, this is a simple implementation that could later be enhanced with AI
      const dependencies: {source: string, target: string}[] = [];
      const taskMap = new Map<string, Task>();
      
      // Build task map and collect dependencies
      for (const task of tasks) {
        taskMap.set(task.id, task);
        
        if (task.dependencies) {
          for (const depId of task.dependencies) {
            dependencies.push({
              source: depId,
              target: task.id
            });
          }
        }
      }
      
      // Simple topological sort for suggested order
      const visited = new Set<string>();
      const result: string[] = [];
      
      const visit = (taskId: string) => {
        if (visited.has(taskId)) return;
        visited.add(taskId);
        
        const task = taskMap.get(taskId);
        if (task && task.dependencies) {
          for (const depId of task.dependencies) {
            visit(depId);
          }
        }
        
        result.push(taskId);
      };
      
      // Visit all tasks
      for (const task of tasks) {
        visit(task.id);
      }
      
      // Identify potential blockers (tasks with many dependents)
      const dependentCount = new Map<string, number>();
      for (const dep of dependencies) {
        const count = dependentCount.get(dep.source) || 0;
        dependentCount.set(dep.source, count + 1);
      }
      
      const potentialBlockers = Array.from(dependentCount.entries())
        .filter(([, count]) => count > 1)
        .sort(([, countA], [, countB]) => countB - countA)
        .map(([taskId]) => taskId);
      
      // Simple algorithm to find parallelizable tasks
      // (tasks that don't depend on each other)
      const parallelGroups: string[][] = [];
      const remaining = new Set(tasks.map(t => t.id));
      
      while (remaining.size > 0) {
        const group: string[] = [];
        const toRemove: string[] = [];
        
        for (const taskId of remaining) {
          const task = taskMap.get(taskId);
          if (!task) continue;
          
          // Check if this task depends on any task in the remaining set
          const canAdd = !task.dependencies || task.dependencies.every(depId => !remaining.has(depId) || toRemove.includes(depId));
          
          if (canAdd) {
            group.push(taskId);
            toRemove.push(taskId);
          }
        }
        
        if (group.length > 0) {
          parallelGroups.push(group);
          for (const id of toRemove) {
            remaining.delete(id);
          }
        } else {
          // Break dependency cycle if one exists
          const someId = Array.from(remaining)[0];
          parallelGroups.push([someId]);
          remaining.delete(someId);
        }
      }
      
      return {
        dependencies,
        suggestedOrder: result,
        potentialBlockers,
        parallelizableTasks: parallelGroups
      };
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to analyze dependencies: ${(error as Error).message}`);
      return {
        dependencies: [],
        suggestedOrder: [],
        potentialBlockers: [],
        parallelizableTasks: []
      };
    }
  }
  
  /**
   * Estimate the complexity of a task
   * @param task The task to analyze
   */
  async estimateTaskComplexity(task: Task): Promise<ComplexityEstimate> {
    try {
      if (!this.apiKey) {
        throw new Error('AI API Key not configured');
      }
      
      // Placeholder implementation - in a real extension, this would call an AI API
      // Calculate a simple complexity score based on description length and priority
      const descriptionLength = task.description ? task.description.length : 0;
      const priorityScore = 
        task.priority === 'critical' ? 4 :
        task.priority === 'high' ? 3 :
        task.priority === 'medium' ? 2 : 1;
      
      // Simple scoring algorithm for demo purposes
      const score = Math.min(10, Math.max(1, Math.ceil(
        (descriptionLength / 100) + priorityScore * 1.5
      )));
      
      const timeEstimate = 
        score <= 3 ? '2-4 hours' :
        score <= 5 ? '1-2 days' :
        score <= 8 ? '3-5 days' :
        '1-2 weeks';
      
      const factors = [
        score > 5 ? 'Complex task description' : 'Simple task description',
        task.priority === 'critical' || task.priority === 'high' ? 'High priority' : 'Lower priority',
        (task.dependencies || []).length > 2 ? 'Multiple dependencies' : 'Few dependencies'
      ];
      
      // Calculate a random confidence between 0.7 and 0.95
      const confidence = 0.7 + Math.random() * 0.25;
      
      return {
        score,
        timeEstimate,
        factors,
        confidence
      };
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to estimate task complexity: ${(error as Error).message}`);
      return {
        score: 5,
        timeEstimate: 'Unknown',
        factors: ['Error in estimation'],
        confidence: 0
      };
    }
  }
  
  /**
   * Generate daily summary of project status
   * @param _projectId The project ID
   */
  async generateDailySummary(_projectId: string): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('AI API Key not configured');
      }
      
      // This is a placeholder implementation
      return `# Daily Summary (${new Date().toLocaleDateString()})\n\n## Progress\n- 3 tasks completed yesterday\n- 2 tasks started today\n- No blockers reported\n\n## Recommendations\n- Consider reviewing the documentation\n- Team meeting suggested for tomorrow`;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to generate daily summary: ${(error as Error).message}`);
      return '';
    }
  }
}