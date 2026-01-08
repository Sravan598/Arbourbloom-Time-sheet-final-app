import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';

const ChatButton = ({ isOpen, onClick, unreadCount = 0 }) => {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center
                 bg-gradient-to-r from-brand-red to-red-600 hover:from-red-600 hover:to-red-700
                 transition-all duration-200 group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <X className="w-6 h-6 text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Unread badge */}
      <AnimatePresence>
        {unreadCount > 0 && !isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center
                       text-xs font-bold text-gray-900 border-2 border-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Ripple effect */}
      {!isOpen && unreadCount > 0 && (
        <motion.span
          className="absolute inset-0 rounded-full bg-brand-red"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
};

export default ChatButton;
