import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

// Default branding (AurborBloom)
const DEFAULT_BRANDING = {
  slug: 'aurborbloom',
  name: 'AurborBloom',
  logo_url: null,
  primary_color: '#1a1a1a',
  secondary_color: '#D4AF37',
};

const TenantContext = createContext(null);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export const TenantProvider = ({ children }) => {
  const { user, tenant: tenantSlug, isAuthenticated } = useAuth();
  const [tenantInfo, setTenantInfo] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(false);

  // Fetch tenant branding when user logs in
  useEffect(() => {
    const fetchTenantBranding = async () => {
      if (!tenantSlug || !isAuthenticated) {
        setTenantInfo(DEFAULT_BRANDING);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get(`${API}/api/tenants/${tenantSlug}/public`);
        setTenantInfo({
          ...DEFAULT_BRANDING,
          ...response.data
        });
        
        // Update document title
        document.title = `${response.data.name} HRMS`;
        
        // Update theme color meta tag
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
          metaTheme.setAttribute('content', response.data.primary_color);
        }
        
      } catch (err) {
        console.error('Failed to fetch tenant branding:', err);
        setTenantInfo(DEFAULT_BRANDING);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantBranding();
  }, [tenantSlug, isAuthenticated]);

  // Reset to default when logged out
  useEffect(() => {
    if (!isAuthenticated) {
      setTenantInfo(DEFAULT_BRANDING);
      document.title = 'AurborBloom HRMS';
    }
  }, [isAuthenticated]);

  // Generate CSS variables for tenant colors
  const cssVariables = {
    '--tenant-primary': tenantInfo.primary_color,
    '--tenant-secondary': tenantInfo.secondary_color,
    '--tenant-primary-light': `${tenantInfo.primary_color}15`,
    '--tenant-primary-hover': `${tenantInfo.primary_color}dd`,
  };

  const value = {
    tenant: tenantInfo,
    loading,
    cssVariables,
    // Helper functions
    getTenantLogo: () => tenantInfo.logo_url || '/aurborbloom_logo.png',
    getTenantName: () => tenantInfo.name,
    getPrimaryColor: () => tenantInfo.primary_color,
    getSecondaryColor: () => tenantInfo.secondary_color,
    isDefaultTenant: () => tenantInfo.slug === 'aurborbloom',
  };

  return (
    <TenantContext.Provider value={value}>
      <div style={cssVariables}>
        {children}
      </div>
    </TenantContext.Provider>
  );
};

export default TenantContext;
