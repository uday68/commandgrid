import * as vscode from 'vscode';
import * as path from 'path';
/**
 * Interface for task automation rule
 */
export interface AutomationRule {
  id: string;
  name: string;
  eventType: 'file-changed' | 'git-commit' | 'schedule' | 'task-completed';
  condition: RuleCondition;
  actions: RuleAction[];
  enabled: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

/**
 * Interface for rule conditions
 */
export interface RuleCondition {
  type: 'file-pattern' | 'branch-name' | 'task-tag' | 'time-of-day' | 'always';
  pattern?: string;
  value?: string;
}

/**
 * Interface for rule actions
 */
export interface RuleAction {
  type: 'run-command' | 'create-task' | 'notify' | 'update-task-status';
  command?: string;
  message?: string;
  taskTitle?: string;
  taskStatus?: string;
  taskId?: string;
}

/**
 * Service for task automation and workflow management
 */
export class TaskAutomationService {
  private rules: AutomationRule[] = [];
  private disposables: vscode.Disposable[] = [];
  
  constructor(private context: vscode.ExtensionContext) {
    this.loadRules();
    this.setupEventListeners();
  }

  /**
   * Create a new automation rule
   */
  async createAutomation(): Promise<void> {
    // Step 1: Get rule name
    const name = await vscode.window.showInputBox({
      prompt: 'Enter a name for this automation rule',
      placeHolder: 'Rule Name'
    });

    if (!name) return; // User cancelled

    // Step 2: Select event type
    const eventType = await vscode.window.showQuickPick(
      [
        { label: 'File Changed', description: 'Trigger when specific files are modified', value: 'file-changed' },
        { label: 'Git Commit', description: 'Trigger on Git commit', value: 'git-commit' },
        { label: 'Schedule', description: 'Trigger at specified times', value: 'schedule' },
        { label: 'Task Completed', description: 'Trigger when a task is completed', value: 'task-completed' }
      ],
      { placeHolder: 'Select when this automation should run' }
    );

    if (!eventType) return; // User cancelled

    // Step 3: Configure condition based on event type
    const condition = await this.configureCondition(eventType.value as 'file-changed' | 'git-commit' | 'schedule' | 'task-completed');
    if (!condition) return; // User cancelled

    // Step 4: Configure action
    const action = await this.configureAction();
    if (!action) return; // User cancelled

    // Create and save the new rule
    const newRule: AutomationRule = {
      id: Date.now().toString(),
      name,
      eventType: eventType.value as 'file-changed' | 'git-commit' | 'schedule' | 'task-completed',
      condition,
      actions: [action],
      enabled: true,
      createdAt: new Date()
    };

    this.rules.push(newRule);
    this.saveRules();
    
    vscode.window.showInformationMessage(`Automation rule "${name}" created successfully`);
  }

  /**
   * Configure rule condition
   */
  private async configureCondition(eventType: 'file-changed' | 'git-commit' | 'schedule' | 'task-completed'): Promise<RuleCondition | undefined> {
    switch (eventType) {
      case 'file-changed': {
        const pattern = await vscode.window.showInputBox({
          prompt: 'Enter a file pattern (e.g., *.ts, src/**/*.js)',
          placeHolder: 'File pattern'
        });
        if (!pattern) return undefined;
        return { type: 'file-pattern', pattern };
      }
      
      case 'git-commit': {
        const branch = await vscode.window.showInputBox({
          prompt: 'Enter a branch name pattern (leave empty for all branches)',
          placeHolder: 'Branch pattern (e.g., main, feature/*)'
        });
        return { type: 'branch-name', pattern: branch || '*' };
      }
      
      case 'schedule': {
        const timeValue = await vscode.window.showInputBox({
          prompt: 'Enter time of day (24h format, e.g., 09:00, 14:30)',
          placeHolder: 'Time of day',
          validateInput: (input) => {
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(input) ? null : 'Please enter a valid time in 24h format (e.g., 09:00)';
          }
        });
        if (!timeValue) return undefined;
        return { type: 'time-of-day', value: timeValue };
      }
      
      case 'task-completed': {
        const tag = await vscode.window.showInputBox({
          prompt: 'Enter a task tag (leave empty for any task)',
          placeHolder: 'Task tag (e.g., "important", "backend")'
        });
        return { type: 'task-tag', value: tag || '' };
      }
      
      default:
        return { type: 'always' };
    }
  }

