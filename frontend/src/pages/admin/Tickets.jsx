import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { NotificationBell } from '../../components/notifications';
import { 
  Ticket, Search, Filter, Clock, AlertTriangle, CheckCircle, 
  MessageSquare, Paperclip, User, Users, ChevronDown, X,
  ArrowUpRight, RefreshCw, Send, FileText, Image as ImageIcon, Plus
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CATEGORY_OPTIONS = [
  { value: 'IT_SUPPORT', label: 'IT Support', icon: '💻' },
  { value: 'HR', label: 'Human Resources', icon: '👥' },
  { value: 'PAYROLL', label: 'Payroll', icon: '💰' },
  { value: 'FACILITIES', label: 'Facilities', icon: '🏢' },
  { value: 'TIME_ATTENDANCE', label: 'Time & Attendance', icon: '⏰' },
  { value: 'BENEFITS', label: 'Benefits', icon: '🎁' },
  { value: 'OTHER', label: 'Other', icon: '📋' }
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-700' }
];

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'WAITING_ON_USER', label: 'Waiting on User', color: 'bg-purple-100 text-purple-700' },
  { value: 'RESOLVED', label: 'Resolved', color: 'bg-green-100 text-green-700' },
  { value: 'CLOSED', label: 'Closed', color: 'bg-gray-100 text-gray-700' }
];

