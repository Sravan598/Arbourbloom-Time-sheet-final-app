import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import EmployeeSidebar from '../../components/employee/EmployeeSidebar';
import { NotificationBell } from '../../components/notifications';
import { 
  Ticket, Plus, Search, Clock, AlertTriangle, CheckCircle, 
  MessageSquare, Paperclip, User, X, Send, FileText, 
  Image as ImageIcon, Upload, ChevronRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CATEGORY_OPTIONS = [
  { value: 'IT_SUPPORT', label: 'IT Support', icon: '💻', description: 'Computer, software, network issues' },
  { value: 'HR', label: 'Human Resources', icon: '👥', description: 'HR policies, workplace concerns' },
  { value: 'PAYROLL', label: 'Payroll', icon: '💰', description: 'Salary, deductions, tax questions' },
  { value: 'FACILITIES', label: 'Facilities', icon: '🏢', description: 'Office equipment, maintenance' },
  { value: 'TIME_ATTENDANCE', label: 'Time & Attendance', icon: '⏰', description: 'Clock in/out, timesheet issues' },
  { value: 'BENEFITS', label: 'Benefits', icon: '🎁', description: 'Insurance, PTO, perks' },
  { value: 'OTHER', label: 'Other', icon: '📋', description: 'General questions' }
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-700', description: 'Not urgent' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-100 text-blue-700', description: 'Normal priority' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-700', description: 'Important' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-700', description: 'Needs immediate attention' }
];

const STATUS_COLORS = {
  OPEN: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  WAITING_ON_USER: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700'
};

const STATUS_LABELS = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_ON_USER: 'Waiting on You',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
};