  /**
   * Configure rule action
   */
  private async configureAction(): Promise<RuleAction | undefined> {
    const actionType = await vscode.window.showQuickPick(
      [
        { label: 'Run Command', description: 'Execute a terminal command', value: 'run-command' },
        { label: 'Create Task', description: 'Create a new task', value: 'create-task' },
        { label: 'Show Notification', description: 'Display a notification', value: 'notify' },
        { label: 'Update Task Status', description: 'Change status of existing task', value: 'update-task-status' }
      ],
      { placeHolder: 'Select action to perform' }
    );

    if (!actionType) return undefined;

    switch (actionType.value) {
      case 'run-command': {
        const command = await vscode.window.showInputBox({
          prompt: 'Enter command to execute',
          placeHolder: 'Command (e.g., npm test, git pull)'
        });
        if (!command) return undefined;
        return { type: 'run-command', command };
      }
      
      case 'create-task': {
        const taskTitle = await vscode.window.showInputBox({
          prompt: 'Enter task title',
          placeHolder: 'Task title'
        });
        if (!taskTitle) return undefined;
        return { type: 'create-task', taskTitle };
      }
      
      case 'notify': {
        const message = await vscode.window.showInputBox({
          prompt: 'Enter notification message',
          placeHolder: 'Message text'
        });
        if (!message) return undefined;
        return { type: 'notify', message };
      }
      
      case 'update-task-status': {
        const taskId = await vscode.window.showInputBox({
          prompt: 'Enter task ID (or leave empty to select when triggered)',
          placeHolder: 'Task ID'
        });
        
        const taskStatus = await vscode.window.showQuickPick(
          ['To Do', 'In Progress', 'Completed'],
          { placeHolder: 'Select new status' }
        );
        if (!taskStatus) return undefined;
        
        return { 
          type: 'update-task-status',
          taskId: taskId || undefined,
          taskStatus
        };
      }
      
      default:
        return undefined;
    }
  }

  /**
   * Process file change event
   */
  private onFileChanged(uri: vscode.Uri): void {
    const relevantRules = this.rules.filter(rule => 
      rule.enabled && 
      rule.eventType === 'file-changed' && 
      this.matchesFilePattern(uri.fsPath, rule.condition.pattern || '')
    );

    for (const rule of relevantRules) {
      this.executeRule(rule, { filePath: uri.fsPath });
    }
  }

  /**
   * Check if file path matches pattern
   */
  private matchesFilePattern(filePath: string, pattern: string): boolean {
    // Simple pattern matching implementation
    if (pattern === '*') return true;
    
    const fileName = path.basename(filePath);
    
    // Check for exact matches
    if (pattern === fileName) return true;
    
    // Check for extension matches (*.ext)
    if (pattern.startsWith('*.')) {
      const ext = pattern.substring(2);
      return fileName.endsWith(`.${ext}`);
    }
    
    // Check for directory pattern (dir/**)
    if (pattern.endsWith('/**')) {
      const dir = pattern.substring(0, pattern.length - 3);
      return filePath.includes(dir);
    }
    
    return false;
  }

  /**
   * Execute automation rule
   */
  private async executeRule(rule: AutomationRule, context: any = {}): Promise<void> {
    console.log(`Executing rule: ${rule.name}`);
    
    // Update last triggered time
    rule.lastTriggered = new Date();
    this.saveRules();
    
    // Execute all actions
    for (const action of rule.actions) {
      await this.executeAction(action, context);
    }
  }

  /**
   * Execute a rule action
   */
  private async executeAction(action: RuleAction, _context: any = {}): Promise<void> {
    switch (action.type) {
      case 'run-command':
        if (action.command) {
          const terminal = vscode.window.createTerminal('Task Automation');
          terminal.show();
          terminal.sendText(action.command);
        }
        break;
        
      case 'notify':
        if (action.message) {
          vscode.window.showInformationMessage(action.message);
        }
        break;
        
      case 'create-task':
        if (action.taskTitle) {
          // Here we would integrate with a task management system
          // For now, we'll just show a notification
          vscode.window.showInformationMessage(`Would create task: ${action.taskTitle}`);
        }
        break;
        
      case 'update-task-status':
        // Here we would integrate with a task management system
        // For now, we'll just show a notification
        vscode.window.showInformationMessage(
          `Would update task ${action.taskId || 'selected task'} to status: ${action.taskStatus}`
        );
        break;
    }
  }

