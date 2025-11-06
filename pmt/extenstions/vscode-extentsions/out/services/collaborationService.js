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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationService = void 0;
const vscode = __importStar(require("vscode"));
const ws_1 = __importDefault(require("ws"));
/**
 * Service for handling real-time collaboration features
 */
class CollaborationService {
    constructor() {
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.sessions = new Map();
        this.updateListeners = [];
        this.onSessionUpdateEmitter = new vscode.EventEmitter();
        this.onActivityEmitter = new vscode.EventEmitter();
        this.onConnectionStatusEmitter = new vscode.EventEmitter();
        /**
         * Event fired when a collaboration session is updated
         */
        this.onSessionUpdate = this.onSessionUpdateEmitter.event;
        /**
         * Event fired when a new activity occurs in the current session
         */
        this.onActivity = this.onActivityEmitter.event;
        /**
         * Event fired when connection status changes
         */
        this.onConnectionStatus = this.onConnectionStatusEmitter.event;
        // Simple constructor for now
    }
    /**
     * Connect to collaboration service
     */
    async connect() {
        // Simplified implementation for the VSCode extension
        this.isConnected = true;
        vscode.window.showInformationMessage('Connected to collaboration service');
    }
    /**
     * Initialize the collaboration service
     * @param _context VSCode extension context
     * @param url WebSocket URL for the collaboration server
     */
    initialize(_context, url) {
        this.webSocketUrl = url;
        this.initializeWebSocket();
    }
    /**
     * Initialize WebSocket connection
     */
    initializeWebSocket() {
        if (!this.webSocketUrl) {
            vscode.window.showErrorMessage('WebSocket URL not configured for collaboration');
            return;
        }
        try {
            this.socket = new ws_1.default(this.webSocketUrl);
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to connect to collaboration server: ${error}`);
        }
    }
    /**
     * Attempt to reconnect to the WebSocket server
     */
    attemptReconnect() {
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
    handleMessage(message) {
        switch (message.type) {
            case 'session_update':
                const session = message.session;
                this.sessions.set(session.id, session);
                if (this.currentSession?.id === session.id) {
                    this.currentSession = session;
                }
                this.onSessionUpdateEmitter.fire(session);
                break;
            case 'activity':
                const activity = message.activity;
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
    async startSession(projectId) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const userInfo = await this.getUserInfo();
        const session = {
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
    async joinSession(sessionId) {
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
        const activity = {
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
    async getUserInfo() {
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
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    /**
     * Get the current active session
     */
    getCurrentSession() {
        return this.currentSession;
    }
    /**
     * Register update listener
     */
    onUpdate(callback) {
        this.updateListeners.push(callback);
    }
    /**
     * Dispose of the collaboration service resources
     */
    dispose() {
        if (this.socket) {
            this.socket.close();
        }
        this.onSessionUpdateEmitter.dispose();
        this.onActivityEmitter.dispose();
        this.onConnectionStatusEmitter.dispose();
    }
}
exports.CollaborationService = CollaborationService;
//# sourceMappingURL=collaborationService.js.map