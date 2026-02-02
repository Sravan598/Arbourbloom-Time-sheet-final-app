import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, Shield, ArrowLeft, Sparkles } from 'lucide-react';
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

  // Check if this is AurborBloom tenant
  const isAurborBloom = tenantSlug === 'aurborbloom';

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
      sessionStorage.removeItem('logout_redirect_tenant');
    }
  }, [tenantSlug]);

  // Redirect if already authenticated AND same tenant
  useEffect(() => {
    if (isAuthenticated && user) {
      const userTenant = user.tenant_id || localStorage.getItem('cortracker_tenant');
      
      if (userTenant === tenantSlug || user.role === 'SUPER_ADMIN') {
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/employee/dashboard', { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, navigate, tenantSlug]);

  useEffect(() => {
    clearError();
    setLocalError('');
  }, [activeTab, clearError]);

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
  const secondaryColor = tenant?.secondary_color || '#D4AF37';
  
  const isDarkPrimary = primaryColor === '#1a1a1a' || primaryColor === '#000000';
  const buttonColor = isDarkPrimary ? secondaryColor : primaryColor;

  // Loading state
  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="w-8 h-8 border-2 rounded-full animate-spin border-brand-accent border-t-transparent" />
      </div>
    );
  }

  // Tenant not found
  if (tenantNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
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

  // AurborBloom themed login page
  if (isAurborBloom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
        {/* Background decorative elements - matching landing page */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-black/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-brand-silver/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-brand-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md px-4">
          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <Link 
              to="/"
              className="inline-flex items-center text-sm text-gray-500 hover:text-brand-black transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Home
            </Link>
          </motion.div>

          {/* Logo and Branding */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            {/* Animated Logo Container */}
            <div className="relative inline-block mb-4">
              {/* Glow effect behind logo */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.img
                src="/aurborbloom_logo_transparent.png"
                alt="AurborBloom"
                className="h-20 w-auto relative z-10 mx-auto"
                animate={{
                  scale: [1, 1.03, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </div>
            
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-black/10 text-brand-black rounded-full text-xs font-semibold mb-3"
            >
              <Sparkles className="w-3 h-3" />
              HR Management System
            </motion.span>
            
            <h1 className="text-2xl font-bold text-brand-dark">Welcome Back</h1>
            <p className="text-gray-500 mt-1">Sign in to your AurborBloom account</p>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-black/5 border border-white/50 p-8"
          >
            {/* Role Tabs */}
            <div className="flex bg-gray-100 rounded-2xl p-1.5 mb-6">
              <button
                onClick={() => setActiveTab('EMPLOYEE')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'EMPLOYEE'
                    ? 'bg-white shadow-md text-brand-black'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <User className="w-4 h-4" />
                Employee
              </button>
              <button
                onClick={() => setActiveTab('ADMIN')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'ADMIN'
                    ? 'bg-white shadow-md text-brand-black'
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
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all bg-white/50"
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
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all bg-white/50"
                    placeholder="Enter your password"
                    required
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

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-4 bg-gradient-to-r from-brand-black to-gray-800 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-brand-black/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  `Sign in as ${activeTab === 'ADMIN' ? 'Admin' : 'Employee'}`
                )}
              </motion.button>
            </form>

            {/* Signup Link */}
            <p className="text-center text-sm text-gray-500 mt-6">
              Don&apos;t have an account?{' '}
              <Link 
                to="/aurborbloom/signup"
                className="font-semibold text-brand-black hover:underline"
              >
                Sign up free
              </Link>
            </p>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex flex-wrap gap-4 justify-center text-xs text-gray-400"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span>Secure login</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span>256-bit encryption</span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Default login page for other tenants
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding with Solid Color */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: 'white' }} />
          <div className="absolute top-1/3 -left-10 w-48 h-48 rounded-full opacity-5" style={{ backgroundColor: 'white' }} />
          <div className="absolute bottom-20 left-1/4 w-32 h-32 rounded-full opacity-5" style={{ backgroundColor: 'white' }} />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          {/* Logo in white card - Left aligned */}
          {tenant?.logo_url ? (
            <div className="mb-10">
              <div className="inline-flex bg-white rounded-2xl p-5 shadow-lg">
                <img 
                  src={tenant.logo_url} 
                  alt={tenant.name}
                  className="h-16 w-auto object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl font-bold mb-10 border border-white/20">
              {tenant?.name?.charAt(0) || 'C'}
            </div>
          )}
          
          <h1 className="text-4xl font-bold mb-4">
            Welcome to {tenant?.name}
          </h1>
          <p className="text-lg text-white/70 mb-10 max-w-md">
            Access your HR portal to manage time tracking, leave requests, and more.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <span className="text-white/90">Track your work hours</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-white/90">Secure & private access</span>
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
                style={{ backgroundColor: buttonColor }}
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
              Don&apos;t have an account?{' '}
              <Link 
                to={`/${tenantSlug}/signup`}
                className="font-medium hover:underline"
                style={{ color: buttonColor }}
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
