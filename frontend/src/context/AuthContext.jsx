import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

// Default tenant
const DEFAULT_TENANT = 'aurborbloom';

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
  const [tenant, setTenant] = useState(localStorage.getItem('cortracker_tenant') || DEFAULT_TENANT);
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

  const login = async (email, password, tenantId = DEFAULT_TENANT) => {
    try {
      setError(null);
      const response = await axios.post(`${API}/auth/login`, { 
        email, 
        password,
        tenant_id: tenantId 
      });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('cortracker_token', access_token);
      localStorage.setItem('cortracker_tenant', tenantId);
      setToken(access_token);
      setTenant(tenantId);
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  };

  const signup = async (name, email, password, role = 'EMPLOYEE', adminInviteCode = null, employeeInviteCode = null, tenantId = DEFAULT_TENANT) => {
    try {
      setError(null);
      const payload = { 
        name, 
        email, 
        password, 
        role,
        tenant_id: tenantId
      };
      if (adminInviteCode) {
        payload.admin_invite_code = adminInviteCode;
      }
      if (employeeInviteCode) {
        payload.employee_invite_code = employeeInviteCode;
      }
      
      const response = await axios.post(`${API}/auth/signup`, payload);
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('cortracker_token', access_token);
      localStorage.setItem('cortracker_tenant', tenantId);
      setToken(access_token);
      setTenant(tenantId);
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.detail || 'Signup failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = (redirectTo = null) => {
    // Get tenant slug before clearing - for tenant-isolated redirect
    const currentTenant = localStorage.getItem('cortracker_tenant');
    
    localStorage.removeItem('cortracker_token');
    localStorage.removeItem('cortracker_tenant');
    setToken(null);
    setTenant(DEFAULT_TENANT);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    
    // Return the tenant slug so components can redirect appropriately
    return currentTenant;
  };

  // Get the logout URL for current tenant
  const getLogoutRedirectUrl = () => {
    const currentTenant = tenant || localStorage.getItem('cortracker_tenant');
    // If tenant is not default aurborbloom, redirect to tenant-specific login
    if (currentTenant && currentTenant !== DEFAULT_TENANT) {
      return `/${currentTenant}/login`;
    }
    return '/login';
  };

  const clearError = () => setError(null);

  const value = {
    user,
    token,
    tenant,
    loading,
    error,
    login,
    signup,
    logout,
    clearError,
    setUser,
    setToken,
    setTenant,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isEmployee: user?.role === 'EMPLOYEE',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
