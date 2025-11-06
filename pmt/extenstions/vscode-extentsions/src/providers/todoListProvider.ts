import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class TodoListProvider implements vscode.TreeDataProvider<TodoItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TodoItem | undefined | null | void> = new vscode.EventEmitter<TodoItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TodoItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  private todos: TodoItem[] = [];
  private storageFile: string;

  constructor(_context: vscode.ExtensionContext) {
    this.storageFile = path.join(_context.globalStorageUri.fsPath, 'todos.json');
    this.loadTodos();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TodoItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TodoItem): Thenable<TodoItem[]> {
    if (element) {
      return Promise.resolve([]);
    } else {
      return Promise.resolve(this.todos);
    }
  }

  private loadTodos() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = JSON.parse(fs.readFileSync(this.storageFile, 'utf8'));
        this.todos = data.map((item: any) => new TodoItem(
          item.label,
          item.completed ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.None,
          item.completed || false,
          item.created ? new Date(item.created) : new Date(),
          item.priority || 'medium'
        ));
      }
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  }

  private saveTodos() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Save todos
      fs.writeFileSync(this.storageFile, JSON.stringify(
        this.todos.map(item => ({
          label: item.label,
          completed: item.completed,
          created: item.created.toISOString(),
          priority: item.priority
        }))
      ), 'utf8');
    } catch (error) {
      console.error('Error saving todos:', error);
      vscode.window.showErrorMessage('Failed to save todo items');
    }
  }

  async addTodoItem() {
    const todoText = await vscode.window.showInputBox({ 
      prompt: 'Enter a new todo item',
      placeHolder: 'Example: Implement feature X'
    });
    
    if (!todoText) return;
    
    const priorityOptions = ['high', 'medium', 'low'];
    const priority = await vscode.window.showQuickPick(priorityOptions, {
      placeHolder: 'Select priority'
    }) || 'medium';
    
    this.todos.push(new TodoItem(todoText, vscode.TreeItemCollapsibleState.None, false, new Date(), priority));
    this.saveTodos();
    this.refresh();
  }

  completeTodoItem(item: TodoItem) {
    item.completed = !item.completed;
    item.updateIcon();
    this.saveTodos();
    this.refresh();
  }

  async continuePreviousDayTasks() {
    // Find tasks from previous days that are not completed
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayTodos = this.todos.filter(todo => 
      !todo.completed && 
      todo.created.setHours(0, 0, 0, 0) <= yesterday.setHours(0, 0, 0, 0)
    );
    
    if (yesterdayTodos.length === 0) {
      vscode.window.showInformationMessage('No incomplete tasks from previous days to continue.');
      return;
    }
    
    const result = await vscode.window.showInformationMessage(
      `Found ${yesterdayTodos.length} incomplete tasks from previous days. Continue with them?`,
      'Yes', 'No'
    );
    
    if (result === 'Yes') {
      // Create a summary of pending tasks
      const taskSummary = yesterdayTodos
        .map(todo => `- ${todo.label}`)
        .join('\n');
      
      vscode.workspace.openTextDocument({ content: `# Tasks to continue from previous days\n\n${taskSummary}` })
        .then(doc => vscode.window.showTextDocument(doc));
    }
  }
}

export class TodoItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public completed: boolean = false,
    public created: Date = new Date(),
    public priority: string = 'medium'
  ) {
    super(label, collapsibleState);
    this.updateIcon();
    
    this.tooltip = this.getTooltip();
    this.description = this.getDescription();
    
    this.command = {
      command: 'pmt.completeTodo',
      title: 'Toggle Completion',
      arguments: [this]
    };
  }

  updateIcon() {
    if (this.completed) {
      this.iconPath = new vscode.ThemeIcon('check');
    } else {
      switch (this.priority) {
        case 'high':
          this.iconPath = new vscode.ThemeIcon('warning');
          break;
        case 'low':
          this.iconPath = new vscode.ThemeIcon('arrow-down');
          break;
        default: // medium
          this.iconPath = new vscode.ThemeIcon('dash');
      }
    }
  }
  
  private getTooltip(): string {
    const date = this.created.toLocaleDateString();
    const status = this.completed ? 'Completed' : 'Not completed';
    return `${this.label}\nCreated: ${date}\nStatus: ${status}\nPriority: ${this.priority}`;
  }
  
  private getDescription(): string {
    const date = this.created.toLocaleDateString();
    return this.completed ? `✓ (${date})` : `(${date})`;
  }

  contextValue = 'todoItem';
}