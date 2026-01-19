import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, 
  Pin, 
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const priorityConfig = {
  URGENT: { color: 'red', icon: AlertTriangle, label: 'Urgent', bgClass: 'bg-red-50 border-red-200', badgeClass: 'bg-red-100 text-gray-800', dotClass: 'bg-red-500' },
  IMPORTANT: { color: 'yellow', icon: AlertCircle, label: 'Important', bgClass: 'bg-yellow-50 border-yellow-200', badgeClass: 'bg-yellow-100 text-yellow-700', dotClass: 'bg-yellow-500' },
  NORMAL: { color: 'green', icon: Info, label: 'Normal', bgClass: 'bg-white border-gray-200', badgeClass: 'bg-green-100 text-green-700', dotClass: 'bg-green-500' }
};

const AnnouncementsSection = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const [announcementsRes, countRes] = await Promise.all([
        axios.get(`${API}/announcements`),
        axios.get(`${API}/announcements/unread-count`)
      ]);
      setAnnouncements(announcementsRes.data);
      setUnreadCount(countRes.data.unread_count);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const markAsRead = async (announcementId) => {
    try {
      await axios.post(`${API}/announcements/${announcementId}/mark-read`);
      setAnnouncements(prev => 
        prev.map(ann => 
          ann.id === announcementId ? { ...ann, is_read: true } : ann
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const toggleExpand = (announcement) => {
    if (expandedId === announcement.id) {
      setExpandedId(null);
    } else {
      setExpandedId(announcement.id);
      if (!announcement.is_read) {
        markAsRead(announcement.id);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-brand-dark">Announcements</h2>
        </div>
        <div className="text-center py-6">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-brand-dark">Announcements</h2>
        </div>
        <div className="text-center py-6">
          <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No announcements at this time</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-lg p-6"
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center relative">
            <Megaphone className="w-5 h-5 text-purple-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-dark">Announcements</h2>
            <p className="text-sm text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
          {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>

      {/* Announcements List */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3 max-h-[350px] overflow-y-auto">
              {announcements.map((ann) => {
                const config = priorityConfig[ann.priority] || priorityConfig.NORMAL;
                const PriorityIcon = config.icon;
                const isExpanded = expandedId === ann.id;
                
                return (
                  <motion.div
                    key={ann.id}
                    layout
                    className={`rounded-xl border-2 overflow-hidden transition-all ${config.bgClass} ${
                      !ann.is_read ? 'ring-2 ring-purple-200' : ''
                    }`}
                  >
                    {/* Announcement Header */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpand(ann)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Unread indicator */}
                        <div className="pt-1">
                          {!ann.is_read ? (
                            <div className={`w-2 h-2 rounded-full ${config.dotClass}`} />
                          ) : (
                            <Check className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {ann.is_pinned && (
                              <Pin className="w-3 h-3 text-purple-500" />
                            )}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeClass}`}>
                              <PriorityIcon className="w-3 h-3" />
                              {config.label}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(ann.created_at)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-brand-dark">{ann.title}</h3>
                          {!isExpanded && (
                            <p className="text-sm text-gray-600 line-clamp-1 mt-1">{ann.message}</p>
                          )}
                        </div>
                        
                        <button className="p-1 text-gray-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4"
                        >
                          <div className="pl-5 border-l-2 border-gray-200 ml-1">
                            <p className="text-gray-700 whitespace-pre-wrap">{ann.message}</p>
                            {ann.created_by_name && (
                              <p className="text-xs text-gray-400 mt-3">
                                Posted by {ann.created_by_name}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AnnouncementsSection;
