import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import ChatButton from './ChatButton';
import ChatPanel from './ChatPanel';
import chatService from '../../services/chatService';

const CORChat = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  // Fetch unread counts 
  const fetchUnreadCounts = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const counts = await chatService.getUnreadCounts();
      setUnreadCount(counts.total);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }, [currentUser]);

  // Initial fetch and polling setup
  useEffect(() => {
    if (!currentUser) return;

    // Initial fetch with a small delay to avoid immediate state update
    const initialTimeout = setTimeout(() => {
      fetchUnreadCounts();
    }, 100);

    // Poll for updates every 30 seconds
    intervalRef.current = setInterval(fetchUnreadCounts, 30000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentUser, fetchUnreadCounts]);

  // Refresh counts when closing chat
  useEffect(() => {
    if (!isOpen && currentUser) {
      // Refresh counts after closing to get updated unread counts
      const timeout = setTimeout(fetchUnreadCounts, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, currentUser, fetchUnreadCounts]);

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
