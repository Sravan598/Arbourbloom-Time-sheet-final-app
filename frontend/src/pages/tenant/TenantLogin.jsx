import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const TenantLogin = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const { login, error, clearError, isAuthenticated, user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('EMPLOYEE');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  
  // Tenant info
  const [tenant, setTenant] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantNotFound, setTenantNotFound] = useState(false);

  // Fetch tenant info on mount
  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const response = await axios.get(`${API}/api/tenants/${tenantSlug}/public`);
        setTenant(response.data);
      } catch (err) {
        console.error('Failed to fetch tenant:', err);
        setTenantNotFound(true);
      } finally {
        setTenantLoading(false);
      }
    };
    
    if (tenantSlug) {
      fetchTenant();
    }
  }, [tenantSlug]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/employee/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    clearError();
    setLocalError('');
  }, [activeTab]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (localError) setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError('');
    
    try {
      await login(formData.email, formData.password, tenantSlug);
    } catch (err) {
      setLocalError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic colors based on tenant
  const primaryColor = tenant?.primary_color || '#1a1a1a';

  // Loading state
  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: primaryColor, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // Tenant not found
  if (tenantNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Company Not Found</h1>
          <p className="text-gray-600 mb-6">
            The company &quot;{tenantSlug}&quot; doesn&apos;t exist or is no longer active.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          {tenant?.logo_url ? (
            <img 
              src={tenant.logo_url} 
              alt={tenant.name} 
              className="h-16 object-contain mb-8 brightness-0 invert"
            />
          ) : (
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl font-bold mb-8">
              {tenant?.name?.charAt(0) || 'C'}
            </div>
          )}
          
          <h1 className="text-4xl font-bold mb-4">
            Welcome to {tenant?.name}
          </h1>
          <p className="text-lg text-white/80 mb-8">
            Access your HR portal to manage time tracking, leave requests, and more.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <span>Track your work hours</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <span>Secure & private access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            {tenant?.logo_url ? (
              <img 
                src={tenant.logo_url} 
                alt={tenant.name} 
                className="h-12 object-contain mx-auto mb-4"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4"
                style={{ backgroundColor: primaryColor }}
              >
                {tenant?.name?.charAt(0) || 'C'}
              </div>
            )}
            <h1 className="text-xl font-bold" style={{ color: primaryColor }}>
              {tenant?.name}
            </h1>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
              <p className="text-gray-500 mt-1">Access your account</p>
            </div>

            {/* Role Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => setActiveTab('EMPLOYEE')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'EMPLOYEE'
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <User className="w-4 h-4" />
                Employee
              </button>
              <button
                onClick={() => setActiveTab('ADMIN')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'ADMIN'
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            </div>

            {/* Error Message */}
            {(localError || error) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{localError || error}</p>
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': primaryColor }}
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': primaryColor }}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 text-white font-medium rounded-xl transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  `Sign in as ${activeTab === 'ADMIN' ? 'Admin' : 'Employee'}`
                )}
              </button>
            </form>

            {/* Signup Link */}
            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{' '}
              <Link 
                to={`/${tenantSlug}/signup`}
                className="font-medium hover:underline"
                style={{ color: primaryColor }}
              >
                Sign up
              </Link>
            </p>
          </div>

          {/* Back to Landing */}
          <div className="text-center mt-6">
            <Link 
              to={`/${tenantSlug}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to {tenant?.name} Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantLogin;
