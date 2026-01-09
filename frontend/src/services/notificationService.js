import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('cortracker_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const getNotifications = async () => {
  const response = await axios.get(`${API_URL}/api/notifications`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await axios.get(`${API_URL}/api/notifications/unread-count`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const markAsRead = async (notificationId) => {
  const response = await axios.put(`${API_URL}/api/notifications/${notificationId}/read`, {}, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await axios.put(`${API_URL}/api/notifications/read-all`, {}, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
