import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { NotificationBell } from '../../components/notifications';
import { 
  Ticket, Search, Clock, AlertTriangle, CheckCircle, 
  MessageSquare, User, Users, ChevronDown, X,
  RefreshCw, Send, FileText, Image as ImageIcon, Paperclip,
  GripVertical, Download
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper functions (outside component)
const getCategoryInfo = (cat) => CATEGORY_OPTIONS.find(c => c.value === cat) || { label: cat, icon: '📋' };
const getPriorityInfo = (pri) => PRIORITY_OPTIONS.find(p => p.value === pri) || { label: pri, color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' };
const getStatusInfo = (status) => STATUS_OPTIONS.find(s => s.value === status) || { label: status, color: 'bg-gray-100 text-gray-700' };

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
const TicketCard = ({ ticket, selectedTicket, draggedTicket, onDragStart, onDragEnd, onClick }) => {
  const category = getCategoryInfo(ticket.category);
  const priority = getPriorityInfo(ticket.priority);
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, ticket)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(ticket)}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-all ${
        selectedTicket?.id === ticket.id ? 'ring-2 ring-purple-500' : ''
      } ${draggedTicket?.id === ticket.id ? 'opacity-50' : ''}`}
      data-testid={`ticket-card-${ticket.ticket_number}`}
    >
      {/* Header: Category Icon + Ticket # + Priority */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{category.icon}</span>
          <span className="text-xs font-mono text-gray-500">{ticket.ticket_number}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {ticket.sla_breached && (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className={`w-2 h-2 rounded-full ${priority.dot}`} title={priority.label}></span>
        </div>
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
              {ticket.assigned_names.length > 1 && (
                <span className="text-gray-400">+{ticket.assigned_names.length - 1}</span>
              )}
            </>
          ) : (
            <span className="text-orange-500 italic">Unassigned</span>
          )}
        </div>
        <span>{formatDate(ticket.created_at)}</span>
      </div>
      
      {/* Comment count if any */}
      {ticket.comment_count > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
          <MessageSquare className="w-3 h-3" />
          <span>{ticket.comment_count}</span>
        </div>
      )}
    </div>
  );
};

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
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-gray-800', dot: 'bg-red-500' }
];

// Kanban columns - excluding CLOSED
const KANBAN_COLUMNS = [
  { value: 'OPEN', label: 'Open', color: 'border-yellow-400', bgColor: 'bg-yellow-50', headerBg: 'bg-yellow-100' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-400', bgColor: 'bg-blue-50', headerBg: 'bg-blue-100' },
  { value: 'WAITING_ON_USER', label: 'Waiting on User', color: 'border-purple-400', bgColor: 'bg-purple-50', headerBg: 'bg-purple-100' },
  { value: 'RESOLVED', label: 'Resolved', color: 'border-green-400', bgColor: 'bg-green-50', headerBg: 'bg-green-100' }
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
  const [admins, setAdmins] = useState([]);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState([]);
  const assignDropdownRef = useRef(null);
  const commentFileInputRef = useRef(null);
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignedToMe, setShowAssignedToMe] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(event.target)) {
        setShowAssignDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (showAssignedToMe) params.append('assigned_to_me', 'true');
      
      const response = await fetch(`${API_URL}/api/tickets?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      // Filter out CLOSED tickets for Kanban view
      setTickets(data.filter(t => t.status !== 'CLOSED'));
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  }, [token, categoryFilter, priorityFilter, showAssignedToMe]);

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
    setShowAssignDropdown(false);
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

  const handleToggleAssign = (adminId) => {
    const currentAssigned = selectedTicket.assigned_to || [];
    let newAssigned;
    if (currentAssigned.includes(adminId)) {
      newAssigned = currentAssigned.filter(id => id !== adminId);
    } else {
      newAssigned = [...currentAssigned, adminId];
    }
    handleUpdateTicket(selectedTicket.id, { assigned_to: newAssigned });
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;
    
    try {
      let response;
      
      if (commentAttachments.length > 0) {
        const formData = new FormData();
        formData.append('content', newComment);
        formData.append('is_internal', isInternalNote.toString());
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
          body: JSON.stringify({
            content: newComment,
            is_internal: isInternalNote
          })
        });
      }
      
      if (response.ok) {
        setNewComment('');
        setIsInternalNote(false);
        setCommentAttachments([]);
        await fetchComments(selectedTicket.id);
        await fetchTickets();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
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

  // Export to PDF
  const exportToPDF = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus.toUpperCase());
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterPriority !== 'all') params.append('priority', filterPriority);
      
      const response = await fetch(`${API_URL}/api/admin/export/tickets/pdf?${params.toString()}`, {
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
          : `Tickets_Report_${new Date().toISOString().split('T')[0]}.pdf`;
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

  // Drag and Drop handlers
  const handleDragStart = (e, ticket) => {
    setDraggedTicket(ticket);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ticket.id);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedTicket && draggedTicket.status !== newStatus) {
      await handleUpdateTicket(draggedTicket.id, { status: newStatus });
    }
    setDraggedTicket(null);
  };

  const handleDragEnd = () => {
    setDraggedTicket(null);
    setDragOverColumn(null);
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.ticket_number?.toLowerCase().includes(query) ||
      ticket.subject?.toLowerCase().includes(query) ||
      ticket.creator_name?.toLowerCase().includes(query)
    );
  });

  // Group tickets by status for Kanban
  const ticketsByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.value] = filteredTickets.filter(t => t.status === col.value);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <main className="ml-64 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-gray-500">Manage employee support requests</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              data-testid="export-tickets-pdf-btn"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
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
                  <p className="text-2xl font-bold text-gray-700">{stats.sla_breached}</p>
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

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-gray-500">Loading tickets...</div>
            </div>
          ) : (
            KANBAN_COLUMNS.map(column => (
              <div
                key={column.value}
                className={`flex-1 min-w-[280px] max-w-[320px] rounded-xl ${column.bgColor} border-t-4 ${column.color} transition-all ${
                  dragOverColumn === column.value ? 'ring-2 ring-purple-400 ring-offset-2' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.value)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.value)}
                data-testid={`kanban-column-${column.value}`}
              >
                {/* Column Header */}
                <div className={`p-3 ${column.headerBg} rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">{column.label}</h3>
                    <span className="px-2 py-0.5 bg-white rounded-full text-sm font-medium text-gray-600">
                      {ticketsByStatus[column.value]?.length || 0}
                    </span>
                  </div>
                </div>
                
                {/* Column Content */}
                <div className="p-3 space-y-3 min-h-[400px] max-h-[calc(100vh-400px)] overflow-y-auto">
                  {ticketsByStatus[column.value]?.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No tickets
                    </div>
                  ) : (
                    ticketsByStatus[column.value]?.map(ticket => (
                      <TicketCard 
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

        {/* Ticket Detail Panel */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedTicket(null)}>
            <div 
              className="fixed right-0 top-0 h-full w-[550px] bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex-shrink-0 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-purple-600 font-medium">{selectedTicket.ticket_number}</span>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h2 className="font-semibold text-gray-900 text-lg">{selectedTicket.subject}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    {getCategoryInfo(selectedTicket.category).icon}
                    {getCategoryInfo(selectedTicket.category).label}
                  </span>
                  <span>•</span>
                  <span>{formatFullDate(selectedTicket.created_at)}</span>
                </div>
              </div>
              
              {/* Controls */}
              <div className="p-4 border-b border-gray-100 flex-shrink-0 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Status</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateTicket(selectedTicket.id, { status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      data-testid="ticket-detail-status"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handleUpdateTicket(selectedTicket.id, { priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      data-testid="ticket-detail-priority"
                    >
                      {PRIORITY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Assign Dropdown */}
                <div ref={assignDropdownRef}>
                  <label className="text-xs text-gray-500 mb-1 block">Assign to</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-left flex items-center justify-between hover:border-gray-300 transition-colors"
                      data-testid="ticket-assign-dropdown"
                    >
                      <span className="text-gray-500">
                        {selectedTicket.assigned_to?.length > 0 
                          ? `${selectedTicket.assigned_to.length} assigned` 
                          : 'Select admins...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAssignDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showAssignDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {admins.map(admin => (
                          <label
                            key={admin.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTicket.assigned_to?.includes(admin.id) || false}
                              onChange={() => handleToggleAssign(admin.id)}
                              className="rounded text-purple-600"
                            />
                            <span className="text-sm">{admin.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {selectedTicket.assigned_names?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedTicket.assigned_names.map((name, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
                        >
                          <User className="w-3 h-3" />
                          {name}
                          <button
                            onClick={() => handleToggleAssign(selectedTicket.assigned_to[idx])}
                            className="hover:text-purple-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedTicket.sla_due_at && (
                  <div className={`text-xs p-2 rounded-lg flex items-center gap-2 ${
                    selectedTicket.sla_breached 
                      ? 'bg-red-50 text-gray-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>SLA Due: {formatFullDate(selectedTicket.sla_due_at)}</span>
                    {selectedTicket.sla_breached && <span className="font-semibold">(BREACHED)</span>}
                  </div>
                )}
              </div>

              {/* Creator Info & Description */}
              <div className="p-4 border-b border-gray-100 flex-shrink-0 bg-blue-50/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    {selectedTicket.creator_image ? (
                      <img src={selectedTicket.creator_image} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <User className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{selectedTicket.creator_name}</p>
                    <p className="text-xs text-gray-500">{selectedTicket.creator_email}</p>
                  </div>
                  <span className="ml-auto text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Requester</span>
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
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
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
              </div>

              {/* Comments Section */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conversation</span>
                  <span className="text-xs text-gray-400">({comments.length})</span>
                </div>
                
                {comments.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">No comments yet. Start the conversation below.</p>
                ) : (
                  comments.map(comment => (
                    <div 
                      key={comment.id} 
                      className={`p-3 rounded-xl shadow-sm ${
                        comment.is_internal 
                          ? 'bg-amber-50 border border-amber-200' 
                          : comment.user_role === 'ADMIN'
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
                          <span className="text-xs px-1.5 py-0.5 bg-purple-200 text-purple-800 rounded font-medium">Admin</span>
                        )}
                        {comment.user_role !== 'ADMIN' && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded font-medium">Employee</span>
                        )}
                        {comment.is_internal && (
                          <span className="text-xs px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded font-medium">Internal</span>
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
                              className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50 transition-colors"
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
              <div className="p-4 border-t-2 border-gray-200 flex-shrink-0 bg-white">
                <input
                  type="file"
                  ref={commentFileInputRef}
                  onChange={handleCommentFileSelect}
                  multiple
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.mp4,.mov,.webm"
                />
                
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded text-amber-500 w-4 h-4"
                    />
                    <span className={`text-sm ${isInternalNote ? 'text-amber-700 font-medium' : 'text-gray-500'}`}>
                      Internal note (hidden from employee)
                    </span>
                  </label>
                </div>
                
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
                      placeholder={isInternalNote ? "Add internal note for admins..." : "Type your reply to the employee..."}
                      rows={3}
                      className={`w-full px-4 py-3 border-2 rounded-xl text-sm resize-none transition-colors ${
                        isInternalNote 
                          ? 'border-amber-300 bg-amber-50 focus:border-amber-400 focus:ring-amber-200' 
                          : 'border-gray-200 focus:border-purple-400 focus:ring-purple-200'
                      } focus:ring-2 focus:outline-none`}
                      data-testid="ticket-comment-input"
                    />
                    <button
                      onClick={() => commentFileInputRef.current?.click()}
                      className="self-start flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      data-testid="ticket-attach-file-btn"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      Attach files (max 25MB each)
                    </button>
                  </div>
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className={`px-5 py-3 h-fit rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                      isInternalNote
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                    data-testid="ticket-send-comment-btn"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminTickets;
