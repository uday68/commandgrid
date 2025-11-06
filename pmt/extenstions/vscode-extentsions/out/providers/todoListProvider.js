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
exports.TodoItem = exports.TodoListProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TodoListProvider {
    constructor(_context) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.todos = [];
        this.storageFile = path.join(_context.globalStorageUri.fsPath, 'todos.json');
        this.loadTodos();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }
        else {
            return Promise.resolve(this.todos);
        }
    }
    loadTodos() {
        try {
            if (fs.existsSync(this.storageFile)) {
                const data = JSON.parse(fs.readFileSync(this.storageFile, 'utf8'));
                this.todos = data.map((item) => new TodoItem(item.label, item.completed ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.None, item.completed || false, item.created ? new Date(item.created) : new Date(), item.priority || 'medium'));
            }
        }
        catch (error) {
            console.error('Error loading todos:', error);
        }
    }
    saveTodos() {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.storageFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Save todos
            fs.writeFileSync(this.storageFile, JSON.stringify(this.todos.map(item => ({
                label: item.label,
                completed: item.completed,
                created: item.created.toISOString(),
                priority: item.priority
            }))), 'utf8');
        }
        catch (error) {
            console.error('Error saving todos:', error);
            vscode.window.showErrorMessage('Failed to save todo items');
        }
    }
    async addTodoItem() {
        const todoText = await vscode.window.showInputBox({
            prompt: 'Enter a new todo item',
            placeHolder: 'Example: Implement feature X'
        });
        if (!todoText)
            return;
        const priorityOptions = ['high', 'medium', 'low'];
        const priority = await vscode.window.showQuickPick(priorityOptions, {
            placeHolder: 'Select priority'
        }) || 'medium';
        this.todos.push(new TodoItem(todoText, vscode.TreeItemCollapsibleState.None, false, new Date(), priority));
        this.saveTodos();
        this.refresh();
    }
    completeTodoItem(item) {
        item.completed = !item.completed;
        item.updateIcon();
        this.saveTodos();
        this.refresh();
    }
    async continuePreviousDayTasks() {
        // Find tasks from previous days that are not completed
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayTodos = this.todos.filter(todo => !todo.completed &&
            todo.created.setHours(0, 0, 0, 0) <= yesterday.setHours(0, 0, 0, 0));
        if (yesterdayTodos.length === 0) {
            vscode.window.showInformationMessage('No incomplete tasks from previous days to continue.');
            return;
        }
        const result = await vscode.window.showInformationMessage(`Found ${yesterdayTodos.length} incomplete tasks from previous days. Continue with them?`, 'Yes', 'No');
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
exports.TodoListProvider = TodoListProvider;
class TodoItem extends vscode.TreeItem {
    constructor(label, collapsibleState, completed = false, created = new Date(), priority = 'medium') {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.completed = completed;
        this.created = created;
        this.priority = priority;
        this.contextValue = 'todoItem';
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
        }
        else {
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
    getTooltip() {
        const date = this.created.toLocaleDateString();
        const status = this.completed ? 'Completed' : 'Not completed';
        return `${this.label}\nCreated: ${date}\nStatus: ${status}\nPriority: ${this.priority}`;
    }
    getDescription() {
        const date = this.created.toLocaleDateString();
        return this.completed ? `✓ (${date})` : `(${date})`;
    }
}
exports.TodoItem = TodoItem;
//# sourceMappingURL=todoListProvider.js.map