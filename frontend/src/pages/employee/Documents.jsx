import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  Folder, 
  Lock, 
  Unlock,
  Trash2,
  Download,
  Eye,
  Search,
  Filter,
  Clock,
  Home,
  Shield,
  Settings,
  HardDrive,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  User,
  LogOut,
  File,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FilePlus
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DOCUMENT_CATEGORIES = [
  'All',
  'ID Documents',
  'Tax Forms',
  'Contracts',
  'Certifications',
  'Medical',
  'Other'
];

const getFileIcon = (fileType) => {
  if (fileType?.startsWith('image/')) return <FileImage className="w-6 h-6 text-blue-500" />;
  if (fileType?.includes('pdf')) return <FileText className="w-6 h-6 text-red-500" />;
  if (fileType?.includes('spreadsheet') || fileType?.includes('excel') || fileType?.includes('csv')) 
    return <FileSpreadsheet className="w-6 h-6 text-green-500" />;
  if (fileType?.includes('zip') || fileType?.includes('archive')) 
    return <FileArchive className="w-6 h-6 text-yellow-500" />;
  return <File className="w-6 h-6 text-gray-500" />;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const Documents = () => {
  const navigate = useNavigate();
  const { user, logout, getLogoutRedirectUrl } = useAuth();
  const fileInputRef = useRef(null);
  const profileDropdownRef = useRef(null);
  
  // State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasPin, setHasPin] = useState(null);
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [documents, setDocuments] = useState([]);
  const [storageUsage, setStorageUsage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    file: null,
    category: 'Other',
    description: ''
  });
  const [viewingDocument, setViewingDocument] = useState(null);
  const [activeSection, setActiveSection] = useState('documents'); // documents, settings
  
  // Fetch profile
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

  // Check PIN status on mount
  useEffect(() => {
    const checkPinStatus = async () => {
      try {
        const response = await axios.get(`${API}/documents/pin-status`);
        setHasPin(response.data.has_pin);
      } catch (err) {
        console.error('Failed to check PIN status:', err);
      } finally {
        setIsLoading(false);
      }
    };
    checkPinStatus();
  }, []);

  // Fetch documents when unlocked
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/documents`, {
        params: { category: selectedCategory !== 'All' ? selectedCategory : undefined }
      });
      setDocuments(response.data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  }, [selectedCategory]);

  const fetchStorageUsage = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/documents/storage-usage`);
      setStorageUsage(response.data);
    } catch (err) {
      console.error('Failed to fetch storage usage:', err);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      fetchDocuments();
      fetchStorageUsage();
    }
  }, [isUnlocked, fetchDocuments, fetchStorageUsage]);

  // PIN Setup
  const handleSetupPin = async () => {
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      setError('PIN must be 4-6 digits');
      return;
    }
    
    try {
      await axios.post(`${API}/documents/setup-pin`, { pin: newPin });
      setHasPin(true);
      setIsUnlocked(true);
      setSuccess('PIN set successfully!');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to set PIN');
    }
  };

  // PIN Verification
  const handleVerifyPin = async () => {
    try {
      await axios.post(`${API}/documents/verify-pin`, { pin });
      setIsUnlocked(true);
      setPin('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid PIN');
    }
  };

  // File Upload
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit');
        return;
      }
      setUploadData(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = async () => {
    if (!uploadData.file) {
      setError('Please select a file');
      return;
    }
    
    setIsUploading(true);
    setError('');
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await axios.post(`${API}/documents/upload`, {
            filename: uploadData.file.name,
            file_data: reader.result,
            file_type: uploadData.file.type,
            category: uploadData.category,
            description: uploadData.description
          });
          
          setSuccess('Document uploaded successfully!');
          setShowUploadModal(false);
          setUploadData({ file: null, category: 'Other', description: '' });
          fetchDocuments();
          fetchStorageUsage();
        } catch (err) {
          setError(err.response?.data?.detail || 'Failed to upload document');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(uploadData.file);
    } catch (err) {
      setError('Failed to read file');
      setIsUploading(false);
    }
  };

  // Download Document
  const handleDownload = async (docId, filename) => {
    try {
      const response = await axios.get(`${API}/documents/${docId}`);
      const { file_data, file_type, original_filename } = response.data;
      
      // Create download link
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

  // View Document
  const handleView = async (docId) => {
    try {
      const response = await axios.get(`${API}/documents/${docId}`);
      setViewingDocument(response.data);
    } catch (err) {
      setError('Failed to view document');
    }
  };

  // Delete Document
  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await axios.delete(`${API}/documents/${docId}`);
      setSuccess('Document deleted successfully');
      fetchDocuments();
      fetchStorageUsage();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete document');
    }
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

  const filteredDocuments = documents.filter(doc =>
    doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // PIN Setup Screen
  if (hasPin === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-black/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-brand-black" />
            </div>
            <h1 className="text-2xl font-bold text-brand-dark">Secure Document Storage</h1>
            <p className="text-gray-500 mt-2">Create a PIN to protect your documents</p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-gray-800 text-sm">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Create PIN (4-6 digits)</label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter PIN"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Confirm PIN"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>
            <Button
              onClick={handleSetupPin}
              variant="primary"
              className="w-full"
              disabled={newPin.length < 4 || confirmPin.length < 4}
            >
              <Lock className="w-5 h-5 mr-2" />
              Set Up PIN
            </Button>
            <Link
              to="/employee/dashboard"
              className="block text-center text-gray-500 hover:text-brand-black mt-4"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // PIN Verification Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-black/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-brand-black" />
            </div>
            <h1 className="text-2xl font-bold text-brand-dark">Enter Your PIN</h1>
            <p className="text-gray-500 mt-2">Access your secure documents</p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-gray-800 text-sm">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter PIN"
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent text-center text-3xl tracking-widest"
              maxLength={6}
              onKeyPress={(e) => e.key === 'Enter' && handleVerifyPin()}
            />
            <Button
              onClick={handleVerifyPin}
              variant="primary"
              className="w-full"
              disabled={pin.length < 4}
            >
              <Unlock className="w-5 h-5 mr-2" />
              Unlock
            </Button>
            <Link
              to="/employee/dashboard"
              className="block text-center text-gray-500 hover:text-brand-black mt-4"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main Documents View (Unlocked)
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white shadow-lg fixed left-0 top-0 bottom-0 z-40">
        <div className="p-6 border-b border-gray-100">
          <Link to="/employee/dashboard" className="flex items-center gap-3">
            <img 
              src="/aurborbloom_logo.png" 
              alt="AurborBloom" 
              className="h-8"
            />
          </Link>
        </div>
        
        <nav className="p-4">
          <div className="space-y-1">
            <Link
              to="/employee/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <button
              onClick={() => setActiveSection('documents')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeSection === 'documents' ? 'bg-brand-black/10 text-brand-black' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Folder className="w-5 h-5" />
              <span>My Documents</span>
            </button>
            <button
              onClick={() => setActiveSection('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeSection === 'settings' ? 'bg-brand-black/10 text-brand-black' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Security Settings</span>
            </button>
          </div>
          
          {/* Storage Usage */}
          {storageUsage && (
            <div className="mt-8 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Storage</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    storageUsage.percentage_used > 80 ? 'bg-red-500' : 
                    storageUsage.percentage_used > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(storageUsage.percentage_used, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {storageUsage.used_mb} MB / {storageUsage.max_mb} MB used
              </p>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-8 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-brand-dark flex items-center gap-2">
              <Shield className="w-6 h-6 text-brand-black" />
              {activeSection === 'documents' ? 'My Documents' : 'Security Settings'}
            </h1>
            
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
                    </div>
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={() => { setShowProfileDropdown(false); handleLogout(); }}
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
        </header>

        <div className="p-8">
          {/* Status Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-gray-800">{error}</p>
              </div>
              <button onClick={() => setError('')}><X className="w-5 h-5 text-red-500" /></button>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-green-700">{success}</p>
              </div>
              <button onClick={() => setSuccess('')}><X className="w-5 h-5 text-green-500" /></button>
            </motion.div>
          )}

          {activeSection === 'documents' ? (
            <>
              {/* Actions Bar */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent"
                  >
                    {DOCUMENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <Button onClick={() => setShowUploadModal(true)} variant="primary">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>

              {/* Documents Grid */}
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                  <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No documents yet</h3>
                  <p className="text-gray-500 mb-4">Upload your first document to get started</p>
                  <Button onClick={() => setShowUploadModal(true)} variant="primary">
                    <FilePlus className="w-5 h-5 mr-2" />
                    Upload Document
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.map((doc) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl shadow-lg p-4 hover:shadow-xl transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                          {getFileIcon(doc.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-brand-dark truncate" title={doc.original_filename}>
                            {doc.original_filename}
                          </h4>
                          <p className="text-sm text-gray-500">{formatFileSize(doc.file_size)}</p>
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full mt-1">
                            {doc.category}
                          </span>
                        </div>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-500 mt-3 line-clamp-2">{doc.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-400">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleView(doc.id)}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(doc.id, doc.original_filename)}
                            className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Security Settings Section */
            <div className="max-w-xl">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-brand-dark mb-4">Change PIN</h2>
                <p className="text-gray-500 mb-6">Update your document security PIN</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current PIN</label>
                    <input
                      type="password"
                      placeholder="Enter current PIN"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New PIN</label>
                    <input
                      type="password"
                      placeholder="Enter new PIN"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New PIN</label>
                    <input
                      type="password"
                      placeholder="Confirm new PIN"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent"
                    />
                  </div>
                  <Button variant="primary" className="w-full">
                    Update PIN
                  </Button>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
                <h2 className="text-lg font-bold text-brand-dark mb-4">Session Security</h2>
                <p className="text-gray-500 mb-4">Lock your documents for this session</p>
                <Button 
                  variant="secondary" 
                  onClick={() => { setIsUnlocked(false); setPin(''); }}
                  className="w-full"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Lock Documents
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-brand-dark">Upload Document</h2>
                <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* File Drop Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-black transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt"
                  />
                  {uploadData.file ? (
                    <div className="flex items-center justify-center gap-3">
                      {getFileIcon(uploadData.file.type)}
                      <div className="text-left">
                        <p className="font-medium text-brand-dark">{uploadData.file.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(uploadData.file.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">Click to select a file</p>
                      <p className="text-sm text-gray-400 mt-1">Max file size: 10MB</p>
                    </>
                  )}
                </div>
                
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={uploadData.category}
                    onChange={(e) => setUploadData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent"
                  >
                    {DOCUMENT_CATEGORIES.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                  <textarea
                    value={uploadData.description}
                    onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add a description..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
                
                <Button
                  onClick={handleUpload}
                  variant="primary"
                  className="w-full"
                  disabled={!uploadData.file || isUploading}
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    onClick={() => handleDownload(viewingDocument.id, viewingDocument.original_filename)}
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
                      onClick={() => handleDownload(viewingDocument.id, viewingDocument.original_filename)}
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

export default Documents;
