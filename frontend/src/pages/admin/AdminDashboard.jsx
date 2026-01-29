import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  Users, 
  Clock, 
  AlertCircle,
  TrendingUp,
  CheckCircle,
  XCircle,
  User,
  ChevronDown,
  Settings
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { Button } from '../../components/ui/Button';
import AdminTeamProgressSection from '../../components/admin/AdminTeamProgressSection';
import AdminAnnouncementsSection from '../../components/admin/AdminAnnouncementsSection';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { NotificationBell } from '../../components/notifications';
import Logo3D from '../../components/Logo3D';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { tenant, getTenantName } = useTenant();
  const profileDropdownRef = useRef(null);
  
  const [stats, setStats] = useState(null);
  const [pendingCorrections, setPendingCorrections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profileData, setProfileData] = useState(null);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API}/profile`);
        setProfileData(response.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, correctionsRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard-stats`),
        axios.get(`${API}/admin/correction-requests?status=PENDING`)
      ]);
      
      setStats(statsRes.data);
      setPendingCorrections(correctionsRes.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCorrectionAction = async (requestId, status, adminNotes = '') => {
    try {
      await axios.put(`${API}/admin/correction-requests/${requestId}`, {
        status,
        admin_notes: adminNotes
      });
      setSuccess(`Correction request ${status.toLowerCase()}`);
      fetchData();
    } catch (err) {
      setError('Failed to process correction request');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold" style={{ color: tenant.primary_color }}>
                  {getTenantName()} Dashboard
                </h1>
                <p className="text-sm text-gray-500">Welcome back, {profileData?.name || user?.name}</p>
              </div>
              
              {/* Profile Dropdown and Notification */}
              <div className="flex items-center gap-4">
                {/* Profile Dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-2 hover:bg-gray-100 rounded-full py-1 pl-1 pr-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border-2 border-purple-200">
                      {profileData?.profile_image ? (
                        <img 
                          src={profileData.profile_image} 
                          alt={profileData?.name || user?.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700">
                          <span className="text-sm font-bold text-white">
                            {(profileData?.name || user?.name)?.charAt(0)?.toUpperCase() || 'A'}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="hidden sm:inline font-medium text-brand-dark text-sm">
                      {profileData?.name || user?.name}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showProfileDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50"
                      >
                        {/* Profile Header */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Admin</span>
                          </div>
                          <p className="font-semibold text-brand-dark mt-1">{profileData?.name || user?.name}</p>
                          <p className="text-sm text-gray-500 truncate">{profileData?.email || user?.email}</p>
                        </div>
                        
                        {/* Menu Items */}
                        <div className="py-1">
                          <Link
                            to="/profile"
                            onClick={() => setShowProfileDropdown(false)}
                            className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <User className="w-4 h-4" />
                            <span>My Profile</span>
                          </Link>
                          <Link
                            to="/profile"
                            onClick={() => setShowProfileDropdown(false)}
                            className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                            <span>Settings</span>
                          </Link>
                        </div>
                        
                        {/* Logout */}
                        <div className="border-t border-gray-100 pt-1">
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              handleLogout();
                            }}
                            className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-red-50 transition-colors w-full"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Notification Bell */}
                <NotificationBell />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-8">
        {/* Status Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-gray-800">{error}</p>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-700">{success}</p>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-black/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-brand-black" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-dark">{stats?.total_hours_this_week || 0}h</p>
                <p className="text-sm text-gray-500">Hours This Week</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-dark">{stats?.active_employees || 0}</p>
                <p className="text-sm text-gray-500">Currently Active</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-dark">{stats?.total_pending_requests || 0}</p>
                <p className="text-sm text-gray-500">Pending Requests</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-dark">{stats?.total_employees || 0}</p>
                <p className="text-sm text-gray-500">Total Employees</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Pending Correction Requests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-brand-dark">Pending Corrections</h2>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                {pendingCorrections.length} pending
              </span>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {pendingCorrections.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                  <p className="text-gray-500">No pending correction requests</p>
                </div>
              ) : (
                pendingCorrections.map((req) => (
                  <div key={req.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-brand-dark">{req.user_name}</p>
                        <p className="text-sm text-gray-500">
                          Submitted {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        Pending
                      </span>
                    </div>
                    
                    {/* Requested Changes */}
                    {req.requested_change && (
                      <div className="bg-white rounded-lg p-3 mb-3 text-sm">
                        <p className="font-medium text-gray-700 mb-2">Requested Changes:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {req.requested_change.clock_in_at && (
                            <div>
                              <span className="text-gray-500">New Clock In:</span>
                              <p className="font-medium text-brand-dark">
                                {new Date(req.requested_change.clock_in_at).toLocaleString()}
                              </p>
                            </div>
                          )}
                          {req.requested_change.clock_out_at && (
                            <div>
                              <span className="text-gray-500">New Clock Out:</span>
                              <p className="font-medium text-brand-dark">
                                {new Date(req.requested_change.clock_out_at).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-600 mb-3 bg-white rounded-lg p-3">
                      <strong>Reason:</strong> {req.reason}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleCorrectionAction(req.id, 'APPROVED')}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCorrectionAction(req.id, 'REJECTED')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Announcements Section */}
        <div className="mt-8">
          <AdminAnnouncementsSection />
        </div>

        {/* Team Progress Section */}
        <div className="mt-8">
          <AdminTeamProgressSection />
        </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
