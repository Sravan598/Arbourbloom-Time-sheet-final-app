import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cortracker_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up axios interceptor for auth header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Verify token on mount
  const verifyToken = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
      setError(null);
    } catch (err) {
      console.error('Token verification failed:', err);
      localStorage.removeItem('cortracker_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('cortracker_token', access_token);
      setToken(access_token);
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  };

  const signup = async (name, email, password, role = 'EMPLOYEE', adminInviteCode = null) => {
    try {
      setError(null);
      const payload = { name, email, password, role };
      if (adminInviteCode) {
        payload.admin_invite_code = adminInviteCode;
      }
      
      const response = await axios.post(`${API}/auth/signup`, payload);
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('cortracker_token', access_token);
      setToken(access_token);
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.detail || 'Signup failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('cortracker_token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const clearError = () => setError(null);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    signup,
    logout,
    clearError,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isEmployee: user?.role === 'EMPLOYEE',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
