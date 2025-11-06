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
exports.OfflineManager = void 0;
// src/features/offlineManager.ts
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class OfflineManager {
    constructor(context) {
        this.context = context;
        this.isOnline = true;
        this.pendingChanges = [];
        this.translations = null;
        this.loadTranslations();
    }
    initialize(_projectManager) {
        this.checkConnection();
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.checkConnection();
        });
        setInterval(() => this.checkConnection(), 30000);
    }
    queueChange(change) {
        this.pendingChanges.push(change);
        this.savePendingChanges();
    }
    async syncPendingChanges() {
        if (!this.isOnline || this.pendingChanges.length === 0)
            return;
        try {
            // Attempt to sync all pending changes
            for (const change of this.pendingChanges) {
                await this.processChange(change);
            }
            this.pendingChanges = [];
            this.savePendingChanges();
        }
        catch (error) {
            console.error('Failed to sync pending changes:', error);
        }
    }
    translate(key, language = 'en', namespace = 'translation') {
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
            current = nestedValue;
        }
        const lastPart = parts[parts.length - 1];
        const value = current[lastPart];
        return typeof value === 'string' ? value : key;
    }
    async processChange(change) {
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
        }
        catch (error) {
            console.error('Error processing change:', error);
            throw error; // Re-throw to be handled by caller
        }
    }
    async syncTaskUpdate(taskData) {
        // Implementation for syncing task updates
        console.log('Syncing task update:', taskData);
        // This would typically make an API call or update a shared state
    }
    async syncFeatureUpdate(featureData) {
        // Implementation for syncing feature updates
        console.log('Syncing feature update:', featureData);
    }
    async syncProjectUpdate(projectData) {
        // Implementation for syncing project updates
        console.log('Syncing project update:', projectData);
    }
    checkConnection() {
        const newStatus = this.getConnectionStatus();
        if (newStatus !== this.isOnline) {
            this.isOnline = newStatus;
            if (this.isOnline) {
                vscode.window.showInformationMessage(this.translate('connectivity.restored'));
                this.syncPendingChanges();
            }
            else {
                vscode.window.showWarningMessage(this.translate('connectivity.lost'));
            }
        }
    }
    getConnectionStatus() {
        // Properly check network connectivity using DNS lookup
        try {
            // For VSCode extension, we can use a Node.js approach
            const { execSync } = require('child_process');
            // Different commands based on platform
            if (process.platform === 'win32') {
                // Windows
                execSync('ping -n 1 8.8.8.8');
            }
            else {
                // macOS/Linux
                execSync('ping -c 1 8.8.8.8');
            }
            return true;
        }
        catch (error) {
            return false; // Ping failed, assume offline
        }
    }
    savePendingChanges() {
        // Save to extension storage
        this.context.globalState.update('pendingChanges', this.pendingChanges);
    }
    loadTranslations() {
        try {
            const extensionPath = this.context.extensionPath;
            const translationsPath = path.join(extensionPath, 'resources', 'translations.json');
            if (fs.existsSync(translationsPath)) {
                const content = fs.readFileSync(translationsPath, 'utf-8');
                this.translations = JSON.parse(content);
            }
            else {
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
        }
        catch (error) {
            console.error('Failed to load translations:', error);
            this.translations = null;
        }
    }
}
exports.OfflineManager = OfflineManager;
//# sourceMappingURL=OfflineManager.js.map