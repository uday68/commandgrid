// src/features/gamification.ts
import * as vscode from 'vscode';

export class GamificationEngine {
  private achievements: Achievement[] = [];
  private userStats: UserStats = {
    streakDays: 0,
    lastActiveDate: new Date(),
    points: 0,
    badges: []
  };

  constructor(private _context: vscode.ExtensionContext) {
    this.loadAchievements();
    this.loadUserStats();
  }

  public trackAction(action: string): void {
    this.updateStreak();
    
    const achievement = this.achievements.find(a => a.triggerAction === action);
    if (achievement) {
      this.userStats.points += achievement.points;
      
      if (!this.userStats.badges.includes(achievement.badgeId)) {
        this.userStats.badges.push(achievement.badgeId);
        this.showBadgeNotification(achievement);
      }
      
      this.saveUserStats();
    }
  }

  private updateStreak(): void {
    const today = new Date().toDateString();
    const lastActive = this.userStats.lastActiveDate.toDateString();
    
    if (today === lastActive) return;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (yesterday.toDateString() === lastActive) {
      this.userStats.streakDays++;
    } else {
      this.userStats.streakDays = 1;
    }
    
    this.userStats.lastActiveDate = new Date();
    this.checkStreakAchievements();
  }

  private checkStreakAchievements(): void {
    const streakAchievements = this.achievements.filter(a => a.type === 'streak');
    
    for (const achievement of streakAchievements) {
      if (this.userStats.streakDays >= (achievement.threshold || 0) && 
          !this.userStats.badges.includes(achievement.badgeId)) {
        this.userStats.badges.push(achievement.badgeId);
        this.showBadgeNotification(achievement);
      }
    }
  }

  private showBadgeNotification(achievement: Achievement): void {
    vscode.window.showInformationMessage(
      `🏆 Achievement Unlocked: ${achievement.name}`,
      'View Achievements'
    ).then(selection => {
      if (selection === 'View Achievements') {
        this.showAchievementsDashboard();
      }
    });
  }

  private loadAchievements(): void {
    this.achievements = [
      {
        id: 'first-project',
        name: 'Project Starter',
        description: 'Created your first project',
        triggerAction: 'projectCreated',
        badgeId: 'project-starter',
        points: 50,
        type: 'one-time'
      },
      {
        id: '7-day-streak',
        name: 'Consistent Contributor',
        description: 'Worked on project for 7 consecutive days',
        triggerAction: 'dailyActive',
        badgeId: '7-day-streak',
        points: 100,
        type: 'streak',
        threshold: 7
      }
    ];
  }

  private loadUserStats(): void {
    // Load from extension storage
    try {
      const stats = this._context.globalState.get<UserStats>('gamification.userStats');
      if (stats) {
        // Convert stored date string back to Date object
        stats.lastActiveDate = new Date(stats.lastActiveDate);
        this.userStats = stats;
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
      // Keep default values on failure
    }
  }

  private saveUserStats(): void {
    // Save to extension storage
    try {
      this._context.globalState.update('gamification.userStats', this.userStats);
    } catch (error) {
      console.error('Failed to save user stats:', error);
      vscode.window.showErrorMessage('Failed to save achievement progress');
    }
  }

  private showAchievementsDashboard(): void {
    // Create and show webview with achievements
    const panel = vscode.window.createWebviewPanel(
      'achievementsDashboard',
      'Achievements Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    
    panel.webview.html = this.generateAchievementsHtml();
  }
  
  /**
   * Get user points total
   */
  public getPoints(): number {
    return this.userStats.points;
  }
  
  /**
   * Get current streak days
   */
  public getStreak(): number {
    this.updateStreak(); // Make sure streak is current
    return this.userStats.streakDays;
  }
  
  /**
   * Get all earned badges
   */
  public getEarnedBadges(): string[] {
    return [...this.userStats.badges];
  }
  
  /**
   * Generate HTML for achievements dashboard
   */
  private generateAchievementsHtml(): string {
    const earnedBadges = this.userStats.badges;
    
    const badgeHtml = this.achievements.map(achievement => {
      const earned = earnedBadges.includes(achievement.badgeId);
      return `
        <div class="achievement ${earned ? 'earned' : 'locked'}">
          <div class="badge">${earned ? '🏆' : '🔒'}</div>
          <div class="details">
            <h3>${achievement.name}</h3>
            <p>${achievement.description}</p>
            <span class="points">+${achievement.points} pts</span>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Achievements</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .stats { margin-bottom: 20px; }
          .achievement { 
            display: flex; 
            margin-bottom: 10px; 
            padding: 10px; 
            border-radius: 5px; 
          }
          .earned { background-color: rgba(0, 255, 0, 0.1); }
          .locked { background-color: rgba(0, 0, 0, 0.05); opacity: 0.7; }
          .badge { font-size: 24px; margin-right: 10px; }
          .points { font-weight: bold; color: green; }
          h1, h2 { color: #333; }
        </style>
      </head>
      <body>
        <h1>Achievements Dashboard</h1>
        <div class="stats">
          <h2>Your Stats</h2>
          <p>Points: ${this.userStats.points}</p>
          <p>Current Streak: ${this.userStats.streakDays} days</p>
          <p>Badges Earned: ${earnedBadges.length} / ${this.achievements.length}</p>
        </div>
        <h2>Achievements</h2>
        <div class="achievements-list">
          ${badgeHtml}
        </div>
      </body>
      </html>
    `;
  }
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  triggerAction: string;
  badgeId: string;
  points: number;
  type: 'one-time' | 'streak' | 'recurring';
  threshold?: number;
}

interface UserStats {
  streakDays: number;
  lastActiveDate: Date;
  points: number;
  badges: string[];
}