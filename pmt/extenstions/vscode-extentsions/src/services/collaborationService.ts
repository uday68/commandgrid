import * as vscode from 'vscode';
import WebSocket from 'ws';

/**
 * Interface for collaboration session details
 */
export interface CollaborationSession {
  id: string;
  projectId: string;
  host: string;
  participants: string[];
  startTime: Date;
  status: 'active' | 'ended' | 'paused';
  connectedClients: number;
  lastActivity: Date;
}

/**
 * Interface for collaboration activity
 */
export interface CollaborationActivity {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: Date;
  type: 'join' | 'leave' | 'edit' | 'comment' | 'task-update';
  resourceId?: string;
  details?: Record<string, any>;
}

/**
 * Service for handling real-time collaboration features
 */
export class CollaborationService {
  private webSocketUrl: string | undefined;
  private socket: WebSocket | undefined;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private sessions: Map<string, CollaborationSession> = new Map();
  private currentSession: CollaborationSession | undefined;
  private updateListeners: Array<(update: any) => void> = [];
  
  private onSessionUpdateEmitter = new vscode.EventEmitter<CollaborationSession>();
  private onActivityEmitter = new vscode.EventEmitter<CollaborationActivity>();
  private onConnectionStatusEmitter = new vscode.EventEmitter<boolean>();

  /**
   * Event fired when a collaboration session is updated
   */
  readonly onSessionUpdate = this.onSessionUpdateEmitter.event;
  
  /**
   * Event fired when a new activity occurs in the current session
   */
  readonly onActivity = this.onActivityEmitter.event;
  
  /**
   * Event fired when connection status changes
   */
  readonly onConnectionStatus = this.onConnectionStatusEmitter.event;
  
  constructor() {
    // Simple constructor for now
  }
  
  /**
   * Connect to collaboration service
   */
  async connect(): Promise<void> {
    // Simplified implementation for the VSCode extension
    this.isConnected = true;
    vscode.window.showInformationMessage('Connected to collaboration service');
  }

  /**
   * Initialize the collaboration service
   * @param _context VSCode extension context
   * @param url WebSocket URL for the collaboration server
   */
  initialize(_context: vscode.ExtensionContext, url: string): void {
    this.webSocketUrl = url;
    this.initializeWebSocket();
  }

  /**
   * Initialize WebSocket connection
   */
  private initializeWebSocket(): void {
    if (!this.webSocketUrl) {
      vscode.window.showErrorMessage('WebSocket URL not configured for collaboration');
      return;
    }

    try {
      this.socket = new WebSocket(this.webSocketUrl);
      
      this.socket.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.onConnectionStatusEmitter.fire(true);
        vscode.window.showInformationMessage('Connected to collaboration server');
      };
      
      this.socket.onclose = () => {
        this.isConnected = false;
        this.onConnectionStatusEmitter.fire(false);
        this.attemptReconnect();
      };
      
      this.socket.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data.toString()));
      };
      
      this.socket.onerror = (error) => {
        vscode.window.showErrorMessage(`Collaboration WebSocket error: ${error.message}`);
      };
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to connect to collaboration server: ${error}`);
    }
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      vscode.window.showErrorMessage('Maximum reconnection attempts reached. Please try again later.');
      return;
    }
    
    this.reconnectAttempts++;
    vscode.window.showInformationMessage(`Reconnecting to collaboration server (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.initializeWebSocket();
    }, 2000 * this.reconnectAttempts); // Exponential backoff
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'session_update':
        const session = message.session as CollaborationSession;
        this.sessions.set(session.id, session);
        if (this.currentSession?.id === session.id) {
          this.currentSession = session;
        }
        this.onSessionUpdateEmitter.fire(session);
        break;
      
      case 'activity':
        const activity = message.activity as CollaborationActivity;
        this.onActivityEmitter.fire(activity);
        break;
      
      default:
        // Notify all update listeners
        this.updateListeners.forEach(listener => listener(message));
    }
  }

  /**
   * Start a new collaboration session
   */
  async startSession(projectId: string): Promise<CollaborationSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userInfo = await this.getUserInfo();
    
    const session: CollaborationSession = {
      id: sessionId,
      projectId: projectId,
      host: userInfo.id,
      participants: [userInfo.id],
      startTime: new Date(),
      status: 'active',
      connectedClients: 1,
      lastActivity: new Date()
    };
    
    this.sessions.set(sessionId, session);
    this.currentSession = session;
    
    // Send session creation message if connected
    if (this.isConnected && this.socket) {
      this.socket.send(JSON.stringify({
        type: 'create_session',
        session
      }));
    }
    
    this.onSessionUpdateEmitter.fire(session);
    return session;
  }

  /**
   * Join an existing collaboration session
   */
  async joinSession(sessionId: string): Promise<CollaborationSession | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const userInfo = await this.getUserInfo();
    
    // Update session
    session.participants.push(userInfo.id);
    session.connectedClients += 1;
    session.lastActivity = new Date();
    
    this.currentSession = session;
    
    // Create activity record
    const activity: CollaborationActivity = {
      id: `activity_${Date.now()}`,
      sessionId: sessionId,
      userId: userInfo.id,
      timestamp: new Date(),
      type: 'join',
      details: { username: userInfo.name }
    };
    
    // Send join message if connected
    if (this.isConnected && this.socket) {
      this.socket.send(JSON.stringify({
        type: 'join_session',
        sessionId,
        userId: userInfo.id
      }));
    }
    
    this.onActivityEmitter.fire(activity);
    this.onSessionUpdateEmitter.fire(session);
    return session;
  }

  /**
   * Get current user information
   */
  private async getUserInfo(): Promise<{ id: string, name: string }> {
    // This would typically come from your authentication system
    // For now we'll use placeholder values or extension settings
    const config = vscode.workspace.getConfiguration('projectManagement');
    return {
      id: config.get('userId') || 'anonymous',
      name: config.get('userName') || 'VSCode User'
    };
  }

  /**
   * Get all available collaboration sessions
   */
  getAllSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get the current active session
   */
  getCurrentSession(): CollaborationSession | undefined {
    return this.currentSession;
  }

  /**
   * Register update listener
   */
  onUpdate(callback: (update: any) => void): void {
    this.updateListeners.push(callback);
  }

  /**
   * Dispose of the collaboration service resources
   */
  dispose(): void {
    if (this.socket) {
      this.socket.close();
    }
    
    this.onSessionUpdateEmitter.dispose();
    this.onActivityEmitter.dispose();
    this.onConnectionStatusEmitter.dispose();
  }
}