const EmployeeTickets = () => {
  const { user, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const fileInputRef = useRef(null);
  const commentFileInputRef = useRef(null);
  
  // New ticket form
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'MEDIUM'
  });
  const [attachments, setAttachments] = useState([]);
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`${API_URL}/api/tickets?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

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
    setShowNewTicket(false);
    await fetchComments(ticket.id);
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description || !newTicket.category) {
      alert('Please fill in all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newTicket)
      });
      
      if (response.ok) {
        const created = await response.json();
        
        // Upload attachments if any
        for (const file of attachments) {
          const formData = new FormData();
          formData.append('file', file);
          
          await fetch(`${API_URL}/api/tickets/${created.id}/attachments`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
        }
        
        setNewTicket({ subject: '', description: '', category: '', priority: 'MEDIUM' });
        setAttachments([]);
        setShowNewTicket(false);
        await fetchTickets();
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;
    
    try {
      let response;
      
      if (commentAttachments.length > 0) {
        // Use multipart form for comments with attachments
        const formData = new FormData();
        formData.append('content', newComment);
        formData.append('is_internal', 'false');
        commentAttachments.forEach(file => {
          formData.append('files', file);
        });
        
        response = await fetch(`${API_URL}/api/tickets/${selectedTicket.id}/comments-with-attachments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
      } else {
        // Use JSON for text-only comments
        response = await fetch(`${API_URL}/api/tickets/${selectedTicket.id}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ content: newComment })
        });
      }
      
      if (response.ok) {
        setNewComment('');
        setCommentAttachments([]);
        await fetchComments(selectedTicket.id);
        await fetchTickets();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const handleCommentFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 25 * 1024 * 1024; // 25MB
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`File ${file.name} exceeds 25MB limit`);
        return false;
      }
      return true;
    });
    setCommentAttachments(prev => [...prev, ...validFiles]);
  };

  const removeCommentAttachment = (index) => {
    setCommentAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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

  const getCategoryInfo = (cat) => CATEGORY_OPTIONS.find(c => c.value === cat) || { label: cat, icon: '📋' };
  const getPriorityInfo = (pri) => PRIORITY_OPTIONS.find(p => p.value === pri) || { label: pri, color: 'bg-gray-100 text-gray-700' };

  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.ticket_number?.toLowerCase().includes(query) ||
      ticket.subject?.toLowerCase().includes(query)
    );
  });

  // Stats
  const openCount = tickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;
  const waitingCount = tickets.filter(t => t.status === 'WAITING_ON_USER').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeSidebar />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-gray-500">Get help from HR and IT support</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setShowNewTicket(true); setSelectedTicket(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-lg hover:bg-red-700 transition-colors"
              data-testid="create-ticket-btn"
            >
              <Plus className="w-4 h-4" />
              New Ticket
            </button>
            <span className="text-gray-600">{user?.name}</span>
            <NotificationBell />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total Tickets</p>
            <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-blue-600">{openCount}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Needs Response</p>
            <p className="text-2xl font-bold text-purple-600">{waitingCount}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Resolved</p>
            <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-transparent"
                data-testid="employee-ticket-search"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg"
              data-testid="employee-ticket-status-filter"
            >
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_ON_USER">Waiting on Me</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
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
                  <p>No tickets yet</p>
                  <button
                    onClick={() => setShowNewTicket(true)}
                    className="mt-4 text-brand-red hover:underline"
                  >
                    Create your first ticket
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredTickets.map(ticket => {
                    const category = getCategoryInfo(ticket.category);
                    const priority = getPriorityInfo(ticket.priority);
                    
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => handleSelectTicket(ticket)}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id ? 'bg-red-50 border-l-4 border-brand-red' : ''
                        }`}
                        data-testid={`employee-ticket-row-${ticket.ticket_number}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-500">{ticket.ticket_number}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${priority.color}`}>
                                {priority.label}
                              </span>
                              {ticket.status === 'WAITING_ON_USER' && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                  Needs Response
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium text-gray-900 mb-1">{ticket.subject}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <span>{category.icon}</span> {category.label}
                              </span>
                              <span>{formatDate(ticket.created_at)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[ticket.status]}`}>
                              {STATUS_LABELS[ticket.status]}
                            </span>
                            {ticket.comment_count > 0 && (
                              <p className="text-xs text-gray-400 mt-2">
                                <MessageSquare className="w-3 h-3 inline mr-1" />
                                {ticket.comment_count}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Detail/Create Panel */}
          {(selectedTicket || showNewTicket) && (
            <div className="w-[550px] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-200px)] relative z-50">
              {showNewTicket ? (
                /* New Ticket Form */
                <>
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Create New Ticket</h2>
                    <button onClick={() => setShowNewTicket(false)} className="p-1 hover:bg-gray-100 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Category Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                      <div className="grid grid-cols-2 gap-2">
                        {CATEGORY_OPTIONS.map(cat => (
                          <button
                            key={cat.value}
                            onClick={() => setNewTicket(prev => ({ ...prev, category: cat.value }))}
                            className={`p-3 border rounded-lg text-left transition-colors ${
                              newTicket.category === cat.value 
                                ? 'border-brand-red bg-red-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            data-testid={`category-${cat.value}`}
                          >
                            <span className="text-xl">{cat.icon}</span>
                            <p className="text-sm font-medium">{cat.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                      <input
                        type="text"
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Brief description of your issue"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red"
                        data-testid="ticket-subject-input"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                      <textarea
                        value={newTicket.description}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Please provide details about your issue..."
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-red resize-none"
                        data-testid="ticket-description-input"
                      />
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <div className="flex gap-2">
                        {PRIORITY_OPTIONS.map(pri => (
                          <button
                            key={pri.value}
                            onClick={() => setNewTicket(prev => ({ ...prev, priority: pri.value }))}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                              newTicket.priority === pri.value 
                                ? pri.color + ' ring-2 ring-offset-2 ring-gray-300' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            data-testid={`priority-${pri.value}`}
                          >
                            {pri.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Attachments */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        multiple
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 w-full justify-center"
                      >
                        <Upload className="w-4 h-4" />
                        Add files
                      </button>
                      {attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {attachments.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="flex-1 text-sm truncate">{file.name}</span>
                              <button onClick={() => removeAttachment(idx)} className="p-1 hover:bg-gray-200 rounded">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border-t border-gray-100">
                    <button
                      onClick={handleCreateTicket}
                      disabled={submitting || !newTicket.subject || !newTicket.description || !newTicket.category}
                      className="w-full py-3 bg-brand-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      data-testid="submit-ticket-btn"
                    >
                      {submitting ? 'Creating...' : 'Submit Ticket'}
                    </button>
                  </div>
                </>
              ) : selectedTicket && (
                /* Ticket Detail View */
                <>
                  <div className="p-4 border-b border-gray-100 flex-shrink-0 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-mono text-brand-red font-medium">{selectedTicket.ticket_number}</span>
                      <button onClick={() => setSelectedTicket(null)} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <h2 className="font-semibold text-gray-900 text-lg">{selectedTicket.subject}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[selectedTicket.status]}`}>
                        {STATUS_LABELS[selectedTicket.status]}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityInfo(selectedTicket.priority).color}`}>
                        {getPriorityInfo(selectedTicket.priority).label}
                      </span>
                    </div>
                  </div>

                  {/* Ticket Info */}
                  <div className="p-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <span>{getCategoryInfo(selectedTicket.category).icon}</span>
                      <span>{getCategoryInfo(selectedTicket.category).label}</span>
                      <span>•</span>
                      <span>Created {formatDate(selectedTicket.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                    
                    {/* Attachments */}
                    {selectedTicket.attachments?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedTicket.attachments.map(att => (
                          <a
                            key={att.id}
                            href={`${API_URL}/api/tickets/attachments/${att.filename}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            {att.file_type?.startsWith('image') ? (
                              <ImageIcon className="w-3.5 h-3.5" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                            {att.original_filename}
                          </a>
                        ))}
                      </div>
                    )}
                    
                    {/* Assigned To */}
                    {selectedTicket.assigned_names?.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Handled by:</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedTicket.assigned_names.map((name, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comments Section */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conversation</span>
                      <span className="text-xs text-gray-400">({comments.length})</span>
                    </div>
                    
                    {comments.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-6">No responses yet. Our team will get back to you soon.</p>
                    ) : (
                      comments.map(comment => (
                        <div 
                          key={comment.id} 
                          className={`p-3 rounded-xl shadow-sm ${
                            comment.user_role === 'ADMIN' 
                              ? 'bg-purple-50 border border-purple-100 ml-4' 
                              : 'bg-white border border-gray-200 mr-4'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                              comment.user_role === 'ADMIN' ? 'bg-purple-200' : 'bg-blue-200'
                            }`}>
                              <User className={`w-3.5 h-3.5 ${
                                comment.user_role === 'ADMIN' ? 'text-purple-700' : 'text-blue-700'
                              }`} />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{comment.user_name}</span>
                            {comment.user_role === 'ADMIN' && (
                              <span className="text-xs px-1.5 py-0.5 bg-purple-200 text-purple-800 rounded font-medium">Support Team</span>
                            )}
                            {comment.user_role !== 'ADMIN' && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded font-medium">You</span>
                            )}
                            <span className="text-xs text-gray-400 ml-auto">{formatDate(comment.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed pl-9">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Section - Clear separation */}
                  {!['CLOSED'].includes(selectedTicket.status) && (
                    <div className="p-4 border-t-2 border-gray-200 flex-shrink-0 bg-white">
                      <div className="flex gap-3">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Type your reply..."
                          rows={3}
                          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm resize-none focus:border-brand-red focus:ring-2 focus:ring-red-200 focus:outline-none transition-colors"
                          data-testid="employee-ticket-comment-input"
                        />
                        <button
                          onClick={handleAddComment}
                          disabled={!newComment.trim()}
                          className="px-5 py-3 bg-brand-red text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
                          data-testid="employee-send-comment-btn"
                        >
                          <Send className="w-4 h-4" />
                          <span className="hidden sm:inline">Send</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmployeeTickets;
