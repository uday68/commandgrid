import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

import { API_BASE_URL } from '../config/apiConfig';

const SOCKET_URL = API_BASE_URL;

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.retries = 0;
    this.maxRetries = 3;
    this.rooms = new Set();
    this.eventHandlers = {};
  }

  connect() {
    if (this.socket) {
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('No auth token found');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.connected = true;
      this.retries = 0;
      
      // Rejoin rooms after reconnection
      this.rooms.forEach(room => {
        this.joinRoom(room);
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.retries++;
      
      if (this.retries > this.maxRetries) {
        toast.error('Connection to server lost. Please refresh the page.');
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.rooms.clear();
    }
  }

  joinRoom(roomData) {
    if (!this.connected || !this.socket) {
      console.warn('Socket not connected. Cannot join room.');
      return;
    }

    this.socket.emit('joinRoom', roomData);
    this.rooms.add(roomData.roomId);
  }

  leaveRoom(roomId) {
    if (this.connected && this.socket) {
      this.socket.emit('leaveRoom', { roomId });
      this.rooms.delete(roomId);
    }
  }

  sendMessage(message) {
    if (!this.connected || !this.socket) {
      toast.error('Connection lost. Message not sent.');
      return;
    }

    this.socket.emit('sendMessage', message);
  }

  emitTyping() {
    if (this.connected && this.socket) {
      this.socket.emit('typing');
    }
  }

  on(event, callback) {
    if (!this.socket) {
      this.connect();
    }

    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }

    this.eventHandlers[event].push(callback);
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) return;

    if (callback && this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(
        cb => cb !== callback
      );
    }

    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
      this.eventHandlers[event] = [];
    }
  }
}

const socketService = new SocketService();

export default socketService;
