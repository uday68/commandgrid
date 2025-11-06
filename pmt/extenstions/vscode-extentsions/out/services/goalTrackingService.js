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
exports.GoalTrackingService = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Service for tracking project and individual goals
 */
class GoalTrackingService {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.goals = [];
        this.loadGoals();
    }
    /**
     * Get tree item representation of the element
     */
    getTreeItem(element) {
        return element;
    }
    /**
     * Get children of the element
     */
    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }
        else {
            return Promise.resolve(this.getGoalItems());
        }
    }
    /**
     * Create a new goal
     */
    async createNewGoal() {
        const title = await vscode.window.showInputBox({
            placeHolder: 'Goal title',
            prompt: 'Enter the title for your new goal'
        });
        if (!title)
            return; // User cancelled
        const description = await vscode.window.showInputBox({
            placeHolder: 'Goal description',
            prompt: 'Enter a description for this goal'
        }) || '';
        const targetInput = await vscode.window.showInputBox({
            placeHolder: 'Target value (numeric)',
            prompt: 'Enter the target value to achieve'
        });
        if (!targetInput)
            return;
        const target = parseInt(targetInput, 10);
        const unit = await vscode.window.showInputBox({
            placeHolder: 'Unit (e.g., hours, tasks, etc.)',
            prompt: 'Enter the unit of measurement'
        }) || '';
        const newGoal = {
            id: Date.now().toString(),
            title,
            description,
            target,
            current: 0,
            unit,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.goals.push(newGoal);
        this.saveGoals();
        this._onDidChangeTreeData.fire();
    }
    /**
     * Track progress for a goal
     */
    async trackProgress() {
        if (this.goals.length === 0) {
            vscode.window.showInformationMessage('No goals to track. Create a goal first.');
            return;
        }
        const goalItems = this.goals.map(goal => ({
            label: goal.title,
            description: `${goal.current}/${goal.target} ${goal.unit}`,
            goal
        }));
        const selected = await vscode.window.showQuickPick(goalItems, {
            placeHolder: 'Select a goal to update progress'
        });
        if (!selected)
            return;
        const progressInput = await vscode.window.showInputBox({
            placeHolder: 'Progress value to add',
            prompt: `Enter progress to add to current value (${selected.goal.current})`
        });
        if (!progressInput)
            return;
        const progressToAdd = parseInt(progressInput, 10);
        // Update the selected goal
        const goalIndex = this.goals.findIndex(g => g.id === selected.goal.id);
        if (goalIndex !== -1) {
            this.goals[goalIndex].current += progressToAdd;
            this.goals[goalIndex].updatedAt = new Date();
            // Check if the goal is completed
            if (this.goals[goalIndex].current >= this.goals[goalIndex].target) {
                this.goals[goalIndex].completed = true;
                vscode.window.showInformationMessage(`Congratulations! Goal "${this.goals[goalIndex].title}" has been completed!`);
            }
            this.saveGoals();
            this._onDidChangeTreeData.fire();
        }
    }
    /**
     * Get formatted tree items for goals
     */
    getGoalItems() {
        return this.goals.map(goal => {
            const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
            const label = `${goal.title} (${progress}%)`;
            const item = new GoalItem(label, goal.completed ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
            item.description = `${goal.current}/${goal.target} ${goal.unit}`;
            item.tooltip = new vscode.MarkdownString(`**${goal.title}**\n\n${goal.description}\n\nProgress: ${progress}%`);
            item.iconPath = goal.completed
                ? new vscode.ThemeIcon('check')
                : new vscode.ThemeIcon('circle-outline');
            return item;
        });
    }
    /**
     * Save goals to extension storage
     */
    saveGoals() {
        this.context.globalState.update('pmt.goals', this.goals);
    }
    /**
     * Load goals from extension storage
     */
    loadGoals() {
        const savedGoals = this.context.globalState.get('pmt.goals');
        if (savedGoals) {
            // Convert date strings back to Date objects
            this.goals = savedGoals.map(goal => ({
                ...goal,
                createdAt: new Date(goal.createdAt),
                updatedAt: new Date(goal.updatedAt),
                deadline: goal.deadline ? new Date(goal.deadline) : undefined
            }));
        }
    }
}
exports.GoalTrackingService = GoalTrackingService;
/**
 * Tree item representing a goal
 */
class GoalItem extends vscode.TreeItem {
    constructor(label, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.contextValue = 'goal';
    }
}
//# sourceMappingURL=goalTrackingService.js.map