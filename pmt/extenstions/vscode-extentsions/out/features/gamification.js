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
exports.GamificationEngine = void 0;
// src/features/gamification.ts
const vscode = __importStar(require("vscode"));
class GamificationEngine {
    constructor(_context) {
        this._context = _context;
        this.achievements = [];
        this.userStats = {
            streakDays: 0,
            lastActiveDate: new Date(),
            points: 0,
            badges: []
        };
        this.loadAchievements();
        this.loadUserStats();
    }
    trackAction(action) {
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
    updateStreak() {
        const today = new Date().toDateString();
        const lastActive = this.userStats.lastActiveDate.toDateString();
        if (today === lastActive)
            return;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (yesterday.toDateString() === lastActive) {
            this.userStats.streakDays++;
        }
        else {
            this.userStats.streakDays = 1;
        }
        this.userStats.lastActiveDate = new Date();
        this.checkStreakAchievements();
    }
    checkStreakAchievements() {
        const streakAchievements = this.achievements.filter(a => a.type === 'streak');
        for (const achievement of streakAchievements) {
            if (this.userStats.streakDays >= (achievement.threshold || 0) &&
                !this.userStats.badges.includes(achievement.badgeId)) {
                this.userStats.badges.push(achievement.badgeId);
                this.showBadgeNotification(achievement);
            }
        }
    }
    showBadgeNotification(achievement) {
        vscode.window.showInformationMessage(`🏆 Achievement Unlocked: ${achievement.name}`, 'View Achievements').then(selection => {
            if (selection === 'View Achievements') {
                this.showAchievementsDashboard();
            }
        });
    }
    loadAchievements() {
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
    loadUserStats() {
        // Load from extension storage
        try {
            const stats = this._context.globalState.get('gamification.userStats');
            if (stats) {
                // Convert stored date string back to Date object
                stats.lastActiveDate = new Date(stats.lastActiveDate);
                this.userStats = stats;
            }
        }
        catch (error) {
            console.error('Failed to load user stats:', error);
            // Keep default values on failure
        }
    }
    saveUserStats() {
        // Save to extension storage
        try {
            this._context.globalState.update('gamification.userStats', this.userStats);
        }
        catch (error) {
            console.error('Failed to save user stats:', error);
            vscode.window.showErrorMessage('Failed to save achievement progress');
        }
    }
    showAchievementsDashboard() {
        // Create and show webview with achievements
        const panel = vscode.window.createWebviewPanel('achievementsDashboard', 'Achievements Dashboard', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = this.generateAchievementsHtml();
    }
    /**
     * Get user points total
     */
    getPoints() {
        return this.userStats.points;
    }
    /**
     * Get current streak days
     */
    getStreak() {
        this.updateStreak(); // Make sure streak is current
        return this.userStats.streakDays;
    }
    /**
     * Get all earned badges
     */
    getEarnedBadges() {
        return [...this.userStats.badges];
    }
    /**
     * Generate HTML for achievements dashboard
     */
    generateAchievementsHtml() {
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
exports.GamificationEngine = GamificationEngine;
//# sourceMappingURL=gamification.js.map