import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Plus, User } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

const DMList = ({ 
  threads, 
  selectedThread, 
  onSelectThread, 
  onStartNewDM, 
  loading, 
  userStatus = {} 
}) => {
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  // Get user status
  const getUserStatus = (userId) => {
    return userStatus[userId]?.status || 'offline';
  };

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Direct Messages
        </h3>
        <button
          onClick={onStartNewDM}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="New message"
        >
          <Plus className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Thread list */}
      <div className="space-y-0.5">
        {loading ? (
          <div className="px-4 py-8 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full mx-auto" />
          </div>
        ) : threads.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No conversations yet</p>
            <button
              onClick={onStartNewDM}
              className="mt-2 text-sm text-brand-red hover:underline"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          threads.map((thread) => {
            const isSelected = selectedThread?.id === thread.id;
            const status = getUserStatus(thread.other_user_id);
            
            return (
              <motion.button
                key={thread.id}
                onClick={() => onSelectThread(thread)}
                className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors ${
                  isSelected 
                    ? 'bg-brand-red/10' 
                    : 'hover:bg-gray-50'
                }`}
                whileHover={{ x: 2 }}
              >
                {/* Avatar with status indicator */}
                <div className="relative flex-shrink-0">
                  {thread.other_user_image ? (
                    <img
                      src={thread.other_user_image}
                      alt={thread.other_user_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {thread.other_user_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  {/* Online status indicator */}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                    status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                </div>

                {/* Thread info */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium truncate ${
                      isSelected ? 'text-brand-red' : 'text-gray-900'
                    }`}>
                      {thread.other_user_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(thread.last_message?.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-gray-500 truncate flex-1">
                      {thread.last_message?.content || 'No messages yet'}
                    </p>
                    {/* Unread indicator */}
                    {thread.unread_count > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-red text-white text-xs flex items-center justify-center">
                        {thread.unread_count > 9 ? '9+' : thread.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DMList;
