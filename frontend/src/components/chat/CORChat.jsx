import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import ChatButton from './ChatButton';
import ChatPanel from './ChatPanel';
import chatService from '../../services/chatService';

const CORChat = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread counts periodically
  const fetchUnreadCounts = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const counts = await chatService.getUnreadCounts();
      setUnreadCount(counts.total);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    // Initial fetch
    fetchUnreadCounts();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCounts, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCounts]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (isOpen) {
      // Refresh counts after a short delay to account for mark-as-read
      const timeout = setTimeout(fetchUnreadCounts, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, fetchUnreadCounts]);

  // Don't render if not logged in
  if (!currentUser) return null;

  return (
    <>
      <ChatButton
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        unreadCount={unreadCount}
      />
      
      <AnimatePresence>
        {isOpen && (
          <ChatPanel
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default CORChat;
