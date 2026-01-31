import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, Shield, Building2, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError, isAuthenticated, user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('EMPLOYEE');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  
  // Multi-tenant state
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  // Fetch available tenants on mount
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await axios.get(`${API}/api/tenants/public`);
        setTenants(response.data);
        
        // Check for tenant preselection from URL params or referrer
        const urlParams = new URLSearchParams(location.search);
        const preselectedSlug = urlParams.get('tenant');
        const referrerPath = location.state?.from?.pathname || '';
        
        // Try to find preselected tenant
        let targetTenant = null;
        
        if (preselectedSlug) {
          targetTenant = response.data.find(t => t.slug === preselectedSlug);
        } else if (referrerPath.includes('perfectsolutions')) {
          targetTenant = response.data.find(t => t.slug === 'perfectsolutions');
        }
        
        // Auto-select tenant
        if (targetTenant) {
          setSelectedTenant(targetTenant);
        } else if (response.data.length > 0) {
          const defaultTenant = response.data.find(t => t.slug === 'aurborbloom') || response.data[0];
          setSelectedTenant(defaultTenant);
        }
      } catch (err) {
        console.error('Failed to fetch tenants:', err);
        // Set default tenant on error
        setSelectedTenant({
          slug: 'aurborbloom',
          name: 'AurborBloom',
          logo_url: null,
          primary_color: '#1a1a1a'
        });
      } finally {
        setTenantsLoading(false);
      }
    };
    
    fetchTenants();
  }, [location.search, location.state]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/employee/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  useEffect(() => {
    clearError();
    setLocalError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (localError) {
      setLocalError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTenant) {
      setLocalError('Please select a company');
      return;
    }
    
    setIsLoading(true);
    setLocalError('');

    try {
      const result = await login(formData.email, formData.password, selectedTenant.slug);
      
      if (result.success) {
        const userRole = result.user.role;
        
        // Check if user is logging in with correct tab (allow SUPER_ADMIN on Admin tab)
        if (activeTab === 'EMPLOYEE' && userRole !== 'EMPLOYEE') {
          setLocalError(`This account is registered as ${userRole}. Please use the Admin login tab.`);
          setIsLoading(false);
          return;
        }
        
        if (activeTab === 'ADMIN' && userRole === 'EMPLOYEE') {
          setLocalError(`This account is registered as Employee. Please use the Employee login tab.`);
          setIsLoading(false);
          return;
        }
        
        if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
          navigate('/admin/dashboard');
        } else {
          navigate('/employee/dashboard');
        }
      } else {
        setLocalError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setLocalError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectTenant = (tenant) => {
    setSelectedTenant(tenant);
    setShowTenantDropdown(false);
    setLocalError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo - Show selected tenant logo or default */}
        <div className="text-center mb-8">
          <Link to="/">
            {selectedTenant?.logo_url ? (
              <img 
                src={selectedTenant.logo_url} 
                alt={selectedTenant.name} 
                className="h-12 mx-auto mb-4 object-contain"
              />
            ) : selectedTenant?.slug === 'aurborbloom' || !selectedTenant ? (
              <img 
                src="/aurborbloom_logo.png" 
                alt="AurborBloom" 
                className="h-12 mx-auto mb-4"
              />
            ) : (
              <div className="flex items-center justify-center gap-2 mb-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: selectedTenant?.primary_color || '#1a1a1a' }}
                >
                  {selectedTenant?.name?.charAt(0) || 'C'}
                </div>
              </div>
            )}
          </Link>
          <h1 className="text-2xl font-bold text-brand-dark">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to {selectedTenant?.name || 'your dashboard'}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* Tenant Selector */}
          {tenants.length > 1 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-brand-dark mb-2">
                Select Company
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTenantDropdown(!showTenantDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 focus:ring-2 focus:ring-brand-black focus:border-transparent transition-all bg-white"
                  data-testid="tenant-selector"
                >
                  <div className="flex items-center gap-3">
                    {selectedTenant?.logo_url ? (
                      <img 
                        src={selectedTenant.logo_url} 
                        alt="" 
                        className="w-6 h-6 object-contain rounded"
                      />
                    ) : (
                      <Building2 className="w-5 h-5 text-gray-400" />
                    )}
                    <span className={selectedTenant ? 'text-brand-dark' : 'text-gray-400'}>
                      {selectedTenant ? selectedTenant.name : 'Select a company'}
                    </span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showTenantDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showTenantDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-20 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                    >
                      {tenants.map((tenant) => (
                        <button
                          key={tenant.slug}
                          onClick={() => selectTenant(tenant)}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                            selectedTenant?.slug === tenant.slug ? 'bg-gray-50' : ''
                          }`}
                          data-testid={`tenant-option-${tenant.slug}`}
                        >
                          {tenant.logo_url ? (
                            <img 
                              src={tenant.logo_url} 
                              alt="" 
                              className="w-6 h-6 object-contain rounded"
                            />
                          ) : (
                            <div 
                              className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: tenant.primary_color }}
                            >
                              {tenant.name.charAt(0)}
                            </div>
                          )}
                          <span className="flex-1 text-left text-brand-dark">{tenant.name}</span>
                          {selectedTenant?.slug === tenant.slug && (
                            <Check className="w-5 h-5 text-green-500" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Role Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setActiveTab('EMPLOYEE')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'EMPLOYEE'
                  ? 'bg-white text-brand-dark shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid="employee-tab"
            >
              <User className="w-4 h-4" />
              Employee
            </button>
            <button
              onClick={() => setActiveTab('ADMIN')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'ADMIN'
                  ? 'bg-white text-brand-dark shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid="admin-tab"
            >
              <Shield className="w-4 h-4" />
              Admin
            </button>
          </div>

          {/* Error Message */}
          {(error || localError) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3"
              data-testid="login-error"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-800 text-sm">{localError || error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent transition-all"
                  placeholder="you@company.com"
                  required
                  data-testid="login-email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-dark mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                  data-testid="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-brand-black focus:ring-brand-black" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-brand-black hover:underline">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || tenantsLoading}
              className="w-full inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gradient-to-r from-brand-black to-brand-black-dark text-white hover:shadow-lg hover:shadow-brand-black/30 focus:ring-brand-black px-6 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="login-submit"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                `Sign in as ${activeTab === 'ADMIN' ? 'Admin' : 'Employee'}`
              )}
            </button>
          </form>

          {/* Signup Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-brand-black font-medium hover:underline" data-testid="signup-link">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-gray-500 hover:text-brand-black transition-colors">
            ← Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
