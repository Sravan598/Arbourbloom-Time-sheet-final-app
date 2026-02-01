import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  Calendar,
  Clock,
  Download,
  Filter,
  AlertCircle,
  CheckCircle,
  Send,
  X,
  MessageSquare,
  User,
  ChevronDown,
  Settings,
  History,
  FileEdit
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import EmployeeSidebar from '../../components/employee/EmployeeSidebar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EmployeeTimesheet = () => {
  const navigate = useNavigate();
  const { user, logout, getLogoutRedirectUrl } = useAuth();
  const profileDropdownRef = useRef(null);
  
  const [timesheets, setTimesheets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profileData, setProfileData] = useState(null);
  
  // Correction request modal
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    newClockIn: '',
    newClockOut: '',
    reason: ''
  });
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  
  // Correction history
  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [showCorrectionHistory, setShowCorrectionHistory] = useState(false);

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

  const fetchTimesheets = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `${API}/employee/timesheets`;
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url);
      setTimesheets(response.data);
    } catch (err) {
      setError('Failed to load timesheets');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  // Fetch correction requests
  const fetchCorrectionRequests = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/employee/correction-requests`);
      setCorrectionRequests(response.data);
    } catch (err) {
      console.error('Failed to fetch correction requests:', err);
    }
  }, []);

  useEffect(() => {
    fetchTimesheets();
    fetchCorrectionRequests();
  }, [fetchTimesheets, fetchCorrectionRequests]);

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const getTotalHours = () => {
    const totalMinutes = timesheets.reduce((sum, ts) => sum + (ts.total_minutes || 0), 0);
    return (totalMinutes / 60).toFixed(1);
  };

  const openCorrectionModal = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setCorrectionForm({
      newClockIn: timesheet.clock_in_at ? new Date(timesheet.clock_in_at).toISOString().slice(0, 16) : '',
      newClockOut: timesheet.clock_out_at ? new Date(timesheet.clock_out_at).toISOString().slice(0, 16) : '',
      reason: ''
    });
    setShowCorrectionModal(true);
  };

  const submitCorrectionRequest = async () => {
    if (!correctionForm.reason || correctionForm.reason.length < 10) {
      setError('Please provide a detailed reason (at least 10 characters)');
      return;
    }
    
    setSubmittingCorrection(true);
    setError('');
    
    try {
      const requestedChange = {};
      if (correctionForm.newClockIn) {
        requestedChange.clock_in_at = new Date(correctionForm.newClockIn).toISOString();
      }
      if (correctionForm.newClockOut) {
        requestedChange.clock_out_at = new Date(correctionForm.newClockOut).toISOString();
      }
      
      await axios.post(`${API}/employee/correction-request`, {
        timesheet_id: selectedTimesheet.id,
        requested_change: requestedChange,
        reason: correctionForm.reason
      });
      
      setSuccess('Correction request submitted successfully!');
      setShowCorrectionModal(false);
      setSelectedTimesheet(null);
      fetchCorrectionRequests(); // Refresh correction history
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit correction request');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Clock In', 'Clock Out', 'Duration', 'Status'];
    const rows = timesheets.map(ts => [
      formatDate(ts.clock_in_at),
      formatDateTime(ts.clock_in_at),
      formatDateTime(ts.clock_out_at),
      formatDuration(ts.total_minutes),
      ts.is_approved ? 'Approved' : 'Pending'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet_${user?.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleLogout = () => {
    // Get tenant directly from localStorage before any state changes
    const storedTenant = localStorage.getItem('cortracker_tenant');
    const logoutUrl = storedTenant && storedTenant !== 'aurborbloom' 
      ? `/${storedTenant}/login` 
      : '/login';
    logout();
    navigate(logoutUrl);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <EmployeeSidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-brand-dark">My Timesheet</h1>
                <p className="text-sm text-gray-500">{user?.name}</p>
              </div>
              
              {/* Profile Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2 hover:bg-gray-100 rounded-full py-1 pl-1 pr-3 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                    {profileData?.profile_image ? (
                      <img 
                        src={profileData.profile_image} 
                        alt={profileData?.name || user?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-black to-brand-black-dark">
                        <span className="text-sm font-bold text-white">
                          {(profileData?.name || user?.name)?.charAt(0)?.toUpperCase() || 'U'}
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
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-semibold text-brand-dark">{profileData?.name || user?.name}</p>
                        <p className="text-sm text-gray-500 truncate">{profileData?.email || user?.email}</p>
                      </div>
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
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
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
            <button onClick={() => setSuccess('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </motion.div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-brand-dark">
              <Filter className="w-5 h-5" />
              <span className="font-medium">Filters</span>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setStartDate(''); setEndDate(''); }}
            >
              Clear
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCorrectionHistory(true)}
                className="relative"
              >
                <History className="w-4 h-4 mr-2" />
                My Corrections
                {correctionRequests.filter(r => r.status === 'PENDING').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center">
                    {correctionRequests.filter(r => r.status === 'PENDING').length}
                  </span>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={exportToCSV}
                disabled={timesheets.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-brand-black">{timesheets.length}</p>
              <p className="text-gray-500 text-sm">Total Entries</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-brand-dark">{getTotalHours()}</p>
              <p className="text-gray-500 text-sm">Total Hours</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {timesheets.filter(ts => ts.is_approved).length}
              </p>
              <p className="text-gray-500 text-sm">Approved</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">
                {timesheets.filter(ts => !ts.is_approved && ts.clock_out_at).length}
              </p>
              <p className="text-gray-500 text-sm">Pending Approval</p>
            </div>
          </div>
        </div>

        {/* Timesheet Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading timesheets...</p>
            </div>
          ) : timesheets.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No timesheet entries found</p>
              <p className="text-gray-400 text-sm mt-2">Your time entries will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Clock In</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Clock Out</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Duration</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Notes</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {timesheets.map((ts) => (
                    <tr key={ts.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(ts.clock_in_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(ts.clock_in_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {ts.clock_out_at ? new Date(ts.clock_out_at).toLocaleTimeString() : (
                          <span className="text-green-600 font-medium">In Progress</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-brand-dark">
                        {formatDuration(ts.total_minutes)}
                      </td>
                      <td className="px-6 py-4">
                        {ts.notes ? (
                          <div className="flex items-start gap-1 max-w-[200px]">
                            <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-600 truncate" title={ts.notes}>
                              {ts.notes}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {ts.clock_out_at ? (
                          ts.is_approved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                              <CheckCircle className="w-3 h-3" /> Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            <Clock className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {ts.clock_out_at && (
                          <button
                            onClick={() => openCorrectionModal(ts)}
                            className="text-brand-black hover:underline text-sm font-medium"
                          >
                            Request Correction
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </main>
      </div>

      {/* Correction Request Modal */}
      <AnimatePresence>
        {showCorrectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCorrectionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-brand-dark">Request Correction</h3>
                <button onClick={() => setShowCorrectionModal(false)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">New Clock In Time</label>
                  <input
                    type="datetime-local"
                    value={correctionForm.newClockIn}
                    onChange={(e) => setCorrectionForm({...correctionForm, newClockIn: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">New Clock Out Time</label>
                  <input
                    type="datetime-local"
                    value={correctionForm.newClockOut}
                    onChange={(e) => setCorrectionForm({...correctionForm, newClockOut: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Reason for Correction *</label>
                  <textarea
                    value={correctionForm.reason}
                    onChange={(e) => setCorrectionForm({...correctionForm, reason: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent resize-none"
                    placeholder="Please explain why this correction is needed (min 10 characters)"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowCorrectionModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={submitCorrectionRequest}
                    disabled={submittingCorrection}
                  >
                    {submittingCorrection ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Correction History Modal */}
      <AnimatePresence>
        {showCorrectionHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCorrectionHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-black/10 rounded-xl flex items-center justify-center">
                    <FileEdit className="w-5 h-5 text-brand-black" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-brand-dark">My Correction Requests</h3>
                    <p className="text-sm text-gray-500">Track the status of your timesheet corrections</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCorrectionHistory(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {correctionRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No correction requests yet</p>
                    <p className="text-gray-400 text-sm mt-2">
                      When you request a timesheet correction, it will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {correctionRequests.map((req) => (
                      <div 
                        key={req.id} 
                        className={`p-4 rounded-xl border ${
                          req.status === 'PENDING' 
                            ? 'bg-yellow-50 border-yellow-200' 
                            : req.status === 'APPROVED' 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm text-gray-500">
                              Submitted {new Date(req.created_at).toLocaleDateString()} at {new Date(req.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            req.status === 'PENDING' 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : req.status === 'APPROVED' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-gray-800'
                          }`}>
                            {req.status === 'PENDING' && <Clock className="w-3 h-3 inline mr-1" />}
                            {req.status === 'APPROVED' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                            {req.status === 'REJECTED' && <X className="w-3 h-3 inline mr-1" />}
                            {req.status}
                          </span>
                        </div>
                        
                        {/* Requested Changes */}
                        <div className="bg-white/60 rounded-lg p-3 mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Requested Changes:</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {req.requested_change?.clock_in_at && (
                              <div>
                                <span className="text-gray-500">New Clock In:</span>
                                <p className="font-medium">{new Date(req.requested_change.clock_in_at).toLocaleString()}</p>
                              </div>
                            )}
                            {req.requested_change?.clock_out_at && (
                              <div>
                                <span className="text-gray-500">New Clock Out:</span>
                                <p className="font-medium">{new Date(req.requested_change.clock_out_at).toLocaleString()}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Reason */}
                        <div className="mb-3">
                          <p className="text-sm text-gray-500">Reason:</p>
                          <p className="text-sm text-gray-700">{req.reason}</p>
                        </div>
                        
                        {/* Admin Notes (if any) */}
                        {req.admin_notes && (
                          <div className="bg-white/60 rounded-lg p-3 border-l-4 border-blue-400">
                            <p className="text-sm text-gray-500">Admin Response:</p>
                            <p className="text-sm text-gray-700">{req.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeTimesheet;
