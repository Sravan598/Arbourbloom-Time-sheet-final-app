import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import EmployeeSidebar from '../../components/employee/EmployeeSidebar';
import { NotificationBell } from '../../components/notifications';
import { 
  Ticket, Plus, Search, Clock, AlertTriangle, CheckCircle, 
  MessageSquare, Paperclip, User, X, Send, FileText, 
  Image as ImageIcon, Upload
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper functions (outside component)
const getCategoryInfo = (cat) => CATEGORY_OPTIONS.find(c => c.value === cat) || { label: cat, icon: '📋' };
const getPriorityInfo = (pri) => PRIORITY_OPTIONS.find(p => p.value === pri) || { label: pri, color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' };

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatFullDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Ticket Card Component (outside main component)
const EmployeeTicketCard = ({ ticket, selectedTicket, draggedTicket, onDragStart, onDragEnd, onClick }) => {
  const category = getCategoryInfo(ticket.category);
  const priority = getPriorityInfo(ticket.priority);
  const needsResponse = ticket.status === 'WAITING_ON_USER';
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, ticket)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(ticket)}
      className={`bg-white rounded-lg shadow-sm border p-3 cursor-pointer hover:shadow-md transition-all ${
        needsResponse ? 'border-purple-300 ring-2 ring-purple-200' : 'border-gray-200'
      } ${selectedTicket?.id === ticket.id ? 'ring-2 ring-brand-black' : ''} ${
        draggedTicket?.id === ticket.id ? 'opacity-50' : ''
      }`}
      data-testid={`employee-ticket-card-${ticket.ticket_number}`}
    >
      {/* Header: Category Icon + Ticket # + Priority */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{category.icon}</span>
          <span className="text-xs font-mono text-gray-500">{ticket.ticket_number}</span>
        </div>
        <span className={`w-2 h-2 rounded-full ${priority.dot}`} title={priority.label}></span>
      </div>
      
      {/* Subject */}
      <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{ticket.subject}</h4>
      
      {/* Footer: Assigned + Time */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          {ticket.assigned_names?.length > 0 ? (
            <>
              <User className="w-3 h-3" />
              <span className="truncate max-w-[80px]">{ticket.assigned_names[0]}</span>
            </>
          ) : (
            <span className="text-gray-400 italic">Pending assignment</span>
          )}
        </div>
        <span>{formatDate(ticket.created_at)}</span>
      </div>
      
      {/* Comment count & needs response indicator */}
      <div className="flex items-center justify-between mt-2">
        {ticket.comment_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <MessageSquare className="w-3 h-3" />
            <span>{ticket.comment_count}</span>
          </div>
        )}
        {needsResponse && (
          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
            Reply needed
          </span>
        )}
      </div>
    </div>
  );
};

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
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400', description: 'Not urgent' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', description: 'Normal priority' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', description: 'Important' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-gray-800', dot: 'bg-red-500', description: 'Needs immediate attention' }
];

