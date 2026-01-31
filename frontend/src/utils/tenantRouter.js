import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Hook to detect tenant from custom domain
 * Returns the tenant slug if a custom domain is detected
 */
export const useTenantFromDomain = () => {
  const [tenantSlug, setTenantSlug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const detectTenant = async () => {
      const hostname = window.location.hostname;
      
      // Skip for localhost and preview domains
      if (
        hostname === 'localhost' ||
        hostname.includes('127.0.0.1') ||
        hostname.includes('preview.emergentagent.com')
      ) {
        setLoading(false);
        return;
      }

      try {
        // Try to find tenant by custom domain
        const response = await axios.get(`${API}/api/tenants/by-domain/${hostname}`);
        if (response.data && response.data.slug) {
          setTenantSlug(response.data.slug);
          // Store in sessionStorage for persistence during session
          sessionStorage.setItem('detected_tenant', response.data.slug);
        }
      } catch (err) {
        // No tenant found for this domain - that's okay
        console.log('No custom domain tenant found:', hostname);
      } finally {
        setLoading(false);
      }
    };

    detectTenant();
  }, []);

  return { tenantSlug, loading, error };
};

/**
 * Get tenant-specific landing page component
 */
export const getTenantLandingPage = (tenantSlug) => {
  const tenantPages = {
    'perfectsolutions': React.lazy(() => import('../pages/tenant/PerfectSolutionsHome')),
    // Add more tenant-specific landing pages here
    // 'another-tenant': React.lazy(() => import('../pages/tenant/AnotherTenantHome')),
  };

  return tenantPages[tenantSlug] || null;
};

/**
 * Check if current hostname matches a tenant's custom domain
 */
export const isCustomDomain = () => {
  const hostname = window.location.hostname;
  return (
    hostname !== 'localhost' &&
    !hostname.includes('127.0.0.1') &&
    !hostname.includes('preview.emergentagent.com')
  );
};

/**
 * Pre-select tenant on login page based on domain
 */
export const getPreselectedTenant = () => {
  return sessionStorage.getItem('detected_tenant') || null;
};

export default {
  useTenantFromDomain,
  getTenantLandingPage,
  isCustomDomain,
  getPreselectedTenant
};