const AdminTickets = () => {
  const { user, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [admins, setAdmins] = useState([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignedToMe, setShowAssignedToMe] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (showAssignedToMe) params.append('assigned_to_me', 'true');
      
      const response = await fetch(`${API_URL}/api/tickets?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  }, [token, statusFilter, categoryFilter, priorityFilter, showAssignedToMe]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/tickets/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [token]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setAdmins(data.filter(u => u.role === 'ADMIN'));
      setEmployees(data.filter(u => u.role === 'EMPLOYEE'));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [token]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTickets(), fetchStats(), fetchUsers()]);
      setLoading(false);
    };
    loadData();
  }, [fetchTickets, fetchStats, fetchUsers]);

  const fetchComments = async (ticketId) => {
    try {
      const response = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    await fetchComments(ticket.id);
  };

  const handleUpdateTicket = async (ticketId, updates) => {
    try {
      const response = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        await fetchTickets();
        await fetchStats();
        if (selectedTicket?.id === ticketId) {
          const updated = await response.json();
          setSelectedTicket(updated);
        }
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;
    
    try {
      const response = await fetch(`${API_URL}/api/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newComment,
          is_internal: isInternalNote
        })
      });
      
      if (response.ok) {
        setNewComment('');
        setIsInternalNote(false);
        await fetchComments(selectedTicket.id);
        await fetchTickets();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.ticket_number?.toLowerCase().includes(query) ||
      ticket.subject?.toLowerCase().includes(query) ||
      ticket.creator_name?.toLowerCase().includes(query)
    );
  });

  const getCategoryInfo = (cat) => CATEGORY_OPTIONS.find(c => c.value === cat) || { label: cat, icon: '📋' };
  const getPriorityInfo = (pri) => PRIORITY_OPTIONS.find(p => p.value === pri) || { label: pri, color: 'bg-gray-100 text-gray-700' };
  const getStatusInfo = (status) => STATUS_OPTIONS.find(s => s.value === status) || { label: status, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-gray-500">Manage employee support requests</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.name}</span>
            <NotificationBell />
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Tickets</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_total}</p>
                </div>
                <Ticket className="w-10 h-10 text-blue-500 opacity-50" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Unassigned</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.unassigned}</p>
                </div>
                <User className="w-10 h-10 text-orange-500 opacity-50" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">SLA Breached</p>
                  <p className="text-2xl font-bold text-red-600">{stats.sla_breached}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-500 opacity-50" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Urgent/High</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {(stats.by_priority?.URGENT || 0) + (stats.by_priority?.HIGH || 0)}
                  </p>
                </div>
                <Clock className="w-10 h-10 text-amber-500 opacity-50" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.by_status?.resolved || 0}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500 opacity-50" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                data-testid="ticket-search-input"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              data-testid="ticket-status-filter"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              data-testid="ticket-category-filter"
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
              ))}
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              data-testid="ticket-priority-filter"
            >
              <option value="">All Priority</option>
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAssignedToMe}
                onChange={(e) => setShowAssignedToMe(e.target.checked)}
                className="rounded text-purple-600"
              />
              <span className="text-sm text-gray-600">Assigned to me</span>
            </label>
            
            <button
              onClick={() => { fetchTickets(); fetchStats(); }}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              data-testid="refresh-tickets-btn"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Ticket List */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading tickets...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No tickets found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredTickets.map(ticket => {
                    const category = getCategoryInfo(ticket.category);
                    const priority = getPriorityInfo(ticket.priority);
                    const status = getStatusInfo(ticket.status);
                    
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => handleSelectTicket(ticket)}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                        }`}
                        data-testid={`ticket-row-${ticket.ticket_number}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-500">{ticket.ticket_number}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${priority.color}`}>
                                {priority.label}
                              </span>
                              {ticket.sla_breached && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> SLA
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium text-gray-900 mb-1">{ticket.subject}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <span>{category.icon}</span> {category.label}
                              </span>
                              <span>{ticket.creator_name}</span>
                              <span>{formatDate(ticket.created_at)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                              {status.label}
                            </span>
                            {ticket.assigned_names?.length > 0 && (
                              <p className="text-xs text-gray-500 mt-2">
                                <Users className="w-3 h-3 inline mr-1" />
                                {ticket.assigned_names.join(', ')}
                              </p>
                            )}
                            {ticket.comment_count > 0 && (
                              <p className="text-xs text-gray-400 mt-1">
                                <MessageSquare className="w-3 h-3 inline mr-1" />
                                {ticket.comment_count} comments
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Ticket Detail Panel */}
          {selectedTicket && (
            <div className="w-[450px] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-220px)] relative z-50">
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-gray-500">{selectedTicket.ticket_number}</span>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h2 className="font-semibold text-gray-900">{selectedTicket.subject}</h2>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span>{getCategoryInfo(selectedTicket.category).icon}</span>
                  <span>{getCategoryInfo(selectedTicket.category).label}</span>
                  <span>•</span>
                  <span>Created {formatDate(selectedTicket.created_at)}</span>
                </div>
              </div>
              
              {/* Controls */}
              <div className="p-4 border-b border-gray-100 space-y-3 flex-shrink-0">
                <div className="flex gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateTicket(selectedTicket.id, { status: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    data-testid="ticket-detail-status"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => handleUpdateTicket(selectedTicket.id, { priority: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    data-testid="ticket-detail-priority"
                  >
                    {PRIORITY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                
                {/* Assign */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Assign to:</label>
                  <select
                    multiple
                    value={selectedTicket.assigned_to || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                      handleUpdateTicket(selectedTicket.id, { assigned_to: selected });
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    data-testid="ticket-assign-select"
                  >
                    {admins.map(admin => (
                      <option key={admin.id} value={admin.id}>{admin.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* SLA Info */}
                {selectedTicket.sla_due_at && (
                  <div className={`text-sm p-2 rounded-lg ${
                    selectedTicket.sla_breached 
                      ? 'bg-red-50 text-red-700' 
                      : 'bg-gray-50 text-gray-600'
                  }`}>
                    <Clock className="w-4 h-4 inline mr-1" />
                    SLA Due: {formatDate(selectedTicket.sla_due_at)}
                    {selectedTicket.sla_breached && ' (BREACHED)'}
                  </div>
                )}
              </div>

              {/* Creator Info & Description */}
              <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    {selectedTicket.creator_image ? (
                      <img src={selectedTicket.creator_image} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <User className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedTicket.creator_name}</p>
                    <p className="text-xs text-gray-500">{selectedTicket.creator_email}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                
                {/* Attachments */}
                {selectedTicket.attachments?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedTicket.attachments.map(att => (
                      <a
                        key={att.id}
                        href={`${API_URL}/api/tickets/attachments/${att.filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 hover:bg-gray-200"
                      >
                        {att.file_type?.startsWith('image') ? (
                          <ImageIcon className="w-3 h-3" />
                        ) : (
                          <FileText className="w-3 h-3" />
                        )}
                        {att.original_filename}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">No comments yet</p>
                ) : (
                  comments.map(comment => (
                    <div 
                      key={comment.id} 
                      className={`p-3 rounded-lg ${
                        comment.is_internal 
                          ? 'bg-amber-50 border border-amber-200' 
                          : comment.user_role === 'ADMIN'
                            ? 'bg-purple-50'
                            : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 text-gray-500" />
                        </div>
                        <span className="text-sm font-medium">{comment.user_name}</span>
                        {comment.user_role === 'ADMIN' && (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Admin</span>
                        )}
                        {comment.is_internal && (
                          <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Internal</span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded text-amber-500"
                    />
                    <span className="text-gray-500">Internal note (hidden from employee)</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={isInternalNote ? "Add internal note..." : "Add a comment..."}
                    rows={2}
                    className={`flex-1 px-3 py-2 border rounded-lg text-sm resize-none ${
                      isInternalNote ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                    }`}
                    data-testid="ticket-comment-input"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="ticket-send-comment-btn"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminTickets;
