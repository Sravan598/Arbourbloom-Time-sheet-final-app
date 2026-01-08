import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  Palmtree,
  Thermometer,
  User,
  Ban,
  MessageSquare
} from 'lucide-react';
import axios from 'axios';
import { Button } from '../../components/ui/Button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const leaveTypeIcons = {
  VACATION: Palmtree,
  SICK: Thermometer,
  PERSONAL: User,
  UNPAID: Ban
};

const leaveTypeColors = {
  VACATION: 'text-blue-600 bg-blue-100',
  SICK: 'text-red-600 bg-red-100',
  PERSONAL: 'text-purple-600 bg-purple-100',
  UNPAID: 'text-gray-600 bg-gray-100'
};

const AdminLeaveSection = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/leave/requests?status=pending`);
      setRequests(response.data);
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchRequests();
      setIsLoading(false);
    };
    loadData();
  }, [fetchRequests]);

  const handleReview = async (requestId, status) => {
    setProcessing(true);
    try {
      await axios.put(`${API}/admin/leave/request/${requestId}`, {
        status,
        admin_notes: adminNotes || null
      });
      setSelectedRequest(null);
      setAdminNotes('');
      await fetchRequests();
    } catch (err) {
      console.error('Failed to review request:', err);
    } finally {
      setProcessing(false);
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
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-brand-red" />
          <h2 className="text-lg font-bold text-brand-dark">Pending Leave Requests</h2>
        </div>
        {requests.length > 0 && (
          <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
            {requests.length} pending
          </span>
        )}
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
          <p className="text-gray-500">No pending leave requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const TypeIcon = leaveTypeIcons[request.leave_type] || Calendar;
            return (
              <motion.div
                key={request.id}
                layout
                className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${leaveTypeColors[request.leave_type]}`}>
                      <TypeIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-brand-dark">{request.user_name}</p>
                      <p className="text-sm text-gray-500">{request.user_email}</p>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="text-brand-dark font-medium">
                          {request.leave_type.charAt(0) + request.leave_type.slice(1).toLowerCase()} Leave
                        </span>
                        <span className="text-gray-500">
                          {formatDate(request.start_date)} - {formatDate(request.end_date)}
                        </span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
                          {request.total_days} day{request.total_days > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                        <strong>Reason:</strong> {request.reason}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedRequest === request.id ? (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Admin Notes (optional)
                      </label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add a note for the employee..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-red focus:border-transparent resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleReview(request.id, 'APPROVED')}
                        variant="primary"
                        size="sm"
                        disabled={processing}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReview(request.id, 'REJECTED')}
                        variant="secondary"
                        size="sm"
                        disabled={processing}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedRequest(null);
                          setAdminNotes('');
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => setSelectedRequest(request.id)}
                      variant="primary"
                      size="sm"
                    >
                      Review Request
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminLeaveSection;
