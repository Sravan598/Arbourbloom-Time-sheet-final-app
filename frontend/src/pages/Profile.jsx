import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  LogOut,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building,
  Shield,
  Bell,
  Palette,
  Clock,
  Camera,
  Save,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  UserCircle,
  Heart,
  Globe,
  Copy,
  RefreshCw,
  ExternalLink,
  CalendarDays
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('personal');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Calendar integration state
  const [calendarFeeds, setCalendarFeeds] = useState(null);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/profile`);
      setProfile(response.data);
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Fetch calendar feeds when calendar tab is active
  const fetchCalendarFeeds = useCallback(async () => {
    setIsLoadingCalendar(true);
    try {
      const response = await axios.get(`${API}/calendar/token`);
      setCalendarFeeds(response.data);
    } catch (err) {
      console.error('Failed to load calendar feeds:', err);
    } finally {
      setIsLoadingCalendar(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'calendar' && !calendarFeeds) {
      fetchCalendarFeeds();
    }
  }, [activeTab, calendarFeeds, fetchCalendarFeeds]);

  const copyToClipboard = async (text, feedType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFeed(feedType);
      setTimeout(() => setCopiedFeed(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const regenerateToken = async (feedType) => {
    try {
      const response = await axios.post(`${API}/calendar/regenerate-token?feed_type=${feedType}`);
      setCalendarFeeds(prev => ({
        ...prev,
        [feedType === 'personal' ? 'personal_feed' : 'team_feed']: {
          ...prev?.[feedType === 'personal' ? 'personal_feed' : 'team_feed'],
          token: response.data.token,
          url: response.data.url
        }
      }));
      setSuccess('Calendar URL regenerated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to regenerate calendar URL');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleInputChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleEmergencyContactChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      emergency_contact: {
        ...(prev.emergency_contact || {}),
        [field]: value
      }
    }));
  };

  const handleNotificationChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      notification_preferences: {
        ...(prev.notification_preferences || {
          clock_in_out_email: false,
          daily_summary: false,
          weekly_reminder: true,
          leave_updates: true,
          overtime_warnings: true,
          announcements: true
        }),
        [field]: value
      }
    }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const updateData = {
        name: profile.name,
        phone: profile.phone,
        date_of_birth: profile.date_of_birth,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        time_zone: profile.time_zone,
        theme_preference: profile.theme_preference,
        emergency_contact: profile.emergency_contact,
        notification_preferences: profile.notification_preferences
      };
      
      const response = await axios.put(`${API}/profile`, updateData);
      setProfile(response.data);
      setSuccess('Profile updated successfully!');
      
      // Update auth context if name changed
      if (updateUser && response.data.name !== user?.name) {
        updateUser({ ...user, name: response.data.name });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const response = await axios.put(`${API}/profile/image`, {
          image: reader.result
        });
        setProfile(prev => ({ ...prev, profile_image: response.data.image }));
        setSuccess('Profile image updated!');
      } catch (err) {
        setError('Failed to upload image');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteImage = async () => {
    try {
      await axios.delete(`${API}/profile/image`);
      setProfile(prev => ({ ...prev, profile_image: null }));
      setSuccess('Profile image removed');
    } catch (err) {
      setError('Failed to delete image');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordForm.new_password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setIsChangingPassword(true);
    setError('');
    
    try {
      await axios.put(`${API}/profile/change-password`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      setSuccess('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'work', label: 'Work Info', icon: Briefcase },
    { id: 'emergency', label: 'Emergency', icon: Heart },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'settings', label: 'Settings', icon: Shield }
  ];

  const timeZones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 
    'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo',
    'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney'
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';
  const dashboardLink = isAdmin ? '/admin/dashboard' : '/employee/dashboard';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                to={dashboardLink}
                className="p-2 text-gray-500 hover:text-brand-dark hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-brand-dark">My Profile</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError('')} className="ml-auto">
                <X className="w-4 h-4 text-red-500" />
              </button>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3"
            >
              <Check className="w-5 h-5 text-green-500" />
              <p className="text-green-700">{success}</p>
              <button onClick={() => setSuccess('')} className="ml-auto">
                <X className="w-4 h-4 text-green-500" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                {profile?.profile_image ? (
                  <img 
                    src={profile.profile_image} 
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-red to-brand-red-dark">
                    <span className="text-4xl font-bold text-white">
                      {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-9 h-9 bg-brand-red text-white rounded-full flex items-center justify-center shadow-lg hover:bg-brand-red-dark transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            
            {/* Basic Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-brand-dark">{profile?.name}</h2>
              <p className="text-gray-500">{profile?.job_title || 'Employee'}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-3">
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  {profile?.email}
                </span>
                {profile?.phone && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    {profile.phone}
                  </span>
                )}
                {(profile?.city || profile?.country) && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {[profile.city, profile.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
              {profile?.profile_image && (
                <button 
                  onClick={handleDeleteImage}
                  className="text-sm text-red-500 hover:text-red-700 mt-2"
                >
                  Remove photo
                </button>
              )}
            </div>
            
            {/* Role Badge */}
            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
              isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isAdmin ? 'Administrator' : 'Employee'}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          {/* Personal Info Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-brand-dark flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-brand-red" />
                Personal Information
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profile?.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={profile?.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={profile?.date_of_birth || ''}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
              </div>
              
              <h4 className="text-md font-semibold text-brand-dark flex items-center gap-2 pt-4 border-t">
                <MapPin className="w-4 h-4 text-brand-red" />
                Address
              </h4>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                  <input
                    type="text"
                    value={profile?.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="123 Main Street, Apt 4B"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={profile?.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="New York"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                  <input
                    type="text"
                    value={profile?.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="NY"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={profile?.country || ''}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="United States"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Work Info Tab */}
          {activeTab === 'work' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-brand-dark flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-brand-red" />
                Work Information
              </h3>
              <p className="text-sm text-gray-500">This information is managed by your administrator.</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                  <input
                    type="text"
                    value={profile?.employee_id || 'Not assigned'}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <input
                    type="text"
                    value={profile?.department || 'Not assigned'}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                  <input
                    type="text"
                    value={profile?.job_title || 'Not assigned'}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                  <input
                    type="text"
                    value={profile?.employment_type || 'Not specified'}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Join Date</label>
                  <input
                    type="text"
                    value={profile?.join_date || 'Not specified'}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Work Location</label>
                  <input
                    type="text"
                    value={profile?.work_location || 'Not specified'}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contact Tab */}
          {activeTab === 'emergency' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-brand-dark flex items-center gap-2">
                <Heart className="w-5 h-5 text-brand-red" />
                Emergency Contact
              </h3>
              <p className="text-sm text-gray-500">This person will be contacted in case of emergency.</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                  <input
                    type="text"
                    value={profile?.emergency_contact?.name || ''}
                    onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={profile?.emergency_contact?.phone || ''}
                    onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                    placeholder="+1 (555) 987-6543"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                  <select
                    value={profile?.emergency_contact?.relation || ''}
                    onChange={(e) => handleEmergencyContactChange('relation', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  >
                    <option value="">Select relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div className="space-y-8">
              {/* Info Section */}
              <div className="bg-gradient-to-r from-brand-red/5 to-red-50 rounded-xl p-6 border border-brand-red/10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-red/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-6 h-6 text-brand-red" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-dark mb-1">Calendar Integration</h3>
                    <p className="text-sm text-gray-600">
                      Subscribe to your CORtracker calendar to see your approved leave and PTO events in Google Calendar, 
                      Outlook, Apple Calendar, or any calendar app that supports ICS feeds.
                    </p>
                  </div>
                </div>
              </div>

              {isLoadingCalendar ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Personal Feed */}
                  {calendarFeeds?.personal_feed && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-brand-dark">Personal Calendar</h4>
                            <p className="text-sm text-gray-500">{calendarFeeds.personal_feed.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Calendar URL</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={`${BACKEND_URL}${calendarFeeds.personal_feed.url}`}
                              className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600 font-mono"
                            />
                            <button
                              onClick={() => copyToClipboard(`${BACKEND_URL}${calendarFeeds.personal_feed.url}`, 'personal')}
                              className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
                                copiedFeed === 'personal'
                                  ? 'bg-green-50 border-green-200 text-green-600'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {copiedFeed === 'personal' ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => regenerateToken('personal')}
                            className="text-sm text-gray-500 hover:text-brand-red flex items-center gap-2 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Regenerate URL
                          </button>
                          <a
                            href={`${BACKEND_URL}${calendarFeeds.personal_feed.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-brand-red hover:text-red-700 flex items-center gap-2 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Download ICS
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Team Feed (Admin Only) */}
                  {calendarFeeds?.team_feed && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Building className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-brand-dark">Team Calendar</h4>
                            <p className="text-sm text-gray-500">{calendarFeeds.team_feed.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Calendar URL</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={`${BACKEND_URL}${calendarFeeds.team_feed.url}`}
                              className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600 font-mono"
                            />
                            <button
                              onClick={() => copyToClipboard(`${BACKEND_URL}${calendarFeeds.team_feed.url}`, 'team')}
                              className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
                                copiedFeed === 'team'
                                  ? 'bg-green-50 border-green-200 text-green-600'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {copiedFeed === 'team' ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => regenerateToken('team')}
                            className="text-sm text-gray-500 hover:text-brand-red flex items-center gap-2 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Regenerate URL
                          </button>
                          <a
                            href={`${BACKEND_URL}${calendarFeeds.team_feed.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-brand-red hover:text-red-700 flex items-center gap-2 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Download ICS
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* How to Add Instructions */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <h4 className="font-semibold text-brand-dark">How to Subscribe</h4>
                    </div>
                    <div className="p-6">
                      <div className="grid md:grid-cols-3 gap-6">
                        {/* Google Calendar */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                              <span className="text-lg">📅</span>
                            </div>
                            <span className="font-medium text-brand-dark">Google Calendar</span>
                          </div>
                          <ol className="text-sm text-gray-600 space-y-2 pl-4 list-decimal">
                            <li>Open Google Calendar</li>
                            <li>Click "+" next to "Other calendars"</li>
                            <li>Select "From URL"</li>
                            <li>Paste the calendar URL</li>
                            <li>Click "Add calendar"</li>
                          </ol>
                        </div>

                        {/* Outlook */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <span className="text-lg">📧</span>
                            </div>
                            <span className="font-medium text-brand-dark">Outlook</span>
                          </div>
                          <ol className="text-sm text-gray-600 space-y-2 pl-4 list-decimal">
                            <li>Open Outlook Calendar</li>
                            <li>Click "Add calendar"</li>
                            <li>Select "Subscribe from web"</li>
                            <li>Paste the calendar URL</li>
                            <li>Click "Import"</li>
                          </ol>
                        </div>

                        {/* Apple Calendar */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-lg">🍎</span>
                            </div>
                            <span className="font-medium text-brand-dark">Apple Calendar</span>
                          </div>
                          <ol className="text-sm text-gray-600 space-y-2 pl-4 list-decimal">
                            <li>Open Calendar app</li>
                            <li>File → New Calendar Subscription</li>
                            <li>Paste the calendar URL</li>
                            <li>Click "Subscribe"</li>
                            <li>Choose update frequency</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Security Section */}
              <div>
                <h3 className="text-lg font-semibold text-brand-dark flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-brand-red" />
                  Security
                </h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-brand-dark">Change Password</p>
                        <p className="text-sm text-gray-500">Update your account password</p>
                      </div>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
                  </button>
                </div>
              </div>

              {/* Preferences Section */}
              <div>
                <h3 className="text-lg font-semibold text-brand-dark flex items-center gap-2 mb-4">
                  <Palette className="w-5 h-5 text-brand-red" />
                  Preferences
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                    <select
                      value={profile?.theme_preference || 'light'}
                      onChange={(e) => handleInputChange('theme_preference', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                    >
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
                    <select
                      value={profile?.time_zone || 'UTC'}
                      onChange={(e) => handleInputChange('time_zone', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                    >
                      {timeZones.map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notifications Section */}
              <div>
                <h3 className="text-lg font-semibold text-brand-dark flex items-center gap-2 mb-4">
                  <Bell className="w-5 h-5 text-brand-red" />
                  Email Notifications
                </h3>
                
                <div className="space-y-3">
                  {[
                    { key: 'clock_in_out_email', label: 'Clock in/out confirmations', desc: 'Get email when you clock in or out' },
                    { key: 'daily_summary', label: 'Daily summary', desc: 'Receive daily work hour summary' },
                    { key: 'weekly_reminder', label: 'Weekly timesheet reminder', desc: 'Reminder to review your timesheet' },
                    { key: 'leave_updates', label: 'Leave request updates', desc: 'Notifications for leave status changes' },
                    { key: 'overtime_warnings', label: 'Overtime warnings', desc: 'Alert when approaching overtime' },
                    { key: 'announcements', label: 'Company announcements', desc: 'Important company updates' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-brand-dark">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => handleNotificationChange(
                          item.key, 
                          !profile?.notification_preferences?.[item.key]
                        )}
                        className={`w-12 h-7 rounded-full transition-colors relative ${
                          profile?.notification_preferences?.[item.key]
                            ? 'bg-brand-red'
                            : 'bg-gray-300'
                        }`}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          profile?.notification_preferences?.[item.key]
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-brand-dark">Change Password</h3>
                <button onClick={() => setShowPasswordModal(false)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Change Password'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
