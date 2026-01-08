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
  Edit2,
  X,
  Save,
  History,
  User,
  MessageSquare,
  ChevronDown,
  Settings
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import AdminSidebar from '../../components/admin/AdminSidebar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminTimesheets = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const profileDropdownRef = useRef(null);
  
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profileData, setProfileData] = useState(null);
  
  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [editForm, setEditForm] = useState({
    clock_in_at: '',
    clock_out_at: '',
    notes: '',
    is_approved: false
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Audit log modal
  const [showAuditModal, setShowAuditModal] = useState(false);

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
    try {
      let url = `${API}/admin/timesheets`;
      const params = new URLSearchParams();
      if (selectedUserId) params.append('user_id', selectedUserId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url);
      setTimesheets(response.data);
    } catch (err) {
      setError('Failed to load timesheets');
      console.error(err);
    }
  }, [selectedUserId, startDate, endDate]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/employees`);
      setEmployees(response.data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/audit-logs?entity_type=timesheet`);
      setAuditLogs(response.data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTimesheets(), fetchEmployees(), fetchAuditLogs()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchTimesheets, fetchEmployees, fetchAuditLogs]);

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

  const openEditModal = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setEditForm({
      clock_in_at: timesheet.clock_in_at ? new Date(timesheet.clock_in_at).toISOString().slice(0, 16) : '',
      clock_out_at: timesheet.clock_out_at ? new Date(timesheet.clock_out_at).toISOString().slice(0, 16) : '',
      notes: timesheet.notes || '',
      is_approved: timesheet.is_approved || false
    });
    setShowEditModal(true);
  };

  const saveTimesheet = async () => {
    setIsSaving(true);
    setError('');
    
    try {
      const updateData = {};
      if (editForm.clock_in_at) {
        updateData.clock_in_at = new Date(editForm.clock_in_at).toISOString();
      }
      if (editForm.clock_out_at) {
        updateData.clock_out_at = new Date(editForm.clock_out_at).toISOString();
      }
      if (editForm.notes !== selectedTimesheet.notes) {
        updateData.notes = editForm.notes;
      }
      if (editForm.is_approved !== selectedTimesheet.is_approved) {
        updateData.is_approved = editForm.is_approved;
      }
      
      await axios.put(`${API}/admin/timesheets/${selectedTimesheet.id}`, updateData);
      
      setSuccess('Timesheet updated successfully!');
      setShowEditModal(false);
      fetchTimesheets();
      fetchAuditLogs();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update timesheet');
    } finally {
      setIsSaving(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Employee', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Status', 'Notes'];
    const rows = timesheets.map(ts => [
      ts.user_name || 'Unknown',
      formatDate(ts.clock_in_at),
      formatDateTime(ts.clock_in_at),
      formatDateTime(ts.clock_out_at),
      formatDuration(ts.total_minutes),
      ts.is_approved ? 'Approved' : 'Pending',
      ts.notes || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_timesheets_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
                <h1 className="text-xl font-bold text-brand-dark">All Timesheets</h1>
                <p className="text-sm text-gray-500">Admin View</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowAuditModal(true)}
                  className="flex items-center gap-2 text-gray-600 hover:text-brand-red transition-colors"
                >
                  <History className="w-5 h-5" />
                  <span className="hidden sm:inline">Audit Log</span>
                </button>
                
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
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Admin</span>
                          </div>
                          <p className="font-semibold text-brand-dark mt-1">{profileData?.name || user?.name}</p>
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
                            className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full"
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
              <p className="text-red-700">{error}</p>
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
              <label className="block text-sm text-gray-500 mb-1">Employee</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent min-w-[200px]"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedUserId(''); setStartDate(''); setEndDate(''); }}
            >
              Clear
            </Button>
            <div className="ml-auto">
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

        {/* Timesheet Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading timesheets...</p>
            </div>
          ) : timesheets.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No timesheet entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Employee</th>
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
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-brand-red/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-brand-red" />
                          </div>
                          <div>
                            <p className="font-medium text-brand-dark">{ts.user_name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{ts.user_email}</p>
                          </div>
                        </div>
                      </td>
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
                          <div className="flex items-start gap-1 max-w-[180px]">
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
                        <button
                          onClick={() => openEditModal(ts)}
                          className="flex items-center gap-1 text-brand-red hover:underline text-sm font-medium"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-brand-dark">Edit Timesheet</h3>
                <button onClick={() => setShowEditModal(false)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Employee</p>
                <p className="font-medium text-brand-dark">{selectedTimesheet?.user_name}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Clock In Time</label>
                  <input
                    type="datetime-local"
                    value={editForm.clock_in_at}
                    onChange={(e) => setEditForm({...editForm, clock_in_at: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Clock Out Time</label>
                  <input
                    type="datetime-local"
                    value={editForm.clock_out_at}
                    onChange={(e) => setEditForm({...editForm, clock_out_at: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent resize-none"
                    placeholder="Add notes..."
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_approved"
                    checked={editForm.is_approved}
                    onChange={(e) => setEditForm({...editForm, is_approved: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-brand-red focus:ring-brand-red"
                  />
                  <label htmlFor="is_approved" className="text-sm font-medium text-brand-dark">
                    Mark as Approved
                  </label>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={saveTimesheet}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audit Log Modal */}
      <AnimatePresence>
        {showAuditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAuditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-brand-dark">Audit Log</h3>
                <button onClick={() => setShowAuditModal(false)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="overflow-y-auto flex-1">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No audit entries yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-brand-dark">{log.action}</p>
                            <p className="text-sm text-gray-500">by {log.admin_user_name}</p>
                          </div>
                          <p className="text-xs text-gray-400">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          Entity: {log.entity_type} ({log.entity_id.slice(0, 8)}...)
                        </p>
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

export default AdminTimesheets;
