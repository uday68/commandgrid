/**
 * Socket.IO Connection Manager
 * 
 * Centralizes all socket.io connections and provides a consistent
 * API for real-time communication throughout the application
 */

import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from '../config/apiConfig';
import { toast } from 'react-toastify';
import connectionMonitor from './connectionMonitor';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.connectedRooms = new Set();
    this.eventHandlers = new Map();
    this.pendingMessages = [];
    this.reconnectAttempts = 0;
    
    // Add connection monitor listener
    connectionMonitor.addListener(this.handleConnectionChange);
  }

  /**
   * Initializes the socket connection
   * @param {Object} auth - Authentication data including token
   * @returns {Promise} - Resolves when connection is established
   */
  connect(auth = {}) {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.socket.disconnect();
      }

      // Create new socket connection
      this.socket = io(SOCKET_CONFIG.url, {
        ...SOCKET_CONFIG.options,
        auth
      });

      // Setup event listeners
      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.rejoinRooms();
        this.processPendingMessages();
        resolve(this.socket);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnected = false;
        
        if (this.reconnectAttempts < SOCKET_CONFIG.options.reconnectionAttempts) {
          this.reconnectAttempts++;
        } else {
          toast.error('Unable to establish real-time connection. Some features may be limited.');
          reject(error);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.isConnected = false;
        
        if (reason === 'io server disconnect') {
          // Server disconnected us, reconnect manually
          setTimeout(() => {
            this.socket.connect();
          }, 1000);
        }
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
        toast.error(`Socket error: ${error.message || 'Unknown error'}`);
      });

      // Connect the socket
      if (!this.socket.connected) {
        this.socket.connect();
      }
    });
  }

  /**
   * Disconnects the socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      this.connectedRooms.clear();
    }
  }

  /**
   * Joins a room and sets up event handlers for that room
   * @param {Object} roomData - Room data including roomId
   * @param {Function} messageHandler - Function to handle incoming messages
   * @param {Function} activeUsersHandler - Function to handle active users updates
   * @param {Function} typingHandler - Function to handle typing indicators
   */
  joinRoom(roomData, messageHandler, activeUsersHandler, typingHandler) {
    if (!this.isConnected) {
      console.warn('Socket not connected. Will join room when connected.');
      return;
    }

    this.socket.emit('joinRoom', roomData);
    this.connectedRooms.add(roomData.roomId);

    // Set up event handlers for this room
    if (messageHandler) {
      this.on('newMessage', messageHandler);
    }
    
    if (activeUsersHandler) {
      this.on('activeUsers', activeUsersHandler);
    }
    
    if (typingHandler) {
      this.on('typing', typingHandler);
    }

    // Also listen for message history
    this.on('messageHistory', (messages) => {
      if (messageHandler) {
        messages.forEach(msg => messageHandler(msg, true)); // true = history message
      }
    });
  }

  /**
   * Rejoins all rooms after reconnection
   */
  rejoinRooms() {
    this.connectedRooms.forEach(roomId => {
      this.socket.emit('joinRoom', { roomId });
    });
  }

  /**
   * Leaves a room
   * @param {string} roomId - ID of the room to leave
   */
  leaveRoom(roomId) {
    if (this.isConnected) {
      this.socket.emit('leaveRoom', { roomId });
    }
    this.connectedRooms.delete(roomId);
  }

  /**
   * Sends a message to the current room
   * @param {Object} message - Message to send
   */
  sendMessage(message) {
    if (this.isConnected) {
      this.socket.emit('sendMessage', message);
    } else {
      // Queue message for when we reconnect
      this.pendingMessages.push({
        type: 'sendMessage',
        data: message,
        timestamp: Date.now()
      });
      
      toast.info('You are offline. Message will be sent when connection is restored.');
    }
  }

  /**
   * Sends a typing indicator
   */
  sendTyping() {
    if (this.isConnected) {
      this.socket.emit('typing');
    }
  }

  /**
   * Processes any pending messages
   */
  processPendingMessages() {
    if (this.pendingMessages.length > 0 && this.isConnected) {
      console.log(`Processing ${this.pendingMessages.length} pending messages`);
      
      // Sort by timestamp to maintain order
      this.pendingMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      // Process each message
      this.pendingMessages.forEach(pendingMsg => {
        this.socket.emit(pendingMsg.type, pendingMsg.data);
      });
      
      // Clear the pending messages
      this.pendingMessages = [];
      
      toast.success('Your offline messages have been sent!');
    }
  }

  /**
   * Registers an event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
      // Set up the actual socket.io handler
      this.socket.on(event, (...args) => {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.forEach(h => h(...args));
      });
    }
    
    // Add to our handlers list
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Removes an event handler
   * @param {string} event - Event name
   * @param {Function} handler - Handler to remove
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle network connection changes
   * @param {boolean} isOnline - Whether the device is online
   */
  handleConnectionChange = (isOnline) => {
    if (isOnline && !this.isConnected) {
      console.log('Network connection restored, reconnecting socket');
      this.socket?.connect();
    }
  }
}

// Create singleton instance
const socketManager = new SocketManager();

export default socketManager;
