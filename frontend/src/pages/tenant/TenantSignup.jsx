import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, Shield, CheckCircle, Ticket } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Component to remove white background from logo
const TransparentLogo = ({ src, alt, className }) => {
  const [processedSrc, setProcessedSrc] = useState(null);

  useEffect(() => {
    if (!src) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Remove white/near-white pixels (make them transparent)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // If pixel is white or near-white, make it transparent
        if (r > 245 && g > 245 && b > 245) {
          data[i + 3] = 0; // Set alpha to 0
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      setProcessedSrc(canvas.toDataURL('image/png', 1.0));
    };
    
    img.src = src;
  }, [src]);

  if (!processedSrc) {
    return <div className={className} />;
  }

  return <img src={processedSrc} alt={alt} className={`${className} object-contain`} style={{ imageRendering: 'auto' }} />;
};

const TenantSignup = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  
  const [activeTab, setActiveTab] = useState('EMPLOYEE');
  const [formData, setFormData] = useState({ 
    name: '',
    email: '', 
    password: '',
    confirmPassword: '',
    inviteCode: '',
    adminCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Tenant info
  const [tenant, setTenant] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantNotFound, setTenantNotFound] = useState(false);
  
  // Invite code validation
  const [codeValid, setCodeValid] = useState(null);
  const [validatingCode, setValidatingCode] = useState(false);

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

  // Validate invite code
  useEffect(() => {
    const validateCode = async () => {
      if (activeTab === 'EMPLOYEE' && formData.inviteCode.length >= 10) {
        setValidatingCode(true);
        try {
          const response = await axios.get(`${API}/api/invitations/validate/${formData.inviteCode}`);
          setCodeValid(response.data.valid);
        } catch (err) {
          setCodeValid(false);
        } finally {
          setValidatingCode(false);
        }
      } else {
        setCodeValid(null);
      }
    };
    
    const timer = setTimeout(validateCode, 500);
    return () => clearTimeout(timer);
  }, [formData.inviteCode, activeTab]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (localError) setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError('');
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }
    
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: activeTab,
        tenant_id: tenantSlug
      };
      
      if (activeTab === 'EMPLOYEE') {
        payload.invitation_code = formData.inviteCode;
      } else {
        payload.admin_code = formData.adminCode;
      }
      
      await axios.post(`${API}/api/auth/signup`, payload);
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate(`/${tenantSlug}/login`);
      }, 2000);
      
    } catch (err) {
      setLocalError(err.response?.data?.detail || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic colors based on tenant
  const primaryColor = tenant?.primary_color || '#1a1a1a';
  const secondaryColor = tenant?.secondary_color || '#E53935';
  
  // Determine if primary is dark (use secondary for buttons)
  const isDarkPrimary = primaryColor === '#1a1a1a' || primaryColor === '#000000' || primaryColor?.toLowerCase() === '#1a1a1a';
  const buttonColor = isDarkPrimary ? secondaryColor : primaryColor;

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

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center"
        >
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: primaryColor }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h1>
          <p className="text-gray-600 mb-6">
            Your account has been created successfully. Redirecting to login...
          </p>
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: primaryColor, borderTopColor: 'transparent' }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding with Gradient */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ 
          background: secondaryColor 
            ? `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
            : primaryColor 
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          {/* Logo with frosted glass effect */}
          {tenant?.logo_url ? (
            <div className="mb-8">
              <div className="inline-flex items-center px-6 py-4 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl">
                <img 
                  src={tenant.logo_url} 
                  alt={tenant.name}
                  className="h-14 object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl font-bold mb-8">
              {tenant?.name?.charAt(0) || 'C'}
            </div>
          )}
          
          <h1 className="text-4xl font-bold mb-4">
            Join {tenant?.name}
          </h1>
          <p className="text-lg text-white/80">
            Create your account to access the HR portal.
          </p>
        </div>
      </div>

      {/* Right side - Signup Form */}
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
              <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
              <p className="text-gray-500 mt-1">Sign up to get started</p>
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
            {localError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{localError}</p>
              </motion.div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Invite/Admin Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {activeTab === 'EMPLOYEE' ? 'Invitation Code' : 'Admin Signup Code'}
                </label>
                <div className="relative">
                  <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name={activeTab === 'EMPLOYEE' ? 'inviteCode' : 'adminCode'}
                    value={activeTab === 'EMPLOYEE' ? formData.inviteCode : formData.adminCode}
                    onChange={handleChange}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': primaryColor }}
                    placeholder={activeTab === 'EMPLOYEE' ? 'INV-XXXXXX' : 'Enter admin code'}
                    required
                  />
                  {activeTab === 'EMPLOYEE' && formData.inviteCode && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {validatingCode ? (
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                      ) : codeValid === true ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : codeValid === false ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : null}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {activeTab === 'EMPLOYEE' 
                    ? 'Get this code from your administrator'
                    : 'Contact support if you need an admin code'
                  }
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': primaryColor }}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

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
                    placeholder="Create password"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': primaryColor }}
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || (activeTab === 'EMPLOYEE' && codeValid === false)}
                className="w-full py-3 text-white font-medium rounded-xl transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: buttonColor }}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link 
                to={`/${tenantSlug}/login`}
                className="font-medium hover:underline"
                style={{ color: buttonColor }}
              >
                Sign in
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

export default TenantSignup;
