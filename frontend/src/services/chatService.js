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

export const sendChannelMessage = async (channelId, content) => {
  const response = await axios.post(
    `${API_URL}/api/chat/channels/${channelId}/messages`,
    { content, message_type: 'text' },
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

export const sendDMMessage = async (threadId, content) => {
  const response = await axios.post(
    `${API_URL}/api/chat/dm/${threadId}/messages`,
    { content, message_type: 'text' },
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

// WebSocket connection
export const createWebSocketConnection = (token) => {
  const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
  return new WebSocket(`${wsUrl}/api/ws/${token}`);
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
  createWebSocketConnection
};
