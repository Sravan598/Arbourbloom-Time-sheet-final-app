import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, KeyRound, Ticket, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

const API = process.env.REACT_APP_BACKEND_URL;

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup, error, clearError, isAuthenticated, user } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    adminInviteCode: '',
    employeeInviteCode: searchParams.get('code') || ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [invitationValid, setInvitationValid] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/employee/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    clearError();
    setLocalError('');
  }, [clearError]);

  // Validate invitation code from URL
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      validateInvitationCode(codeFromUrl);
    }
  }, [searchParams]);

  const validateInvitationCode = async (code) => {
    if (!code || code.length < 4) {
      setInvitationValid(false);
      return;
    }
    
    setValidatingCode(true);
    try {
      const response = await fetch(`${API}/api/invitations/validate/${code}`);
      if (response.ok) {
        const data = await response.json();
        setInvitationValid(true);
        // Pre-fill email if available
        if (data.email) {
          setFormData(prev => ({ ...prev, email: data.email }));
        }
        setLocalError('');
      } else {
        setInvitationValid(false);
        const errorData = await response.json();
        setLocalError(errorData.detail || 'Invalid invitation code');
      }
    } catch (err) {
      setInvitationValid(false);
      setLocalError('Failed to validate invitation code');
    }
    setValidatingCode(false);
  };

  const handleInviteCodeBlur = () => {
    if (formData.employeeInviteCode && !showAdminCode) {
      validateInvitationCode(formData.employeeInviteCode);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Require either admin code or employee invite code
    if (!formData.adminInviteCode && !formData.employeeInviteCode) {
      errors.employeeInviteCode = 'Invitation code is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setValidationErrors({ ...validationErrors, [e.target.name]: '' });
    setLocalError('');
    
    // Reset invitation validity when code changes
    if (e.target.name === 'employeeInviteCode') {
      setInvitationValid(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setLocalError('');

    const role = formData.adminInviteCode ? 'ADMIN' : 'EMPLOYEE';
    const result = await signup(
      formData.name,
      formData.email,
      formData.password,
      role,
      formData.adminInviteCode || null,
      formData.employeeInviteCode || null
    );
    
    if (result.success) {
      if (result.user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    }
    
    setIsLoading(false);
  };

  // Handle Google Sign Up
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleSignUp = () => {
    const redirectUrl = window.location.origin + '/employee/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-4 py-8">
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
              className="h-12 mx-auto mb-4"
            />
          </Link>
          <h1 className="text-2xl font-bold text-brand-dark">Create Account</h1>
          <p className="text-gray-600 mt-2">Join AurborBloom to start tracking your time</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* Error Message */}
          {(error || localError) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3"
              data-testid="signup-error"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-800 text-sm">{localError || error}</p>
            </motion.div>
          )}

          {/* Google Sign Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors mb-4"
            data-testid="google-signup-btn"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium text-gray-700">Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or sign up with invitation code</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Invitation Code - Required for Employees */}
            {!showAdminCode && (
              <div>
                <label className="block text-sm font-medium text-brand-dark mb-2">
                  Invitation Code *
                </label>
                <div className="relative">
                  <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="employeeInviteCode"
                    value={formData.employeeInviteCode}
                    onChange={handleChange}
                    onBlur={handleInviteCodeBlur}
                    className={`w-full pl-12 pr-12 py-3 rounded-xl border ${
                      validationErrors.employeeInviteCode ? 'border-red-500' : 
                      invitationValid ? 'border-green-500' : 'border-gray-200'
                    } focus:ring-2 focus:ring-brand-black focus:border-transparent transition-all uppercase`}
                    placeholder="INV-XXXXXX"
                    data-testid="signup-invite-code"
                  />
                  {validatingCode && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {invitationValid && !validatingCode && (
                    <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
                {validationErrors.employeeInviteCode && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.employeeInviteCode}</p>
                )}
                {invitationValid && (
                  <p className="mt-1 text-sm text-green-600">✓ Valid invitation code</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Ask your administrator for an invitation code
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-brand-dark mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                    validationErrors.name ? 'border-red-500' : 'border-gray-200'
                  } focus:ring-2 focus:ring-brand-black focus:border-transparent transition-all`}
                  placeholder="John Doe"
                  required
                  data-testid="signup-name"
                />
              </div>
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-dark mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                    validationErrors.email ? 'border-red-500' : 'border-gray-200'
                  } focus:ring-2 focus:ring-brand-black focus:border-transparent transition-all`}
                  placeholder="you@company.com"
                  required
                  data-testid="signup-email"
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-dark mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-12 pr-12 py-3 rounded-xl border ${
                    validationErrors.password ? 'border-red-500' : 'border-gray-200'
                  } focus:ring-2 focus:ring-brand-black focus:border-transparent transition-all`}
                  placeholder="Min. 6 characters"
                  required
                  data-testid="signup-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-dark mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                    validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                  } focus:ring-2 focus:ring-brand-black focus:border-transparent transition-all`}
                  placeholder="Confirm your password"
                  required
                  data-testid="signup-confirm-password"
                />
              </div>
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.confirmPassword}</p>
              )}
            </div>

            {/* Admin Invite Code Toggle */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminCode(!showAdminCode);
                  if (!showAdminCode) {
                    setFormData(prev => ({ ...prev, employeeInviteCode: '' }));
                  } else {
                    setFormData(prev => ({ ...prev, adminInviteCode: '' }));
                  }
                }}
                className="text-sm text-brand-black hover:underline flex items-center gap-1"
              >
                <KeyRound className="w-4 h-4" />
                {showAdminCode ? 'Sign up as Employee instead' : 'Sign up as Admin?'}
              </button>
              
              {showAdminCode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3"
                >
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="adminInviteCode"
                      value={formData.adminInviteCode}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent transition-all"
                      placeholder="Enter admin invite code"
                      data-testid="signup-admin-code"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Admin code is required for administrator access
                  </p>
                </motion.div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
              data-testid="signup-submit"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-black font-medium hover:underline" data-testid="login-link">
                Sign in
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

export default Signup;
