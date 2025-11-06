import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Service for interacting with AI features
 */
class AIService {
  constructor() {
    this.activeWebSocket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.pingInterval = null;
  }

  /**
   * Send a message to the AI assistant
   */
  async sendMessage(sessionId, message, contextData = {}) {
    try {
      const token = localStorage.getItem('authToken');
      
      // If we have an active WebSocket connection and it's open, use it
      if (this.activeWebSocket && this.activeWebSocket.readyState === WebSocket.OPEN) {
        return new Promise((resolve, reject) => {
          // Set up a timeout for the response
          const timeoutId = setTimeout(() => {
            this.activeWebSocket.onmessage = null;
            reject(new Error('WebSocket message response timeout'));
          }, 30000);
          
          // Save the original onmessage handler
          const originalOnMessage = this.activeWebSocket.onmessage;
          
          // Set up a new handler for this message
          this.activeWebSocket.onmessage = (event) => {
            try {
              const response = JSON.parse(event.data);
              
              clearTimeout(timeoutId);
              
              // Restore the original handler
              this.activeWebSocket.onmessage = originalOnMessage;
              
              resolve({
                interaction: {
                  interaction_id: response.metadata?.timestamp || Date.now().toString(),
                  session_id: sessionId,
                  user_message: message,
                  ai_response: response.response,
                  data: response.data,
                  follow_up_questions: response.follow_up_questions,
                  actions: response.actions,
                  created_at: new Date().toISOString()
                }
              });
            } catch (error) {
              console.error('Error processing WebSocket message:', error);
              this.activeWebSocket.onmessage = originalOnMessage;
              reject(error);
            }
          };
          
          // Send the message through WebSocket
          this.activeWebSocket.send(JSON.stringify({
            query: message,
            conversation_id: sessionId,
            context: contextData
          }));
        });
      } else {
        // Fallback to REST API
        const response = await axios.post(
          `${API_URL}/ai/query`,
          {
            query: message,
            conversation_id: sessionId,
            context: contextData
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        // Convert the response to the expected interaction format
        return {
          interaction: {
            interaction_id: response.data.metadata?.timestamp || Date.now().toString(),
            session_id: sessionId,
            user_message: message,
            ai_response: response.data.response,
            data: response.data.data,
            follow_up_questions: response.data.follow_up_questions,
            actions: response.data.actions,
            created_at: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      console.error('Error sending message to AI:', error);
      throw error;
    }
  }

  /**
   * Create a new AI assistance session using WebSocket
   */
  async createSession(context, initialPrompt) {
    try {
      const token = localStorage.getItem('authToken');
      
      // First try WebSocket connection if supported
      if ('WebSocket' in window) {
        // Use correct WebSocket URL format with proper host
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // Get the API host with correct port for development or production
        let aiHost = process.env.REACT_APP_AI_HOST;
        if (!aiHost) {
          // Default to current host in production or localhost:8000 in development
          aiHost = process.env.NODE_ENV === 'production' 
            ? window.location.host 
            : 'localhost:8000';
        }
        // The path should match exactly what's defined in the backend
        const wsUrl = `${wsProtocol}//${aiHost}/ws/ai_assistant?token=${encodeURIComponent(token)}`;
        console.log("Attempting WebSocket connection to:", wsUrl);
        
        return await this._createWebSocketSession(wsUrl, token, context, initialPrompt);
      } else {
        // Fallback to REST API
        const response = await axios.post(
          `${API_URL}/ai/sessions`,
          {
            context,
            prompt: initialPrompt
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        return response.data;
      }
    } catch (error) {
      console.error('Error creating AI session:', error);
      
      // If WebSocket fails, try using REST API as fallback
      try {
        console.log("Falling back to REST API after WebSocket failure");
        const token = localStorage.getItem('authToken');
        const response = await axios.post(
          `${API_URL}/ai/sessions`,
          {
            context,
            prompt: initialPrompt
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        return response.data;
      } catch (fallbackError) {
        console.error('Fallback request also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Create a session using WebSocket
   * @private
   */
  async _createWebSocketSession(wsUrl, token, context, initialPrompt) {
    return new Promise((resolve, reject) => {
      try {
        if (this.activeWebSocket && this.activeWebSocket.readyState === WebSocket.OPEN) {
          this.activeWebSocket.close();
        }
        
        console.log("Connecting to WebSocket:", wsUrl);
        const ws = new WebSocket(wsUrl);
        
        const timeoutId = setTimeout(() => {
          console.error('WebSocket connection timed out');
          ws.close();
          reject(new Error('WebSocket connection timed out'));
        }, 10000);
        
        ws.onopen = () => {
          console.log("WebSocket connection opened");
          // Token is already included in URL, no need to send separately
          
          // Start ping interval to keep connection alive
          this._startPingInterval(ws);
          
          // WebSocket is ready, send the initial message immediately
          clearTimeout(timeoutId);
          console.log("WebSocket authenticated, sending initial message");
          
          const initialMessage = { 
            query: initialPrompt,
            context
          };
          console.log("Sending initial message:", initialMessage);
          ws.send(JSON.stringify(initialMessage));
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("WebSocket received message:", data);
            
            // Check for error message
            if (data.error) {
              console.error('WebSocket error from server:', data.error);
              reject(new Error(data.error));
              return;
            }
            
            // Store WebSocket instance for future use
            this.activeWebSocket = ws;
            this.reconnectAttempts = 0;
            
            // Handle ping/pong messages
            const originalOnMessage = ws.onmessage;
            ws.onmessage = (msgEvent) => {
              try {
                const msgData = JSON.parse(msgEvent.data);
                if (msgData.type === 'pong') {
                  console.log("Received pong from server");
                  return;
                }
                if (originalOnMessage) {
                  originalOnMessage(msgEvent);
                }
              } catch (err) {
                console.error('Error processing WebSocket message:', err);
              }
            };
            
            resolve({
              session: {
                session_id: data.session_id || Date.now().toString(),
                context,
                initial_prompt: initialPrompt,
                status: 'active',
                created_at: new Date().toISOString()
              },
              interaction: {
                interaction_id: data.metadata?.timestamp || Date.now().toString(),
                session_id: data.session_id || Date.now().toString(),
                user_message: initialPrompt,
                ai_response: data.response || "I'm ready to assist you.",
                data: data.data || {},
                follow_up_questions: data.follow_up_questions || [],
                created_at: new Date().toISOString()
              }
            });
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            reject(error);
          }
        };
        
        ws.onerror = (error) => {
          clearTimeout(timeoutId);
          console.error('WebSocket connection error:', error);
          this._clearPingInterval();
          reject(error);
        };
        
        ws.onclose = (event) => {
          clearTimeout(timeoutId);
          console.log('WebSocket closed:', event.code, event.reason);
          this._clearPingInterval();
          
          if (!event.wasClean) {
            console.log('Connection closed unexpectedly, attempting to reconnect...');
            this._attemptReconnect(context, initialPrompt);
          }
          
          if (this.activeWebSocket === ws) {
            this.activeWebSocket = null;
          }
        };
      } catch (error) {
        console.error('Error in WebSocket session creation:', error);
        reject(error);
      }
    });
  }

  /**
   * Start ping interval to keep WebSocket connection alive
   * @private
   */
  _startPingInterval(ws) {
    this._clearPingInterval();
    this.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log("Sending ping to keep connection alive");
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Clear ping interval
   * @private
   */
  _clearPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Attempt to reconnect WebSocket
   * @private
   */
  async _attemptReconnect(context, initialPrompt) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.createSession(context, initialPrompt);
        console.log('Reconnection successful');
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, delay);
  }

  /**
   * Get all AI sessions for a user
   */
  async getSessions() {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${API_URL}/ai/sessions`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching AI sessions:', error);
      throw error;
    }
  }

  /**
   * Get AI recommendations
   */
  async getRecommendations() {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${API_URL}/ai/recommendations`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Update recommendation status
   */
  async updateRecommendationStatus(id, status) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.patch(
        `${API_URL}/ai/recommendations/${id}`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating recommendation status:', error);
      throw error;
    }
  }

  /**
   * Analyze a task using AI
   */
  async analyzeTask(taskId) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${API_URL}/ai/analyze-task/${taskId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error analyzing task:', error);
      throw error;
    }
  }
}

export default new AIService();
