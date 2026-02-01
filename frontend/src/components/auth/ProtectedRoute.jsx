import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading, isAuthenticated, tenant } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Check for tenant in multiple places (localStorage may be cleared during logout)
    const storedTenant = localStorage.getItem('cortracker_tenant') 
      || sessionStorage.getItem('logout_redirect_tenant');
    
    // Clear the temporary session storage
    sessionStorage.removeItem('logout_redirect_tenant');
    
    // All tenants (including aurborbloom) now use isolated login pages
    const loginPath = storedTenant 
      ? `/${storedTenant}/login` 
      : '/aurborbloom/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // SUPER_ADMIN can access ADMIN routes
    if (requiredRole === 'ADMIN' && user?.role === 'SUPER_ADMIN') {
      return children;
    }
    
    // Redirect to appropriate dashboard based on role
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user?.role === 'EMPLOYEE') {
      return <Navigate to="/employee/dashboard" replace />;
    }
    
    // Get tenant from localStorage for redirect
    const storedTenant = localStorage.getItem('cortracker_tenant');
    // All tenants (including aurborbloom) now use isolated login pages
    const loginPath = storedTenant 
      ? `/${storedTenant}/login` 
      : '/aurborbloom/login';
    return <Navigate to={loginPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
