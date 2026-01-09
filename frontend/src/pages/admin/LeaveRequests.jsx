import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, CheckCircle, XCircle, Search,
  MessageSquare, Check, X
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import AdminSidebar from '../../components/admin/AdminSidebar';
import leaveService from '../../services/leaveService';

// Status badge - moved outside to avoid re-renders
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
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [processing, setProcessing] = useState(false);

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

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      
      <main className="flex-1 p-6 lg:p-8 ml-64">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
            <p className="text-gray-500 mt-1">Review and manage employee leave requests</p>
          </div>

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
                      ? 'bg-brand-red text-white' 
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
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(request.start_date), 'MMM d')}
                              {request.start_date !== request.end_date && (
                                <> - {format(new Date(request.end_date), 'MMM d, yyyy')}</>
                              )}
                              {request.start_date === request.end_date && (
                                <>, {format(new Date(request.start_date), 'yyyy')}</>
                              )}
                            </span>
                            <span>•</span>
                            <span>{request.days} day{request.days > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <StatusBadge status={request.status} />
                    </div>

                    {/* Leave Details */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg px-4 py-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Leave Type</p>
                        <p className="font-medium text-gray-900">
                          {request.leave_type}
                          {request.is_custom_type && (
                            <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Custom</span>
                          )}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-4 py-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reason</p>
                        <p className="text-gray-900">{request.reason}</p>
                      </div>
                    </div>

                    {/* Review Note (if exists) */}
                    {request.review_note && (
                      <div className="mt-4 bg-blue-50 rounded-lg px-4 py-3">
                        <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Admin Note</p>
                        <p className="text-blue-900">{request.review_note}</p>
                        {request.reviewer_name && (
                          <p className="text-xs text-blue-500 mt-1">— {request.reviewer_name}</p>
                        )}
                      </div>
                    )}

                    {/* Actions for Pending */}
                    {request.status === 'PENDING' && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        {reviewingId === request.id ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                Add a note (optional)
                              </label>
                              <textarea
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                placeholder="Optional note for the employee..."
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                           focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReview(request.id, 'APPROVED')}
                                disabled={processing}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white
                                           rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                <Check className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReview(request.id, 'DENIED')}
                                disabled={processing}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white
                                           rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                <X className="w-4 h-4" />
                                Deny
                              </button>
                              <button
                                onClick={() => {
                                  setReviewingId(null);
                                  setReviewNote('');
                                }}
                                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg
                                           hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setReviewingId(request.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white
                                         rounded-lg hover:bg-red-600 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Review Request
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-gray-400 mt-4">
                      Submitted {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      {request.reviewed_at && (
                        <> • Reviewed {formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true })}</>
                      )}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LeaveRequests;
