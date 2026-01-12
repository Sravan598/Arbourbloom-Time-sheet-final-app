import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, CheckCircle, XCircle, Search,
  MessageSquare, Check, X, Settings, Plus, Edit2, Trash2, Save, AlertCircle, Info
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import AdminSidebar from '../../components/admin/AdminSidebar';
import leaveService from '../../services/leaveService';

// Common emoji options for leave types
const EMOJI_OPTIONS = ['🏖️', '🤒', '👤', '🖤', '👶', '📅', '✈️', '🏠', '💼', '🎓', '⚕️', '🌴'];

// Status badge component
const StatusBadge = ({ status }) => {
  const config = {
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Pending' },
    APPROVED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Approved' },
    DENIED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Denied' }
  };
  const { bg, text, icon: Icon, label } = config[status] || config.PENDING;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${bg} ${text}`}>
      <Icon className="w-4 h-4" />
      {label}
    </span>
  );
};

const LeaveRequests = () => {
  // Main view state - 'requests' or 'settings'
  const [mainView, setMainView] = useState('requests');
  
  // Requests state
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [processing, setProcessing] = useState(false);

  // Settings state
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({ name: '', icon: '📅' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await leaveService.getAllLeaveRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch leave types
  const fetchTypes = useCallback(async () => {
    setLoadingTypes(true);
    try {
      const data = await leaveService.getLeaveTypes();
      setLeaveTypes(data);
    } catch (error) {
      console.error('Error fetching types:', error);
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchTypes();
  }, [fetchRequests, fetchTypes]);

  // Filter and search requests
  const filteredRequests = requests
    .filter(r => filter === 'ALL' || r.status === filter)
    .filter(r => 
      searchQuery === '' ||
      r.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.leave_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Group pending requests
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  // Handle review
  const handleReview = async (requestId, status) => {
    setProcessing(true);
    try {
      await leaveService.reviewLeaveRequest(requestId, {
        status,
        review_note: reviewNote || null
      });
      setReviewingId(null);
      setReviewNote('');
      fetchRequests();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to process request');
    } finally {
      setProcessing(false);
    }
  };

  // Handle create/update leave type
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingType) {
        await leaveService.updateLeaveType(editingType.id, formData);
      } else {
        await leaveService.createLeaveType(formData);
      }
      setShowModal(false);
      setEditingType(null);
      setFormData({ name: '', icon: '📅' });
      fetchTypes();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to save leave type');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete leave type
  const handleDelete = async (typeId) => {
    if (!window.confirm('Are you sure you want to delete this leave type?')) return;
    
    try {
      await leaveService.deleteLeaveType(typeId);
      fetchTypes();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to delete leave type');
    }
  };

  // Open edit modal
  const openEditModal = (type) => {
    setEditingType(type);
    setFormData({ name: type.name, icon: type.icon });
    setShowModal(true);
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingType(null);
    setFormData({ name: '', icon: '📅' });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      
      <main className="flex-1 p-6 lg:p-8 ml-64">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
              <p className="text-gray-500 mt-1">Review requests and manage leave settings</p>
            </div>
          </div>

          {/* Main Tabs - Requests vs Settings */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
            <button
              onClick={() => setMainView('requests')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                mainView === 'requests'
                  ? 'bg-brand-red text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
              data-testid="tab-requests"
            >
              <Calendar className="w-4 h-4" />
              Requests
              {pendingCount > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  mainView === 'requests' ? 'bg-white/20' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMainView('settings')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                mainView === 'settings'
                  ? 'bg-brand-red text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
              data-testid="tab-settings"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>

          {/* Requests View */}
          {mainView === 'requests' && (
            <>
              {/* Stats & Filter */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* Filter Tabs */}
                <div className="flex gap-2">
                  {[
                    { key: 'PENDING', label: 'Pending', count: pendingCount },
                    { key: 'APPROVED', label: 'Approved' },
                    { key: 'DENIED', label: 'Denied' },
                    { key: 'ALL', label: 'All' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
                        ${filter === tab.key 
                          ? 'bg-gray-800 text-white' 
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                          filter === tab.key ? 'bg-white/20' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="flex-1 max-w-xs ml-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or type..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                                 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                    />
                  </div>
                </div>
              </div>

              {/* Requests List */}
              <div className="space-y-4">
                {loading ? (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <div className="animate-spin w-8 h-8 border-3 border-brand-red border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No requests found</h3>
                    <p className="text-gray-500">
                      {filter === 'PENDING' 
                        ? 'No pending leave requests to review' 
                        : 'No leave requests match your criteria'}
                    </p>
                  </div>
                ) : (
                  filteredRequests.map((request) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          {/* Employee Info */}
                          <div className="flex items-start gap-4">
                            {request.user_image ? (
                              <img 
                                src={request.user_image} 
                                alt={request.user_name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-red to-red-600 flex items-center justify-center">
                                <span className="text-white font-semibold">
                                  {request.user_name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-gray-900">{request.user_name}</h3>
                              <p className="text-gray-500 text-sm">{request.leave_type}</p>
                              <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(request.start_date), 'MMM d, yyyy')}
                                  {request.end_date !== request.start_date && (
                                    <> - {format(new Date(request.end_date), 'MMM d, yyyy')}</>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status & Actions */}
                          <div className="flex flex-col items-end gap-2">
                            <StatusBadge status={request.status} />
                            {request.status !== 'PENDING' && request.reviewed_at && (
                              <span className="text-xs text-gray-400">
                                Reviewed {formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Reason */}
                        {request.reason && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Reason:</span> {request.reason}
                            </p>
                          </div>
                        )}

                        {/* Admin Note */}
                        {request.review_note && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <MessageSquare className="w-4 h-4 inline mr-1" />
                              <span className="font-medium">Admin Note:</span> {request.review_note}
                            </p>
                          </div>
                        )}

                        {/* Review Actions */}
                        {request.status === 'PENDING' && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            {reviewingId === request.id ? (
                              <div className="space-y-3">
                                <textarea
                                  value={reviewNote}
                                  onChange={(e) => setReviewNote(e.target.value)}
                                  placeholder="Add a note (optional)..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                             focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleReview(request.id, 'APPROVED')}
                                    disabled={processing}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 
                                               bg-green-600 text-white rounded-lg hover:bg-green-700 
                                               transition-colors disabled:opacity-50"
                                  >
                                    <Check className="w-4 h-4" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReview(request.id, 'DENIED')}
                                    disabled={processing}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 
                                               bg-red-600 text-white rounded-lg hover:bg-red-700 
                                               transition-colors disabled:opacity-50"
                                  >
                                    <X className="w-4 h-4" />
                                    Deny
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReviewingId(null);
                                      setReviewNote('');
                                    }}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg 
                                               hover:bg-gray-200 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setReviewingId(request.id)}
                                className="px-4 py-2 bg-brand-red text-white rounded-lg 
                                           hover:bg-red-600 transition-colors text-sm font-medium"
                              >
                                Review Request
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Settings View */}
          {mainView === 'settings' && (
            <div className="max-w-4xl">
              {/* Header with Add Button */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Leave Types</h2>
                  <p className="text-gray-500 text-sm mt-1">Manage default leave types for your organization</p>
                </div>
                <motion.button
                  onClick={openCreateModal}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-lg
                             hover:bg-red-600 transition-colors font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid="add-leave-type-btn"
                >
                  <Plus className="w-5 h-5" />
                  Add Type
                </motion.button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-900 text-sm">
                      <strong>Default leave types</strong> appear in the dropdown when employees request leave.
                      Employees can also enter custom leave types if needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Leave Types List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Default Leave Types</h3>
                </div>
                
                {loadingTypes ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin w-8 h-8 border-3 border-brand-red border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : leaveTypes.length === 0 ? (
                  <div className="p-8 text-center">
                    <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No leave types configured</p>
                    <button
                      onClick={openCreateModal}
                      className="mt-4 text-brand-red hover:underline text-sm font-medium"
                    >
                      Add your first leave type
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {leaveTypes.map((type, index) => (
                      <motion.div
                        key={type.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{type.icon}</span>
                          <span className="font-medium text-gray-900">{type.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(type)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(type.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Leave Type Modal */}
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
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingType ? 'Edit Leave Type' : 'Add Leave Type'}
                </h2>
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
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Icon Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: emoji })}
                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center
                                   transition-all ${
                                     formData.icon === emoji
                                       ? 'bg-brand-red/10 ring-2 ring-brand-red'
                                       : 'bg-gray-100 hover:bg-gray-200'
                                   }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Vacation, Sick Leave"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                    required
                  />
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Preview</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{formData.icon}</span>
                    <span className="font-medium text-gray-900">
                      {formData.name || 'Leave Type Name'}
                    </span>
                  </div>
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
                    disabled={submitting || !formData.name}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-red text-white rounded-lg
                               hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {submitting ? 'Saving...' : 'Save'}
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

export default LeaveRequests;
