import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut,
  Folder, 
  Download,
  Eye,
  Search,
  Users,
  HardDrive,
  ChevronDown,
  ChevronRight,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  AlertCircle,
  X,
  User,
  Settings
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import AdminSidebar from '../../components/admin/AdminSidebar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getFileIcon = (fileType) => {
  if (fileType?.startsWith('image/')) return <FileImage className="w-5 h-5 text-blue-500" />;
  if (fileType?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
  if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) 
    return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
  return <File className="w-5 h-5 text-gray-500" />;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const EmployeeDocs = () => {
  const navigate = useNavigate();
  const { user, logout, getLogoutRedirectUrl } = useAuth();
  const profileDropdownRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [storageUsage, setStorageUsage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingDocument, setViewingDocument] = useState(null);
  const [expandedEmployees, setExpandedEmployees] = useState({});
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

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await axios.get(`${API}/admin/employees`);
        setEmployees(response.data);
      } catch (err) {
        setError('Failed to fetch employees');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch documents for selected employee
  const fetchEmployeeDocuments = useCallback(async (employeeId) => {
    try {
      const [docsRes, storageRes] = await Promise.all([
        axios.get(`${API}/admin/employees/${employeeId}/documents`),
        axios.get(`${API}/admin/employees/${employeeId}/storage-usage`)
      ]);
      setDocuments(docsRes.data);
      setStorageUsage(storageRes.data);
    } catch (err) {
      setError('Failed to fetch employee documents');
    }
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeDocuments(selectedEmployee.id);
    }
  }, [selectedEmployee, fetchEmployeeDocuments]);

  const handleDownload = async (employeeId, docId, filename) => {
    try {
      const response = await axios.get(`${API}/admin/employees/${employeeId}/documents/${docId}`);
      const { file_data, original_filename } = response.data;
      
      const link = document.createElement('a');
      link.href = file_data;
      link.download = original_filename || filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Failed to download document');
    }
  };

  const handleView = async (employeeId, docId) => {
    try {
      const response = await axios.get(`${API}/admin/employees/${employeeId}/documents/${docId}`);
      setViewingDocument(response.data);
    } catch (err) {
      setError('Failed to view document');
    }
  };

  const toggleEmployeeExpand = (employeeId) => {
    setExpandedEmployees(prev => ({
      ...prev,
      [employeeId]: !prev[employeeId]
    }));
    if (!expandedEmployees[employeeId]) {
      const emp = employees.find(e => e.id === employeeId);
      setSelectedEmployee(emp);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count total documents across all employees
  const totalEmployeesWithDocs = employees.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading employee documents...</p>
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
                  <Folder className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-brand-dark">Employee Documents</h1>
                  <p className="text-sm text-gray-500">{totalEmployeesWithDocs} employee{totalEmployeesWithDocs !== 1 ? 's' : ''}</p>
                </div>
              </div>
              
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

          {/* Employees List */}
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No employees found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try a different search term' : 'No employees have been added yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEmployees.map((emp) => (
                <motion.div 
                  key={emp.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleEmployeeExpand(emp.id)}
                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {emp.profile_image ? (
                        <img 
                          src={emp.profile_image} 
                          alt={emp.name}
                          className="w-12 h-12 rounded-xl object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-black to-brand-black-dark rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {emp.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="text-left">
                        <p className="font-semibold text-brand-dark text-lg">{emp.name}</p>
                        <p className="text-gray-500">{emp.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {expandedEmployees[emp.id] && storageUsage && selectedEmployee?.id === emp.id && (
                        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                          <HardDrive className="w-4 h-4" />
                          <span>{storageUsage.used_mb} MB / {storageUsage.max_mb} MB</span>
                        </div>
                      )}
                      {expandedEmployees[emp.id] ? (
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {expandedEmployees[emp.id] && selectedEmployee?.id === emp.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-100"
                      >
                        <div className="p-6 bg-gray-50">
                          {/* Storage Usage */}
                          {storageUsage && (
                            <div className="mb-6 p-4 bg-white rounded-xl">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <HardDrive className="w-5 h-5 text-gray-500" />
                                  <span className="font-medium text-gray-700">Storage Usage</span>
                                </div>
                                <span className="text-sm text-gray-500">
                                  {storageUsage.used_mb} MB / {storageUsage.max_mb} MB
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div 
                                  className={`h-3 rounded-full transition-all ${
                                    storageUsage.percentage_used > 80 ? 'bg-red-500' : 
                                    storageUsage.percentage_used > 50 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(storageUsage.percentage_used, 100)}%` }}
                                />
                              </div>
                              <p className="text-sm text-gray-500 mt-2">
                                {storageUsage.percentage_used.toFixed(1)}% used
                              </p>
                            </div>
                          )}

                          {/* Documents List */}
                          {documents.length === 0 ? (
                            <div className="text-center py-8 bg-white rounded-xl">
                              <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500">No documents uploaded by this employee</p>
                            </div>
                          ) : (
                            <div className="grid gap-3">
                              {documents.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-4 bg-white rounded-xl hover:shadow-md transition-shadow">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                      {getFileIcon(doc.file_type)}
                                    </div>
                                    <div>
                                      <p className="font-medium text-brand-dark truncate max-w-[300px]" title={doc.original_filename}>
                                        {doc.original_filename}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        {formatFileSize(doc.file_size)} • {doc.category} • {new Date(doc.uploaded_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleView(emp.id, doc.id)}
                                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="View"
                                    >
                                      <Eye className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDownload(emp.id, doc.id, doc.original_filename)}
                                      className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                      title="Download"
                                    >
                                      <Download className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {viewingDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setViewingDocument(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="font-bold text-brand-dark">{viewingDocument.original_filename}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = viewingDocument.file_data;
                      link.download = viewingDocument.original_filename;
                      link.click();
                    }}
                    className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button onClick={() => setViewingDocument(null)} className="p-2 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                {viewingDocument.file_type?.startsWith('image/') ? (
                  <img 
                    src={viewingDocument.file_data} 
                    alt={viewingDocument.original_filename}
                    className="max-w-full mx-auto rounded-lg"
                  />
                ) : viewingDocument.file_type === 'application/pdf' ? (
                  <iframe
                    src={viewingDocument.file_data}
                    className="w-full h-[70vh] rounded-lg"
                    title={viewingDocument.original_filename}
                  />
                ) : (
                  <div className="text-center py-12">
                    {getFileIcon(viewingDocument.file_type)}
                    <p className="text-gray-600 mt-4">Preview not available for this file type</p>
                    <Button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = viewingDocument.file_data;
                        link.download = viewingDocument.original_filename;
                        link.click();
                      }}
                      variant="primary"
                      className="mt-4"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download to View
                    </Button>
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

export default EmployeeDocs;
