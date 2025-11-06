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
exports.ThemeManager = void 0;
// src/features/themeManager.ts
const vscode = __importStar(require("vscode"));
class ThemeManager {
    constructor(context) {
        this.context = context;
        this.themeStylesMap = {
            'light': {
                backgroundColor: '#ffffff',
                textColor: '#333333',
                accentColor: '#0066cc',
                borderColor: '#dddddd'
            },
            'dark': {
                backgroundColor: '#1e1e1e',
                textColor: '#d4d4d4',
                accentColor: '#007acc',
                borderColor: '#444444'
            },
            'high-contrast': {
                backgroundColor: '#000000',
                textColor: '#ffffff',
                accentColor: '#ffff00',
                borderColor: '#ffffff'
            }
        };
        // Initialize with saved theme or default to VS Code's current theme
        const savedTheme = this.getCurrentTheme();
        this.applyTheme(savedTheme);
    }
    /**
     * Apply a theme to the extension
     * @param themeName The name of the theme to apply
     */
    applyTheme(themeName) {
        // Validate theme name
        if (!this.getAvailableThemes().includes(themeName)) {
            console.warn(`Invalid theme name: ${themeName}, falling back to dark theme`);
            themeName = 'dark';
        }
        console.log(`Applying theme: ${themeName}`);
        // Save theme preference
        this.context.globalState.update('selectedTheme', themeName);
        // Apply theme-specific workbench colors
        this.updateWorkbenchColors(themeName);
        // Notify that theme has changed (useful if other components need to react)
        vscode.commands.executeCommand('projectJourney.themeChanged', themeName);
    }
    /**
     * Get the currently applied theme
     */
    getCurrentTheme() {
        const savedTheme = this.context.globalState.get('selectedTheme');
        if (savedTheme && this.getAvailableThemes().includes(savedTheme)) {
            return savedTheme;
        }
        // Detect VS Code's current theme if no saved preference
        const vsCodeTheme = vscode.window.activeColorTheme;
        if (vsCodeTheme.kind === vscode.ColorThemeKind.Light) {
            return 'light';
        }
        else if (vsCodeTheme.kind === vscode.ColorThemeKind.HighContrast) {
            return 'high-contrast';
        }
        else {
            return 'dark';
        }
    }
    /**
     * Get list of available themes
     */
    getAvailableThemes() {
        return Object.keys(this.themeStylesMap);
    }
    /**
     * Get styles for the current theme
     */
    getCurrentThemeStyles() {
        const currentTheme = this.getCurrentTheme();
        return this.themeStylesMap[currentTheme];
    }
    /**
     * Update VS Code workbench colors based on theme
     */
    updateWorkbenchColors(themeName) {
        const themeStyles = this.themeStylesMap[themeName];
        if (!themeStyles) {
            return;
        }
        // Update workbench colors through the workspace configuration
        const colorCustomizations = {};
        // Set workbench colors based on theme
        if (themeName === 'light') {
            colorCustomizations['activityBar.background'] = '#f8f8f8';
            colorCustomizations['editor.background'] = themeStyles.backgroundColor;
            colorCustomizations['editor.foreground'] = themeStyles.textColor;
        }
        else if (themeName === 'dark') {
            colorCustomizations['activityBar.background'] = '#252526';
            colorCustomizations['editor.background'] = themeStyles.backgroundColor;
            colorCustomizations['editor.foreground'] = themeStyles.textColor;
        }
        else if (themeName === 'high-contrast') {
            colorCustomizations['activityBar.background'] = '#000000';
            colorCustomizations['editor.background'] = themeStyles.backgroundColor;
            colorCustomizations['editor.foreground'] = themeStyles.textColor;
            colorCustomizations['editor.lineHighlightBackground'] = '#ffffff33';
        }
        // Only update colors specific to our extension to avoid disrupting user's theme
        const config = vscode.workspace.getConfiguration('projectJourney');
        config.update('themeColors', colorCustomizations, vscode.ConfigurationTarget.Global);
        // Store current theme in extension state for easy access
        this.context.workspaceState.update('currentTheme', {
            name: themeName,
            styles: themeStyles
        });
    }
}
exports.ThemeManager = ThemeManager;
//# sourceMappingURL=themeManager.js.map