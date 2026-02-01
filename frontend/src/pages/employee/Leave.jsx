import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Plus, X, Clock, CheckCircle, XCircle, 
  Trash2, ChevronDown, AlertCircle, Download 
} from 'lucide-react';
import { format } from 'date-fns';
import EmployeeSidebar from '../../components/employee/EmployeeSidebar';
import leaveService from '../../services/leaveService';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status badge component - moved outside to avoid re-renders
const StatusBadge = ({ status }) => {
  const config = {
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    APPROVED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    DENIED: { bg: 'bg-red-100', text: 'text-gray-800', icon: XCircle }
  };
  const { bg, text, icon: Icon } = config[status] || config.PENDING;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3.5 h-3.5" />
      {status}
    </span>
  );
};

const Leave = () => {
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    leave_type: '',
    custom_type: '',
    is_custom_type: false,
    start_date: '',
    end_date: '',
    reason: ''
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [requestsData, typesData] = await Promise.all([
        leaveService.getMyLeaveRequests(),
        leaveService.getLeaveTypes()
      ]);
      setRequests(requestsData);
      setLeaveTypes(typesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter requests
  const filteredRequests = filter === 'ALL' 
    ? requests 
    : requests.filter(r => r.status === filter);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const leaveType = formData.is_custom_type ? formData.custom_type : formData.leave_type;
      
      if (!leaveType) {
        setError('Please select or enter a leave type');
        setSubmitting(false);
        return;
      }

      await leaveService.createLeaveRequest({
        leave_type: leaveType,
        is_custom_type: formData.is_custom_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason
      });

      setShowModal(false);
      setFormData({
        leave_type: '',
        custom_type: '',
        is_custom_type: false,
        start_date: '',
        end_date: '',
        reason: ''
      });
      fetchData();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancel request
  const handleCancel = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    
    try {
      await leaveService.cancelLeaveRequest(requestId);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to cancel request');
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    try {
      const token = localStorage.getItem('cortracker_token');
      const response = await fetch(`${API_URL}/api/export/my-leave-requests/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
          : `My_Leave_Requests_${new Date().toISOString().split('T')[0]}.pdf`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        console.error('Failed to export PDF');
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <EmployeeSidebar />
      
      <main className="flex-1 p-6 lg:p-8 ml-64">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leave / PTO</h1>
              <p className="text-gray-500 mt-1">Request and manage your time off</p>
            </div>
            <motion.button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2 bg-brand-black text-white rounded-full
                         hover:bg-gray-700 transition-colors font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-5 h-5" />
              Request Leave
            </motion.button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            {['ALL', 'PENDING', 'APPROVED', 'DENIED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${filter === status 
                    ? 'bg-brand-black text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
              >
                {status === 'ALL' ? 'All Requests' : status}
                {status !== 'ALL' && (
                  <span className="ml-1.5 text-xs">
                    ({requests.filter(r => r.status === status).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Requests List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-3 border-brand-black border-t-transparent rounded-full mx-auto" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No leave requests</h3>
                <p className="text-gray-500">
                  {filter === 'ALL' 
                    ? "You haven't submitted any leave requests yet" 
                    : `No ${filter.toLowerCase()} requests`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dates</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRequests.map((request) => (
                      <motion.tr
                        key={request.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {leaveTypes.find(t => t.name === request.leave_type)?.icon || '📅'}
                            </span>
                            <span className="font-medium text-gray-900">{request.leave_type}</span>
                            {request.is_custom_type && (
                              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Custom</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {format(new Date(request.start_date), 'MMM d, yyyy')}
                          {request.start_date !== request.end_date && (
                            <> - {format(new Date(request.end_date), 'MMM d, yyyy')}</>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {request.days} day{request.days > 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={request.reason}>
                          {request.reason}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={request.status} />
                          {request.review_note && (
                            <p className="text-xs text-gray-500 mt-1 max-w-[150px] truncate" title={request.review_note}>
                              Note: {request.review_note}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {request.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancel(request.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Cancel request"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Request Leave Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Request Leave</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-gray-800 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Leave Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                  {!formData.is_custom_type ? (
                    <div className="relative">
                      <select
                        value={formData.leave_type}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setFormData({ ...formData, is_custom_type: true, leave_type: '' });
                          } else {
                            setFormData({ ...formData, leave_type: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg appearance-none
                                   focus:outline-none focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black"
                        required
                      >
                        <option value="">Select leave type...</option>
                        {leaveTypes.map((type) => (
                          <option key={type.id} value={type.name}>
                            {type.icon} {type.name}
                          </option>
                        ))}
                        <option value="__custom__">+ Add custom type...</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.custom_type}
                        onChange={(e) => setFormData({ ...formData, custom_type: e.target.value })}
                        placeholder="Enter custom leave type..."
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_custom_type: false, custom_type: '' })}
                        className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg
                                 focus:outline-none focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      min={formData.start_date || new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg
                                 focus:outline-none focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black"
                      required
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Brief description of your leave request..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg resize-none
                               focus:outline-none focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black"
                    required
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg
                               hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-brand-black text-white rounded-lg
                               hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Leave;
