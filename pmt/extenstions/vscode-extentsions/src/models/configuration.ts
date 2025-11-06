// src/models/configuration.ts
/**
 * Configuration interface for the extension
 */
export interface Configuration {
  /**
   * API settings
   */
  api: {
    endpoint: string;
    key?: string;
  };
  
  /**
   * GitHub integration settings
   */
  github?: {
    token?: string;
    username?: string;
    defaultRepository?: string;
  };
  
  /**
   * AI service settings
   */
  ai?: {
    endpoint?: string;
    model?: string;
    maxTokens?: number;
  };
  
  /**
   * Project template settings
   */
  templates?: {
    defaultLocation?: string;
    customTemplates?: string[];
  };
  
  /**
   * User interface settings
   */
  ui?: {
    theme?: 'light' | 'dark' | 'system';
    showNotifications?: boolean;
    dashboardLayout?: string;
  };
  
  /**
   * Extension behavior settings
   */
  behavior?: {
    autoSaveInterval?: number;
    syncOnStartup?: boolean;
    logLevel?: 'error' | 'warning' | 'info' | 'debug';
  };
  
  /**
   * Collaboration settings
   */
  collaboration?: {
    /**
     * Whether to enable collaboration features
     */
    enabled: boolean;
    
    /**
     * Server endpoint for collaboration
     */
    serverUrl?: string;
    
    /**
     * User display name for collaboration
     */
    userName?: string;
  };
  
  /**
   * Offline mode settings
   */
  offline?: {
    /**
     * Whether to enable offline mode
     */
    enabled: boolean;
    
    /**
     * Maximum cache size in MB
     */
    maxCacheSize?: number;
  };
  
  /**
   * Notification settings
   */
  notifications?: {
    /**
     * Whether to show notifications for task reminders
     */
    taskReminders: boolean;
    
    /**
     * Whether to show notifications for project events
     */
    projectEvents: boolean;
    
    /**
     * Whether to show notifications for collaboration events
     */
    collaborationEvents: boolean;
  };
  
  /**
   * Any additional custom settings
   */
  [key: string]: any;
}