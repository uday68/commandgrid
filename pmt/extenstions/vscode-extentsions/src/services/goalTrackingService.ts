import * as vscode from 'vscode';

/**
 * Interface for goal data
 */
export interface Goal {
  id: string;
  title: string;
  description: string;
  target: number; 
  current: number;
  unit: string;
  deadline?: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service for tracking project and individual goals
 */
export class GoalTrackingService implements vscode.TreeDataProvider<GoalItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<GoalItem | undefined | null | void> = new vscode.EventEmitter<GoalItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<GoalItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  private goals: Goal[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.loadGoals();
  }

  /**
   * Get tree item representation of the element
   */
  getTreeItem(element: GoalItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children of the element
   */
  getChildren(element?: GoalItem): Thenable<GoalItem[]> {
    if (element) {
      return Promise.resolve([]);
    } else {
      return Promise.resolve(this.getGoalItems());
    }
  }

  /**
   * Create a new goal
   */
  async createNewGoal(): Promise<void> {
    const title = await vscode.window.showInputBox({
      placeHolder: 'Goal title',
      prompt: 'Enter the title for your new goal'
    });

    if (!title) return; // User cancelled

    const description = await vscode.window.showInputBox({
      placeHolder: 'Goal description',
      prompt: 'Enter a description for this goal'
    }) || '';

    const targetInput = await vscode.window.showInputBox({
      placeHolder: 'Target value (numeric)',
      prompt: 'Enter the target value to achieve'
    });

    if (!targetInput) return;
    const target = parseInt(targetInput, 10);

    const unit = await vscode.window.showInputBox({
      placeHolder: 'Unit (e.g., hours, tasks, etc.)',
      prompt: 'Enter the unit of measurement'
    }) || '';

    const newGoal: Goal = {
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
  async trackProgress(): Promise<void> {
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

    if (!selected) return;

    const progressInput = await vscode.window.showInputBox({
      placeHolder: 'Progress value to add',
      prompt: `Enter progress to add to current value (${selected.goal.current})`
    });

    if (!progressInput) return;
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
  private getGoalItems(): GoalItem[] {
    return this.goals.map(goal => {
      const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
      const label = `${goal.title} (${progress}%)`;
      
      const item = new GoalItem(
        label,
        goal.completed ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed
      );

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
  private saveGoals(): void {
    this.context.globalState.update('pmt.goals', this.goals);
  }

  /**
   * Load goals from extension storage
   */
  private loadGoals(): void {
    const savedGoals = this.context.globalState.get<Goal[]>('pmt.goals');
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

/**
 * Tree item representing a goal
 */
class GoalItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.contextValue = 'goal';
  }
}