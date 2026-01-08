import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Plus, 
  X, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Palmtree,
  Thermometer,
  User,
  DollarOff
} from 'lucide-react';
import axios from 'axios';
import { Button } from '../../components/ui/Button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const leaveTypeIcons = {
  VACATION: Palmtree,
  SICK: Thermometer,
  PERSONAL: User,
  UNPAID: DollarOff
};

const leaveTypeColors = {
  VACATION: 'text-blue-600 bg-blue-100',
  SICK: 'text-red-600 bg-red-100',
  PERSONAL: 'text-purple-600 bg-purple-100',
  UNPAID: 'text-gray-600 bg-gray-100'
};

const statusColors = {
  PENDING: 'text-yellow-600 bg-yellow-100',
  APPROVED: 'text-green-600 bg-green-100',
  REJECTED: 'text-red-600 bg-red-100',
  CANCELLED: 'text-gray-600 bg-gray-100'
};

const LeavePTOSection = () => {
  const [balance, setBalance] = useState(null);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: 'VACATION',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/leave/balance`);
      setBalance(response.data);
    } catch (err) {
      console.error('Failed to fetch leave balance:', err);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/leave/requests`);
      setRequests(response.data);
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchBalance(), fetchRequests()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchBalance, fetchRequests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      // Format dates properly
      const payload = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      };

      await axios.post(`${API}/leave/request`, payload);
      setFormSuccess('Leave request submitted successfully!');
      setShowModal(false);
      setFormData({ leave_type: 'VACATION', start_date: '', end_date: '', reason: '' });
      await fetchRequests();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId) => {
    try {
      await axios.delete(`${API}/leave/request/${requestId}`);
      await fetchRequests();
    } catch (err) {
      console.error('Failed to cancel request:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl shadow-lg p-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-brand-red" />
            <h2 className="text-xl font-bold text-brand-dark">Leave / PTO</h2>
          </div>
          <Button
            onClick={() => setShowModal(true)}
            variant="primary"
            size="sm"
            data-testid="request-leave-btn"
          >
            <Plus className="w-4 h-4 mr-1" />
            Request Leave
          </Button>
        </div>

        {/* Success Message */}
        {formSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-green-700 text-sm">{formSuccess}</p>
          </motion.div>
        )}

        {/* Balance Cards */}
        {balance && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <Palmtree className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-blue-600 font-medium">Vacation</p>
              <p className="text-2xl font-bold text-blue-700">{balance.vacation_remaining}</p>
              <p className="text-xs text-blue-500">of {balance.vacation_total} days</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <Thermometer className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <p className="text-xs text-red-600 font-medium">Sick</p>
              <p className="text-2xl font-bold text-red-700">{balance.sick_remaining}</p>
              <p className="text-xs text-red-500">of {balance.sick_total} days</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <User className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-xs text-purple-600 font-medium">Personal</p>
              <p className="text-2xl font-bold text-purple-700">{balance.personal_remaining}</p>
              <p className="text-xs text-purple-500">of {balance.personal_total} days</p>
            </div>
          </div>
        )}

        {/* Recent Requests */}
        <div>
          <h3 className="font-semibold text-brand-dark mb-3">Recent Requests</h3>
          {requests.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No leave requests yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {requests.slice(0, 5).map((request) => {
                const TypeIcon = leaveTypeIcons[request.leave_type] || Calendar;
                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${leaveTypeColors[request.leave_type]}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-brand-dark text-sm">
                          {request.leave_type.charAt(0) + request.leave_type.slice(1).toLowerCase()} Leave
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(request.start_date)} - {formatDate(request.end_date)} ({request.total_days} day{request.total_days > 1 ? 's' : ''})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}>
                        {request.status}
                      </span>
                      {request.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancel(request.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Cancel request"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-brand-dark">Request Leave</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-red-700 text-sm">{formError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">
                    Leave Type
                  </label>
                  <select
                    value={formData.leave_type}
                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                    data-testid="leave-type-select"
                  >
                    <option value="VACATION">Vacation</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="PERSONAL">Personal Leave</option>
                    <option value="UNPAID">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                      required
                      data-testid="leave-start-date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      min={formData.start_date || new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent"
                      required
                      data-testid="leave-end-date"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">
                    Reason
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Brief description of your leave request..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-red focus:border-transparent resize-none"
                    required
                    minLength={5}
                    data-testid="leave-reason"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={submitting}
                    data-testid="submit-leave-btn"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LeavePTOSection;
