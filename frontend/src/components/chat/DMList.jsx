import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown, ChevronRight, Circle } from 'lucide-react';

// Extracted ThreadItem component to avoid nested component definition
const ThreadItem = ({ thread, isSelected, onSelectThread }) => {
  return (
    <motion.button
      onClick={() => onSelectThread(thread)}
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left
                  transition-colors group ${
                    isSelected 
                      ? 'bg-brand-red/10' 
                      : 'hover:bg-gray-100'
                  }`}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Avatar */}
      <div className="relative">
        {thread.other_user_image ? (
          <img 
            src={thread.other_user_image} 
            alt={thread.other_user_name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-red to-red-600 flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {thread.other_user_name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        )}
        {/* Online indicator (placeholder - would need real-time status) */}
        <Circle className="w-2.5 h-2.5 absolute bottom-0 right-0 text-gray-400 fill-gray-400" />
      </div>

      {/* Name and preview */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${
          isSelected ? 'text-brand-red font-medium' : 'text-gray-900'
        }`}>
          {thread.other_user_name}
        </p>
        {thread.last_message && (
          <p className="text-xs text-gray-500 truncate">
            {thread.last_message.content}
          </p>
        )}
      </div>

      {/* Unread badge */}
      {thread.unread_count > 0 && (
        <span className="bg-brand-red text-white text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[20px] text-center">
          {thread.unread_count > 99 ? '99+' : thread.unread_count}
        </span>
      )}
    </motion.button>
  );
};

const DMList = ({ 
  threads, 
  selectedThread, 
  onSelectThread, 
  onStartNewDM,
  loading 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="py-2 border-t border-gray-100">
      {/* Direct Messages header */}
      <div className="px-3 mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider
                     hover:text-gray-700 transition-colors w-full"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          Direct Messages
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Thread list */}
            <div className="px-2 space-y-0.5">
              {threads.map(thread => (
                <ThreadItem 
                  key={thread.id} 
                  thread={thread}
                  isSelected={selectedThread?.id === thread.id}
                  onSelectThread={onSelectThread}
                />
              ))}
              
              {threads.length === 0 && !loading && (
                <p className="text-xs text-gray-400 px-3 py-2">No conversations yet</p>
              )}
            </div>

            {/* Start new DM button */}
            <div className="px-2 mt-2">
              <button
                onClick={onStartNewDM}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500
                           hover:bg-gray-100 hover:text-gray-700 rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Message</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="px-3 py-2">
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DMList;