  /**
   * Set up event listeners for automation triggers
   */
  private setupEventListeners(): void {
    // File watcher for file-changed events
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
    fileWatcher.onDidChange(this.onFileChanged.bind(this));
    fileWatcher.onDidCreate(this.onFileChanged.bind(this));
    
    this.disposables.push(fileWatcher);
    
    // Set up other event listeners as needed
    // For scheduled tasks, we would need a timer
    setInterval(() => this.checkScheduledRules(), 60000); // Check every minute
  }

  /**
   * Check for scheduled rules that should run
   */
  private checkScheduledRules(): void {
    // Get current time
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Find scheduled rules for current time
    const scheduledRules = this.rules.filter(rule => 
      rule.enabled && 
      rule.eventType === 'schedule' && 
      rule.condition.value === currentTimeStr
    );
    
    // Execute matching rules
    for (const rule of scheduledRules) {
      this.executeRule(rule);
    }
  }

  /**
   * Load saved automation rules
   */
  private loadRules(): void {
    const savedRules = this.context.globalState.get<AutomationRule[]>('taskAutomation.rules');
    if (savedRules) {
      // Convert date strings back to Date objects
      this.rules = savedRules.map(rule => ({
        ...rule,
        createdAt: new Date(rule.createdAt),
        lastTriggered: rule.lastTriggered ? new Date(rule.lastTriggered) : undefined
      }));
    }
  }

  /**
   * Save automation rules
   */
  private saveRules(): void {
    this.context.globalState.update('taskAutomation.rules', this.rules);
  }

  /**
   * List all automation rules
   */
  async listRules(): Promise<void> {
    if (this.rules.length === 0) {
      vscode.window.showInformationMessage('No automation rules defined yet');
      return;
    }
    
    const ruleItems = this.rules.map(rule => ({
      label: rule.name,
      description: rule.enabled ? 'Enabled' : 'Disabled',
      detail: `Trigger: ${rule.eventType}, Actions: ${rule.actions.length}`,
      rule
    }));
    
    const selected = await vscode.window.showQuickPick(ruleItems, {
      placeHolder: 'Select a rule to manage'
    });
    
    if (selected) {
      this.manageRule(selected.rule);
    }
  }

  /**
   * Manage an existing rule
   */
  private async manageRule(rule: AutomationRule): Promise<void> {
    const action = await vscode.window.showQuickPick(
      [
        { label: rule.enabled ? 'Disable' : 'Enable', value: 'toggle' },
        { label: 'Delete', value: 'delete' },
        { label: 'Run Now', value: 'run' },
        { label: 'Edit', value: 'edit' }
      ],
      { placeHolder: `Manage rule: ${rule.name}` }
    );
    
    if (!action) return;
    
    switch (action.value) {
      case 'toggle':
        rule.enabled = !rule.enabled;
        this.saveRules();
        vscode.window.showInformationMessage(`Rule "${rule.name}" is now ${rule.enabled ? 'enabled' : 'disabled'}`);
        break;
        
      case 'delete':
        const confirmDelete = await vscode.window.showWarningMessage(
          `Are you sure you want to delete the rule "${rule.name}"?`,
          'Yes', 'No'
        );
        
        if (confirmDelete === 'Yes') {
          this.rules = this.rules.filter(r => r.id !== rule.id);
          this.saveRules();
          vscode.window.showInformationMessage(`Rule "${rule.name}" deleted`);
        }
        break;
        
      case 'run':
        await this.executeRule(rule);
        vscode.window.showInformationMessage(`Rule "${rule.name}" executed manually`);
        break;
        
      case 'edit':
        // Editing functionality would be added here
        vscode.window.showInformationMessage('Rule editing not implemented yet');
        break;
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}