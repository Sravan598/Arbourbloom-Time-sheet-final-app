import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
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
  X
} from 'lucide-react';
import axios from 'axios';
import { Button } from '../ui/Button';

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

const AdminEmployeeDocuments = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [storageUsage, setStorageUsage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingDocument, setViewingDocument] = useState(null);
  const [expandedEmployees, setExpandedEmployees] = useState({});

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

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Folder className="w-6 h-6 text-brand-black" />
          <h2 className="text-xl font-bold text-brand-dark">Employee Documents</h2>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-gray-800 text-sm">{error}</p>
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black focus:border-transparent"
        />
      </div>

      {/* Employees List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No employees found</p>
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <div key={emp.id} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleEmployeeExpand(emp.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-black/10 rounded-full flex items-center justify-center">
                    <span className="text-brand-black font-semibold">
                      {emp.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-brand-dark">{emp.name}</p>
                    <p className="text-sm text-gray-500">{emp.email}</p>
                  </div>
                </div>
                {expandedEmployees[emp.id] ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedEmployees[emp.id] && selectedEmployee?.id === emp.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100 bg-gray-50"
                  >
                    <div className="p-4">
                      {/* Storage Usage */}
                      {storageUsage && (
                        <div className="mb-4 p-3 bg-white rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <HardDrive className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Storage Usage</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                            <div 
                              className={`h-2 rounded-full ${
                                storageUsage.percentage_used > 80 ? 'bg-red-500' : 
                                storageUsage.percentage_used > 50 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(storageUsage.percentage_used, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500">
                            {storageUsage.used_mb} MB / {storageUsage.max_mb} MB
                          </p>
                        </div>
                      )}

                      {/* Documents List */}
                      {documents.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No documents uploaded</p>
                      ) : (
                        <div className="space-y-2">
                          {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                              <div className="flex items-center gap-3">
                                {getFileIcon(doc.file_type)}
                                <div>
                                  <p className="text-sm font-medium text-brand-dark truncate max-w-[200px]" title={doc.original_filename}>
                                    {doc.original_filename}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(doc.file_size)} • {doc.category}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleView(emp.id, doc.id)}
                                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDownload(emp.id, doc.id, doc.original_filename)}
                                  className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
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
            </div>
          ))
        )}
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
    </motion.div>
  );
};

export default AdminEmployeeDocuments;
