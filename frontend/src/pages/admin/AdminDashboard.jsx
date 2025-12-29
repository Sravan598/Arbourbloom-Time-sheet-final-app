import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LogOut, 
  Users, 
  Clock, 
  AlertCircle,
  FileText,
  TrendingUp,
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  MoreVertical
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [pendingCorrections, setPendingCorrections] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, employeesRes, correctionsRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard-stats`),
        axios.get(`${API}/admin/employees`),
        axios.get(`${API}/admin/correction-requests?status=PENDING`)
      ]);
      
      setStats(statsRes.data);
      setEmployees(employeesRes.data);
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

  const handleToggleUserActive = async (userId, currentStatus) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/toggle-active`);
      setSuccess(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchData();
    } catch (err) {
      setError('Failed to update user status');
    }
  };

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

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_readable-link/artifacts/ufwwws2h_image.png" 
                alt="CORtracker" 
                className="h-8"
              />
              <div className="hidden sm:block border-l border-gray-200 pl-4">
                <p className="text-sm text-gray-500">Admin Dashboard</p>
                <p className="font-semibold text-brand-dark">{user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                to="/admin/timesheets" 
                className="flex items-center gap-2 text-gray-600 hover:text-brand-red transition-colors"
              >
                <FileText className="w-5 h-5" />
                <span className="hidden sm:inline">All Timesheets</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
                data-testid="admin-logout-btn"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
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
              <div className="w-12 h-12 bg-brand-red/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-brand-red" />
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
                <p className="text-2xl font-bold text-brand-dark">{stats?.pending_corrections || 0}</p>
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
          {/* Employees List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-brand-dark">Employees</h2>
              <Button variant="outline" size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </div>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredEmployees.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No employees found</p>
              ) : (
                filteredEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-red/10 rounded-full flex items-center justify-center">
                        <span className="text-brand-red font-semibold">
                          {emp.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-brand-dark">{emp.name}</p>
                        <p className="text-sm text-gray-500">{emp.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleToggleUserActive(emp.id, emp.is_active)}
                        className="p-1 text-gray-400 hover:text-brand-dark"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Pending Correction Requests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
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
                  <div key={req.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-brand-dark">{req.user_name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
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
      </main>
    </div>
  );
};

export default AdminDashboard;
