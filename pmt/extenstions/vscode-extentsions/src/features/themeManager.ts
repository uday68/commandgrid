// src/features/themeManager.ts
import * as vscode from 'vscode';

export class ThemeManager {
  private themeStylesMap: Record<string, ThemeStyles> = {
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

  constructor(private context: vscode.ExtensionContext) {
    // Initialize with saved theme or default to VS Code's current theme
    const savedTheme = this.getCurrentTheme();
    this.applyTheme(savedTheme);
  }

  /**
   * Apply a theme to the extension
   * @param themeName The name of the theme to apply
   */
  public applyTheme(themeName: string): void {
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
  public getCurrentTheme(): string {
    const savedTheme = this.context.globalState.get<string>('selectedTheme');
    if (savedTheme && this.getAvailableThemes().includes(savedTheme)) {
      return savedTheme;
    }
    
    // Detect VS Code's current theme if no saved preference
    const vsCodeTheme = vscode.window.activeColorTheme;
    if (vsCodeTheme.kind === vscode.ColorThemeKind.Light) {
      return 'light';
    } else if (vsCodeTheme.kind === vscode.ColorThemeKind.HighContrast) {
      return 'high-contrast';
    } else {
      return 'dark';
    }
  }

  /**
   * Get list of available themes
   */
  public getAvailableThemes(): string[] {
    return Object.keys(this.themeStylesMap);
  }

  /**
   * Get styles for the current theme
   */
  public getCurrentThemeStyles(): ThemeStyles {
    const currentTheme = this.getCurrentTheme();
    return this.themeStylesMap[currentTheme];
  }

  /**
   * Update VS Code workbench colors based on theme
   */
  private updateWorkbenchColors(themeName: string): void {
    const themeStyles = this.themeStylesMap[themeName];
    if (!themeStyles) {
      return;
    }
    
    // Update workbench colors through the workspace configuration
    const colorCustomizations: Record<string, string> = {};
    
    // Set workbench colors based on theme
    if (themeName === 'light') {
      colorCustomizations['activityBar.background'] = '#f8f8f8';
      colorCustomizations['editor.background'] = themeStyles.backgroundColor;
      colorCustomizations['editor.foreground'] = themeStyles.textColor;
    } else if (themeName === 'dark') {
      colorCustomizations['activityBar.background'] = '#252526';
      colorCustomizations['editor.background'] = themeStyles.backgroundColor;
      colorCustomizations['editor.foreground'] = themeStyles.textColor;
    } else if (themeName === 'high-contrast') {
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

/**
 * Theme styles interface
 */
interface ThemeStyles {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
}