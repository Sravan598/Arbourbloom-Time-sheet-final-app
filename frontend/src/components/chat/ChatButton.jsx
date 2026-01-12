import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';

const ChatButton = ({ isOpen, onClick, unreadCount = 0, isConnected = false }) => {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className={`relative w-14 h-14 rounded-full shadow-lg 
                      flex items-center justify-center transition-all
                      ${isOpen 
                        ? 'bg-gray-800 hover:bg-gray-700' 
                        : 'bg-gradient-to-r from-brand-red to-red-600 hover:from-red-600 hover:to-red-700'
                      }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
        
        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full
                       flex items-center justify-center text-xs font-bold text-white shadow-md"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
        
        {/* Connection status indicator */}
        {!isOpen && (
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full 
                          border-2 border-white flex items-center justify-center
                          ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}
               title={isConnected ? 'Connected' : 'Connecting...'}
          >
          </div>
        )}
        
        {/* Pulse animation when not open */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-brand-red animate-ping opacity-20" />
        )}
      </div>
      
      {/* Tooltip */}
      {!isOpen && (
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 
                        bg-gray-800 text-white text-sm px-3 py-1.5 rounded-lg
                        opacity-0 hover:opacity-100 pointer-events-none
                        whitespace-nowrap shadow-lg transition-opacity">
          Team Chat
          <div className="absolute left-full top-1/2 -translate-y-1/2 
                          border-8 border-transparent border-l-gray-800" />
        </div>
      )}
    </motion.button>
  );
};

export default ChatButton;
