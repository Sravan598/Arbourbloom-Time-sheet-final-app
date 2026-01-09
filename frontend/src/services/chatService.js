import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Create axios instance with auth header
const getAuthHeaders = () => {
  const token = localStorage.getItem('cortracker_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Channel APIs
export const getChannels = async () => {
  const response = await axios.get(`${API_URL}/api/chat/channels`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const createChannel = async (channelData) => {
  const response = await axios.post(`${API_URL}/api/chat/channels`, channelData, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const deleteChannel = async (channelId) => {
  const response = await axios.delete(`${API_URL}/api/chat/channels/${channelId}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Message APIs
export const getChannelMessages = async (channelId, limit = 50) => {
  const response = await axios.get(`${API_URL}/api/chat/channels/${channelId}/messages?limit=${limit}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const sendChannelMessage = async (channelId, content, messageType = 'text', attachment = null) => {
  const payload = { content, message_type: messageType };
  if (attachment) {
    payload.attachment = attachment;
  }
  const response = await axios.post(
    `${API_URL}/api/chat/channels/${channelId}/messages`,
    payload,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// DM APIs
export const getDMThreads = async () => {
  const response = await axios.get(`${API_URL}/api/chat/dm`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const startDMThread = async (userId) => {
  const response = await axios.post(`${API_URL}/api/chat/dm/${userId}`, {}, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getDMMessages = async (threadId, limit = 50) => {
  const response = await axios.get(`${API_URL}/api/chat/dm/${threadId}/messages?limit=${limit}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const sendDMMessage = async (threadId, content, messageType = 'text', attachment = null) => {
  const payload = { content, message_type: messageType };
  if (attachment) {
    payload.attachment = attachment;
  }
  const response = await axios.post(
    `${API_URL}/api/chat/dm/${threadId}/messages`,
    payload,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// User APIs
export const getChatUsers = async () => {
  const response = await axios.get(`${API_URL}/api/chat/users`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getUnreadCounts = async () => {
  const response = await axios.get(`${API_URL}/api/chat/unread-counts`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Search API
export const searchMessages = async (query, channelId = null, dmThreadId = null, limit = 20) => {
  let url = `${API_URL}/api/chat/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  if (channelId) url += `&channel_id=${channelId}`;
  if (dmThreadId) url += `&dm_thread_id=${dmThreadId}`;
  
  const response = await axios.get(url, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Reactions API
export const addReaction = async (messageId, emoji) => {
  const response = await axios.post(
    `${API_URL}/api/chat/messages/${messageId}/reactions`,
    null,
    { 
      headers: getAuthHeaders(),
      params: { emoji }
    }
  );
  return response.data;
};

export const getReactions = async (messageId) => {
  const response = await axios.get(
    `${API_URL}/api/chat/messages/${messageId}/reactions`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// User status API
export const getUserStatus = async () => {
  const response = await axios.get(`${API_URL}/api/chat/user-status`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// File upload API
export const uploadChatFile = async (file, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const token = localStorage.getItem('cortracker_token');
  
  const response = await axios.post(`${API_URL}/api/chat/upload`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    }
  });
  
  return response.data;
};

// Get full file URL
export const getFileUrl = (fileUrl) => {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('http')) return fileUrl;
  return `${API_URL}${fileUrl}`;
};

// WebSocket Manager Class
class WebSocketManager {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.pingInterval = null;
    this.isConnecting = false;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    const token = localStorage.getItem('cortracker_token');
    if (!token) {
      console.warn('No token available for WebSocket connection');
      return;
    }

    this.isConnecting = true;
    const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    
    try {
      this.ws = new WebSocket(`${wsUrl}/api/ws/${token}`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startPing();
        this.emit('connected', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code);
        this.isConnecting = false;
        this.stopPing();
        this.emit('disconnected', { code: event.code });
        
        // Attempt reconnect if not intentional close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.emit('error', { error });
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      this.isConnecting = false;
    }
  }

  disconnect() {
    this.stopPing();
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
  }

  startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendTyping(channelId = null, dmThreadId = null) {
    this.send({
      type: 'typing',
      channel_id: channelId,
      dm_thread_id: dmThreadId
    });
  }

  handleMessage(data) {
    const { type, ...payload } = data;
    
    switch (type) {
      case 'new_message':
        this.emit('newMessage', payload);
        break;
      case 'typing':
        this.emit('typing', payload);
        break;
      case 'reaction_update':
        this.emit('reactionUpdate', payload);
        break;
      case 'user_status':
        this.emit('userStatus', payload);
        break;
      case 'pong':
        // Heartbeat response, ignore
        break;
      default:
        this.emit(type, payload);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

// Singleton WebSocket manager
export const wsManager = new WebSocketManager();

// Legacy function for backward compatibility
export const createWebSocketConnection = (token) => {
  wsManager.connect();
  return wsManager.ws;
};

export default {
  getChannels,
  createChannel,
  deleteChannel,
  getChannelMessages,
  sendChannelMessage,
  getDMThreads,
  startDMThread,
  getDMMessages,
  sendDMMessage,
  getChatUsers,
  getUnreadCounts,
  searchMessages,
  addReaction,
  getReactions,
  getUserStatus,
  createWebSocketConnection,
  wsManager
};
