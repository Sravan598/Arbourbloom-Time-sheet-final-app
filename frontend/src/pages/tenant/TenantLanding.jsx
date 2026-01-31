import React, { useState, useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock,
  FileText,
  Calendar,
  Shield,
  ArrowRight,
  Users,
  CheckCircle,
  Building2
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Import tenant-specific landing pages
const TENANT_PAGES = {
  'perfectsolutions': React.lazy(() => import('./PerfectSolutionsHome'))
};

const TenantLanding = () => {
  const { tenantSlug } = useParams();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const response = await axios.get(`${API}/api/tenants/${tenantSlug}/public`);
        setTenant(response.data);
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    
    if (tenantSlug) {
      fetchTenant();
    }
  }, [tenantSlug]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Tenant not found - redirect to main home
  if (notFound) {
    return <Navigate to="/" replace />;
  }

  // Check if tenant has custom landing page
  const CustomPage = TENANT_PAGES[tenantSlug];
  if (CustomPage) {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      }>
        <CustomPage />
      </React.Suspense>
    );
  }

  // Default generic landing page for tenants without custom page
  const primaryColor = tenant?.primary_color || '#1a1a1a';
  
  const features = [
    { icon: Clock, title: 'Time Tracking', description: 'Track work hours and breaks' },
    { icon: FileText, title: 'Timesheets', description: 'Easy timesheet submission' },
    { icon: Calendar, title: 'Leave Management', description: 'Request and manage PTO' },
    { icon: Shield, title: 'Secure Access', description: 'Role-based permissions' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {tenant?.logo_url ? (
                <img src={tenant.logo_url} alt={tenant.name} className="h-10 object-contain" />
              ) : (
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: primaryColor }}
                >
                  {tenant?.name?.charAt(0) || 'C'}
                </div>
              )}
              <span className="text-xl font-bold" style={{ color: primaryColor }}>
                {tenant?.name}
              </span>
            </div>
            
            <Link
              to={`/${tenantSlug}/login`}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              Employee Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {tenant?.logo_url ? (
              <img 
                src={tenant.logo_url} 
                alt={tenant.name} 
                className="h-20 object-contain mx-auto mb-8"
              />
            ) : (
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-8"
                style={{ backgroundColor: primaryColor }}
              >
                {tenant?.name?.charAt(0) || 'C'}
              </div>
            )}
            
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Welcome to {tenant?.name}
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Access your employee portal for time tracking, leave management, and more.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to={`/${tenantSlug}/login`}
                className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-xl transition-all hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Sign In to Portal
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
            What You Can Do
          </h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center p-6 rounded-xl bg-gray-50"
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: primaryColor }} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-100">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} {tenant?.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TenantLanding;
