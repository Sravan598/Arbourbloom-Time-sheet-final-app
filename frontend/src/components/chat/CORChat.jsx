import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import ChatButton from './ChatButton';
import ChatPanel from './ChatPanel';
import chatService, { wsManager } from '../../services/chatService';

const AurborChat = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
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

  // Initialize WebSocket connection
  useEffect(() => {
    if (!currentUser) return;

    // Connect to WebSocket
    wsManager.connect();

    // Listen for connection events
    const unsubConnect = wsManager.on('connected', () => {
      setIsConnected(true);
    });

    const unsubDisconnect = wsManager.on('disconnected', () => {
      setIsConnected(false);
    });

    // Listen for new messages to update unread count
    const unsubMessage = wsManager.on('newMessage', (data) => {
      if (!isOpen) {
        // Only increment if chat is closed
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubMessage();
    };
  }, [currentUser, isOpen]);

  // Initial fetch and polling setup (as fallback)
  useEffect(() => {
    if (!currentUser) return;

    // Initial fetch with a small delay
    const initialTimeout = setTimeout(() => {
      fetchUnreadCounts();
    }, 100);

    // Poll for updates every 60 seconds (reduced frequency since we have WebSocket)
    intervalRef.current = setInterval(fetchUnreadCounts, 60000);

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
      const timeout = setTimeout(fetchUnreadCounts, 500);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, currentUser, fetchUnreadCounts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsManager.disconnect();
    };
  }, []);

  // Don't render if not logged in
  if (!currentUser) return null;

  return (
    <>
      <ChatButton
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        unreadCount={unreadCount}
        isConnected={isConnected}
      />
      
      <AnimatePresence>
        {isOpen && (
          <ChatPanel
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            currentUser={currentUser}
            onMessageRead={() => fetchUnreadCounts()}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default AurborChat;
