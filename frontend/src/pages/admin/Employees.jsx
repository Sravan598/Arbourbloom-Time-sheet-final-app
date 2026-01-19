import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut,
  Users, 
  UserPlus,
  Trash2,
  Search,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  User,
  ChevronDown,
  Settings,
  AlertTriangle,
  Clock
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import AdminSidebar from '../../components/admin/AdminSidebar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Employees = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const profileDropdownRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profileData, setProfileData] = useState(null);
  
  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  
  // Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/employees`);
      setEmployees(response.data);
    } catch (err) {
      setError('Failed to fetch employees');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Add Employee
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    setError('');

    try {
      await axios.post(`${API}/auth/signup`, {
        name: addForm.name,
        email: addForm.email,
        password: addForm.password,
        role: 'EMPLOYEE'
      });
      
      setSuccess(`Employee "${addForm.name}" added successfully!`);
      setShowAddModal(false);
      setAddForm({ name: '', email: '', password: '' });
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add employee');
    } finally {
      setIsAdding(false);
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    
    setIsDeleting(true);
    setError('');

    try {
      await axios.delete(`${API}/admin/employees/${employeeToDelete.id}`);
      setSuccess(`Employee "${employeeToDelete.name}" deleted successfully!`);
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete employee');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading employees...</p>
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-black to-brand-black-dark rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-brand-dark">Employees</h1>
                  <p className="text-sm text-gray-500">{employees.length} total employee{employees.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setShowAddModal(true)}
                  variant="primary"
                  size="sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
                
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

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-dark">{employees.length}</p>
                  <p className="text-sm text-gray-500">Total Employees</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-dark">{employees.length}</p>
                  <p className="text-sm text-gray-500">Active</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-dark">
                    {employees.filter(e => {
                      const created = new Date(e.created_at);
                      const now = new Date();
                      const diffDays = (now - created) / (1000 * 60 * 60 * 24);
                      return diffDays <= 30;
                    }).length}
                  </p>
                  <p className="text-sm text-gray-500">New (30 days)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Employees List */}
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No employees found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'Try a different search term' : 'Add your first employee to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddModal(true)} variant="primary">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add Employee
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Employee</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Email</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Role</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Joined</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEmployees.map((emp) => (
                      <motion.tr
                        key={emp.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {emp.profile_image ? (
                              <img 
                                src={emp.profile_image} 
                                alt={emp.name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-brand-black to-brand-black-dark rounded-full flex items-center justify-center">
                                <span className="text-white font-bold">
                                  {emp.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-brand-dark">{emp.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{emp.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(emp.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end">
                            <button
                              onClick={() => openDeleteModal(emp)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Employee"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-black/10 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-brand-black" />
                  </div>
                  <h2 className="text-xl font-bold text-brand-dark">Add Employee</h2>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent"
                    placeholder="John Smith"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent"
                    placeholder="john@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent"
                    placeholder="Create a password"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5 mr-2" />
                        Add Employee
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && employeeToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-brand-dark mb-2">Delete Employee?</h2>
                <p className="text-gray-500">
                  Are you sure you want to delete <strong>{employeeToDelete.name}</strong>?
                </p>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-800 font-medium mb-2">This will permanently delete:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• All timesheets and work history</li>
                  <li>• All uploaded documents</li>
                  <li>• All leave requests</li>
                  <li>• All break records</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </Button>
                <button
                  onClick={handleDeleteEmployee}
                  disabled={isDeleting}
                  className="flex-1 bg-red-500 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      Delete Employee
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Employees;
