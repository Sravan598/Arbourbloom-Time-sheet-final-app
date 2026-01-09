import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('cortracker_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Leave Types
export const getLeaveTypes = async () => {
  const response = await axios.get(`${API_URL}/api/leave/types`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const createLeaveType = async (typeData) => {
  const response = await axios.post(`${API_URL}/api/admin/leave/types`, typeData, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const updateLeaveType = async (typeId, typeData) => {
  const response = await axios.put(`${API_URL}/api/admin/leave/types/${typeId}`, typeData, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const deleteLeaveType = async (typeId) => {
  const response = await axios.delete(`${API_URL}/api/admin/leave/types/${typeId}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Leave Requests (Employee)
export const getMyLeaveRequests = async (status = null) => {
  const url = status 
    ? `${API_URL}/api/leave/requests?status=${status}`
    : `${API_URL}/api/leave/requests`;
  const response = await axios.get(url, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const createLeaveRequest = async (requestData) => {
  const response = await axios.post(`${API_URL}/api/leave/requests`, requestData, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const cancelLeaveRequest = async (requestId) => {
  const response = await axios.delete(`${API_URL}/api/leave/requests/${requestId}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Leave Requests (Admin)
export const getAllLeaveRequests = async (status = null) => {
  const url = status 
    ? `${API_URL}/api/admin/leave/requests?status=${status}`
    : `${API_URL}/api/admin/leave/requests`;
  const response = await axios.get(url, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const reviewLeaveRequest = async (requestId, reviewData) => {
  const response = await axios.put(`${API_URL}/api/admin/leave/requests/${requestId}`, reviewData, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export default {
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getMyLeaveRequests,
  createLeaveRequest,
  cancelLeaveRequest,
  getAllLeaveRequests,
  reviewLeaveRequest
};
