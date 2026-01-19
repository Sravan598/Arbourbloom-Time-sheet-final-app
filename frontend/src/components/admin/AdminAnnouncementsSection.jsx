import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, 
  Plus, 
  Edit2, 
  Trash2, 
  Pin, 
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Eye,
  Calendar
} from 'lucide-react';
import axios from 'axios';
import { Button } from '../ui/Button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const priorityConfig = {
  URGENT: { color: 'red', icon: AlertTriangle, label: 'Urgent', bgClass: 'bg-red-100 text-gray-800 border-red-200' },
  IMPORTANT: { color: 'yellow', icon: AlertCircle, label: 'Important', bgClass: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  NORMAL: { color: 'green', icon: Info, label: 'Normal', bgClass: 'bg-green-100 text-green-700 border-green-200' }
};

const AdminAnnouncementsSection = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'NORMAL',
    is_pinned: false,
    expires_at: ''
  });

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/announcements`);
      setAnnouncements(response.data);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setForm({
      title: '',
      message: '',
      priority: 'NORMAL',
      is_pinned: false,
      expires_at: ''
    });
    setShowModal(true);
  };

  const openEditModal = (announcement) => {
    setEditingAnnouncement(announcement);
    setForm({
      title: announcement.title,
      message: announcement.message,
      priority: announcement.priority,
      is_pinned: announcement.is_pinned,
      expires_at: announcement.expires_at ? new Date(announcement.expires_at).toISOString().slice(0, 16) : ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const payload = {
        title: form.title,
        message: form.message,
        priority: form.priority,
        is_pinned: form.is_pinned,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null
      };

      if (editingAnnouncement) {
        await axios.put(`${API}/admin/announcements/${editingAnnouncement.id}`, payload);
        setSuccess('Announcement updated successfully!');
      } else {
        await axios.post(`${API}/admin/announcements`, payload);
        setSuccess('Announcement created successfully!');
      }
      
      setShowModal(false);
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      await axios.delete(`${API}/admin/announcements/${id}`);
      setSuccess('Announcement deleted successfully!');
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete announcement');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-dark">Announcements</h2>
            <p className="text-sm text-gray-500">{announcements.length} total</p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-gray-800">{error}</p>
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-green-500" />
          <p className="text-sm text-green-700">{success}</p>
          <button onClick={() => setSuccess('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Announcements List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-8">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No announcements yet</p>
          <p className="text-gray-400 text-sm">Create your first announcement</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {announcements.map((ann) => {
            const config = priorityConfig[ann.priority] || priorityConfig.NORMAL;
            const PriorityIcon = config.icon;
            const expired = isExpired(ann.expires_at);
            
            return (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border ${expired ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-100'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {ann.is_pinned && (
                        <Pin className="w-3 h-3 text-purple-500" />
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgClass}`}>
                        <PriorityIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                      {expired && (
                        <span className="text-xs text-gray-500">(Expired)</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-brand-dark truncate">{ann.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">{ann.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{formatDate(ann.created_at)}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {ann.read_count} read
                      </span>
                      {ann.expires_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Expires {formatDate(ann.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(ann)}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
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
              className="bg-white rounded-2xl p-6 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-brand-dark">
                  {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
                </h3>
                <button onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Announcement title"
                    required
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Message *</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="Write your announcement message..."
                    rows={4}
                    required
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{form.message.length}/2000</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Priority</label>
                  <div className="flex gap-2">
                    {Object.entries(priorityConfig).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setForm({ ...form, priority: key })}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                            form.priority === key
                              ? config.bgClass + ' border-current'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Expires On (Optional)</label>
                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_pinned"
                    checked={form.is_pinned}
                    onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="is_pinned" className="flex items-center gap-2 text-sm font-medium text-brand-dark">
                    <Pin className="w-4 h-4" />
                    Pin to top
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      editingAnnouncement ? 'Update' : 'Post Announcement'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminAnnouncementsSection;