// Kanban columns - excluding CLOSED
const KANBAN_COLUMNS = [
  { value: 'OPEN', label: 'Open', color: 'border-yellow-400', bgColor: 'bg-yellow-50', headerBg: 'bg-yellow-100' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-400', bgColor: 'bg-blue-50', headerBg: 'bg-blue-100' },
  { value: 'WAITING_ON_USER', label: 'Needs Your Response', color: 'border-purple-400', bgColor: 'bg-purple-50', headerBg: 'bg-purple-100' },
  { value: 'RESOLVED', label: 'Resolved', color: 'border-green-400', bgColor: 'bg-green-50', headerBg: 'bg-green-100' }
];

const STATUS_LABELS = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_ON_USER: 'Needs Your Response',
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
  const fileInputRef = useRef(null);
  const commentFileInputRef = useRef(null);
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
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
      const response = await fetch(`${API_URL}/api/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      // Filter out CLOSED tickets for Kanban view
      setTickets(data.filter(t => t.status !== 'CLOSED'));
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

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
    const maxSize = 25 * 1024 * 1024;
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

  // Drag and Drop handlers - Employee can only drag to certain statuses
  const handleDragStart = (e, ticket) => {
    setDraggedTicket(ticket);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ticket.id);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    // Employee can only move tickets to WAITING_ON_USER (to respond) or keep in current
    if (draggedTicket && (status === 'WAITING_ON_USER' || status === draggedTicket.status)) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverColumn(status);
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    // Employee cannot change status via drag - they need to respond via comments
    // The drag effect is visual only to show where their tickets are
    setDraggedTicket(null);
  };

  const handleDragEnd = () => {
    setDraggedTicket(null);
    setDragOverColumn(null);
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.ticket_number?.toLowerCase().includes(query) ||
      ticket.subject?.toLowerCase().includes(query)
    );
  });

  // Group tickets by status for Kanban
  const ticketsByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.value] = filteredTickets.filter(t => t.status === col.value);
    return acc;
  }, {});

  // Stats
  const openCount = tickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;
  const waitingCount = tickets.filter(t => t.status === 'WAITING_ON_USER').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeSidebar />
      
      <main className="ml-64 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-gray-500">Get help from HR and IT support</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setShowNewTicket(true); setSelectedTicket(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-black text-white rounded-lg hover:bg-gray-800 transition-colors"
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

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-black focus:border-transparent"
                data-testid="employee-ticket-search"
              />
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-gray-500">Loading tickets...</div>
            </div>
          ) : tickets.length === 0 && !showNewTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 bg-white rounded-xl">
              <Ticket className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">No tickets yet</p>
              <button
                onClick={() => setShowNewTicket(true)}
                className="px-4 py-2 bg-brand-black text-white rounded-lg hover:bg-gray-800"
              >
                Create your first ticket
              </button>
            </div>
          ) : (
            KANBAN_COLUMNS.map(column => (
              <div
                key={column.value}
                className={`flex-1 min-w-[260px] max-w-[300px] rounded-xl ${column.bgColor} border-t-4 ${column.color} transition-all ${
                  dragOverColumn === column.value ? 'ring-2 ring-brand-black ring-offset-2' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.value)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.value)}
                data-testid={`employee-kanban-column-${column.value}`}
              >
                {/* Column Header */}
                <div className={`p-3 ${column.headerBg} rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 text-sm">{column.label}</h3>
                    <span className="px-2 py-0.5 bg-white rounded-full text-sm font-medium text-gray-600">
                      {ticketsByStatus[column.value]?.length || 0}
                    </span>
                  </div>
                </div>
                
                {/* Column Content */}
                <div className="p-3 space-y-3 min-h-[350px] max-h-[calc(100vh-420px)] overflow-y-auto">
                  {ticketsByStatus[column.value]?.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No tickets
                    </div>
                  ) : (
                    ticketsByStatus[column.value]?.map(ticket => (
                      <EmployeeTicketCard 
                        key={ticket.id} 
                        ticket={ticket}
                        selectedTicket={selectedTicket}
                        draggedTicket={draggedTicket}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onClick={handleSelectTicket}
                      />
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* New Ticket Modal */}
        {showNewTicket && (
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowNewTicket(false)}>
            <div 
              className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-lg">Create New Ticket</h2>
                <button onClick={() => setShowNewTicket(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
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
                            ? 'border-brand-black bg-red-50' 
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-black"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-black resize-none"
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
                  className="w-full py-3 bg-brand-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  data-testid="submit-ticket-btn"
                >
                  {submitting ? 'Creating...' : 'Submit Ticket'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Detail Panel */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedTicket(null)}>
            <div 
              className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 flex-shrink-0 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-brand-black font-medium">{selectedTicket.ticket_number}</span>
                  <button onClick={() => setSelectedTicket(null)} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h2 className="font-semibold text-gray-900 text-lg">{selectedTicket.subject}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedTicket.status === 'WAITING_ON_USER' ? 'bg-purple-100 text-purple-700' :
                    selectedTicket.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                    selectedTicket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
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
                  <span>Created {formatFullDate(selectedTicket.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                
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
                        {comment.user_role === 'ADMIN' ? (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-200 text-purple-800 rounded font-medium">Support Team</span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded font-medium">You</span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">{formatFullDate(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed pl-9">{comment.content}</p>
                      {comment.attachments?.length > 0 && (
                        <div className="mt-2 pl-9 flex flex-wrap gap-2">
                          {comment.attachments.map(att => (
                            <a
                              key={att.id}
                              href={`${API_URL}/api/tickets/attachments/${att.filename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50"
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
                  ))
                )}
              </div>

              {/* Add Comment Section */}
              {!['CLOSED'].includes(selectedTicket.status) && (
                <div className="p-4 border-t-2 border-gray-200 flex-shrink-0 bg-white">
                  <input
                    type="file"
                    ref={commentFileInputRef}
                    onChange={handleCommentFileSelect}
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.mp4,.mov,.webm"
                  />
                  
                  {commentAttachments.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {commentAttachments.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                          <Paperclip className="w-3 h-3 text-gray-500" />
                          <span className="truncate max-w-[120px]">{file.name}</span>
                          <button onClick={() => removeCommentAttachment(idx)} className="p-0.5 hover:bg-gray-200 rounded">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Type your reply..."
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm resize-none focus:border-brand-black focus:ring-2 focus:ring-red-200 focus:outline-none transition-colors"
                        data-testid="employee-ticket-comment-input"
                      />
                      <button
                        onClick={() => commentFileInputRef.current?.click()}
                        className="self-start flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        Attach files (max 25MB each)
                      </button>
                    </div>
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="px-5 py-3 h-fit bg-brand-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
                      data-testid="employee-send-comment-btn"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EmployeeTickets;
