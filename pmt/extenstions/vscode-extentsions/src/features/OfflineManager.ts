// src/features/offlineManager.ts
import * as vscode from 'vscode';
import { ProjectManager } from '../core/projectManager';
import * as fs from 'fs';
import * as path from 'path';

interface I18nResources {
  [language: string]: {
    [namespace: string]: {
      [key: string]: string | {
        [subKey: string]: string | {
          [deepKey: string]: string
        }
      }
    };
  };
}

export class OfflineManager {
  private isOnline = true;
  private pendingChanges: PendingChange[] = [];
  private translations: I18nResources | null = null;
  
  constructor(private context: vscode.ExtensionContext) {
    this.loadTranslations();
  }

  public initialize(_projectManager: ProjectManager): void {
    this.checkConnection();
    
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.checkConnection();
    });

    setInterval(() => this.checkConnection(), 30000);
  }

  public queueChange(change: PendingChange): void {
    this.pendingChanges.push(change);
    this.savePendingChanges();
  }

  public async syncPendingChanges(): Promise<void> {
    if (!this.isOnline || this.pendingChanges.length === 0) return;
    
    try {
      // Attempt to sync all pending changes
      for (const change of this.pendingChanges) {
        await this.processChange(change);
      }
      
      this.pendingChanges = [];
      this.savePendingChanges();
    } catch (error) {
      console.error('Failed to sync pending changes:', error);
    }
  }
  
  public translate(key: string, language: string = 'en', namespace: string = 'translation'): string {
    if (!this.translations || !this.translations[language] || !this.translations[language][namespace]) {
      // Fall back to key if no translation found
      return key;
    }

    // Navigate the nested structure to find the translation
    const parts = key.split('.');
    let current = this.translations[language][namespace];
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nestedValue = current[part];
      
      if (!nestedValue || typeof nestedValue === 'string') {
        return key; // Path doesn't exist or is a leaf node already
      }
      
      current = nestedValue as {
        [key: string]: string | {
          [key: string]: string
        }
      };
    }
    
    const lastPart = parts[parts.length - 1];
    const value = current[lastPart];
    
    return typeof value === 'string' ? value : key;
  }

  private async processChange(change: PendingChange): Promise<void> {
    try {
      // Here we would implement different sync strategies based on the change type
      switch (change.type) {
        case 'task-update':
          await this.syncTaskUpdate(change.data);
          break;
        case 'feature-update':
          await this.syncFeatureUpdate(change.data);
          break;
        case 'project-update':
          await this.syncProjectUpdate(change.data);
          break;
        default:
          console.warn('Unknown change type:', change);
      }
    } catch (error) {
      console.error('Error processing change:', error);
      throw error; // Re-throw to be handled by caller
    }
  }
  
  private async syncTaskUpdate(taskData: any): Promise<void> {
    // Implementation for syncing task updates
    console.log('Syncing task update:', taskData);
    // This would typically make an API call or update a shared state
  }
  
  private async syncFeatureUpdate(featureData: any): Promise<void> {
    // Implementation for syncing feature updates
    console.log('Syncing feature update:', featureData);
  }
  
  private async syncProjectUpdate(projectData: any): Promise<void> {
    // Implementation for syncing project updates
    console.log('Syncing project update:', projectData);
  }

  private checkConnection(): void {
    const newStatus = this.getConnectionStatus();
    if (newStatus !== this.isOnline) {
      this.isOnline = newStatus;
      if (this.isOnline) {
        vscode.window.showInformationMessage(this.translate('connectivity.restored'));
        this.syncPendingChanges();
      } else {
        vscode.window.showWarningMessage(this.translate('connectivity.lost'));
      }
    }
  }

  private getConnectionStatus(): boolean {
    // Properly check network connectivity using DNS lookup
    try {
      // For VSCode extension, we can use a Node.js approach
      const { execSync } = require('child_process');
      
      // Different commands based on platform
      if (process.platform === 'win32') {
        // Windows
        execSync('ping -n 1 8.8.8.8');
      } else {
        // macOS/Linux
        execSync('ping -c 1 8.8.8.8');
      }
      
      return true;
    } catch (error) {
      return false; // Ping failed, assume offline
    }
  }

  private savePendingChanges(): void {
    // Save to extension storage
    this.context.globalState.update('pendingChanges', this.pendingChanges);
  }
  
  private loadTranslations(): void {
    try {
      const extensionPath = this.context.extensionPath;
      const translationsPath = path.join(extensionPath, 'resources', 'translations.json');
      
      if (fs.existsSync(translationsPath)) {
        const content = fs.readFileSync(translationsPath, 'utf-8');
        this.translations = JSON.parse(content);
      } else {
        console.log('Translations file not found, creating default');
        // Create default translations structure
        this.translations = {
          en: {
            translation: {
              common: {
                save: 'Save',
                cancel: 'Cancel',
                delete: 'Delete',
                edit: 'Edit'
              },
              errors: {
                offline: 'You are offline',
                syncFailed: 'Synchronization failed'
              },
              connectivity: {
                restored: 'Connection restored',
                lost: 'Connection lost'
              }
            }
          }
        };
        
        // Ensure directory exists
        const resourcesDir = path.join(extensionPath, 'resources');
        if (!fs.existsSync(resourcesDir)) {
          fs.mkdirSync(resourcesDir, { recursive: true });
        }
        
        // Write default translations
        fs.writeFileSync(translationsPath, JSON.stringify(this.translations, null, 2), 'utf-8');
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
      this.translations = null;
    }
  }
}

interface PendingChange {
  type: 'task-update' | 'feature-update' | 'project-update';
  data: any;
  timestamp: Date;
}