import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

// This page is reserved for Super Admin login only
// Regular users should use tenant-specific login pages (e.g., /aurborbloom/login)
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError, isAuthenticated, user } = useAuth();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  // Check for 'superadmin' query param - if not present, redirect to default tenant login
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const isSuperAdminMode = urlParams.get('superadmin') === 'true';
    
    // If not super admin mode, redirect to AurborBloom tenant login
    if (!isSuperAdminMode && !isAuthenticated) {
      navigate('/aurborbloom/login', { replace: true });
    }
  }, [location.search, navigate, isAuthenticated]);

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
  }, [clearError]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (localError) {
      setLocalError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsLoading(true);
    setLocalError('');

    try {
      // Super Admin login uses 'aurborbloom' as the default tenant
      const result = await login(formData.email, formData.password, 'aurborbloom');
      
      if (result.success) {
        const userRole = result.user.role;
        
        // Only allow SUPER_ADMIN on this page
        if (userRole !== 'SUPER_ADMIN') {
          setLocalError('This login page is reserved for Super Admin only. Please use your company login page.');
          setIsLoading(false);
          return;
        }
        
        // Navigate to admin dashboard - use window.location for clean redirect
        window.location.href = '/admin/dashboard';
      } else {
        setLocalError(result.error || 'Login failed. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      setLocalError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <img 
              src="/aurborbloom_logo.png" 
              alt="AurborBloom" 
              className="h-12 mx-auto mb-4 brightness-0 invert"
            />
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-full text-sm font-semibold mb-4">
            <Shield className="w-4 h-4" />
            Super Admin Portal
          </div>
          <h1 className="text-2xl font-bold text-white">System Administrator</h1>
          <p className="text-gray-400 mt-2">Sign in to manage all tenants</p>
        </div>

        {/* Card */}
        <div className="bg-gray-800/50 backdrop-blur-md rounded-3xl shadow-xl p-8 border border-gray-700">
          {/* Error Message */}
          {(error || localError) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3"
              data-testid="login-error"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{localError || error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder="superadmin@aurborbloom.com"
                  required
                  data-testid="login-email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                  data-testid="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-900 hover:shadow-lg hover:shadow-amber-500/30 focus:ring-amber-500 px-6 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="login-submit"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Sign in as Super Admin
                </>
              )}
            </button>
          </form>

          {/* Info Text */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Not a Super Admin?{' '}
              <Link to="/aurborbloom/login" className="text-amber-400 font-medium hover:underline" data-testid="tenant-login-link">
                Go to company login
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-gray-500 hover:text-amber-400 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
