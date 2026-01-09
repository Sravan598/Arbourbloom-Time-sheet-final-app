import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Search, Plus, X as CloseIcon } from 'lucide-react';
import ChannelList from './ChannelList';
import DMList from './DMList';
import MessageView from './MessageView';
import CreateChannelModal from './CreateChannelModal';
import NewDMModal from './NewDMModal';
import SearchResults from './SearchResults';
import chatService, { wsManager } from '../../services/chatService';

const CORTRACKER_LOGO = "https://customer-assets.emergentagent.com/job_readable-link/artifacts/ufwwws2h_image.png";

const ChatPanel = ({ isOpen, onClose, currentUser, onMessageRead }) => {
  // View state
  const [view, setView] = useState('list'); // 'list', 'channel', 'dm', 'search'
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedDMThread, setSelectedDMThread] = useState(null);

  // Data state
  const [channels, setChannels] = useState([]);
  const [dmThreads, setDMThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [userStatus, setUserStatus] = useState({});

  // Loading states
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingDMs, setLoadingDMs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Modal states
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef({});

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    try {
      setLoadingChannels(true);
      const data = await chatService.getChannels();
      setChannels(data);
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  // Fetch DM threads
  const fetchDMThreads = useCallback(async () => {
    try {
      setLoadingDMs(true);
      const data = await chatService.getDMThreads();
      setDMThreads(data);
    } catch (error) {
      console.error('Error fetching DM threads:', error);
    } finally {
      setLoadingDMs(false);
    }
  }, []);

  // Fetch user status
  const fetchUserStatus = useCallback(async () => {
    try {
      const data = await chatService.getUserStatus();
      setUserStatus(data);
    } catch (error) {
      console.error('Error fetching user status:', error);
    }
  }, []);

  // Fetch messages for selected channel
  const fetchChannelMessages = useCallback(async (channelId) => {
    try {
      setLoadingMessages(true);
      const data = await chatService.getChannelMessages(channelId);
      setMessages(data);
    } catch (error) {
      console.error('Error fetching channel messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Fetch messages for selected DM thread
  const fetchDMMessages = useCallback(async (threadId) => {
    try {
      setLoadingMessages(true);
      const data = await chatService.getDMMessages(threadId);
      setMessages(data);
    } catch (error) {
      console.error('Error fetching DM messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (isOpen) {
      fetchChannels();
      fetchDMThreads();
      fetchUserStatus();
    }
  }, [isOpen, fetchChannels, fetchDMThreads, fetchUserStatus]);

  // WebSocket event handlers
  useEffect(() => {
    // Handle new messages
    const unsubMessage = wsManager.on('newMessage', (data) => {
      const { channel_id, dm_thread_id, message } = data;
      
      // Update messages if viewing the relevant conversation
      if ((channel_id && selectedChannel?.id === channel_id) ||
          (dm_thread_id && selectedDMThread?.id === dm_thread_id)) {
        setMessages(prev => [...prev, message]);
      }
      
      // Update channel/thread preview
      if (channel_id) {
        setChannels(prev => prev.map(ch => 
          ch.id === channel_id 
            ? { ...ch, last_message: message, unread_count: (ch.unread_count || 0) + 1 }
            : ch
        ));
      } else if (dm_thread_id) {
        setDMThreads(prev => prev.map(t => 
          t.id === dm_thread_id
            ? { ...t, last_message: message, unread_count: (t.unread_count || 0) + 1 }
            : t
        ));
      }
    });

    // Handle typing indicators
    const unsubTyping = wsManager.on('typing', (data) => {
      const { channel_id, thread_id, user_id, user_name } = data;
      const key = channel_id || thread_id;
      
      if (user_id === currentUser?.id) return; // Ignore own typing
      
      setTypingUsers(prev => ({
        ...prev,
        [key]: { user_name, timestamp: Date.now() }
      }));
      
      // Clear typing indicator after 3 seconds
      if (typingTimeoutRef.current[key]) {
        clearTimeout(typingTimeoutRef.current[key]);
      }
      typingTimeoutRef.current[key] = setTimeout(() => {
        setTypingUsers(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
      }, 3000);
    });

    // Handle reaction updates
    const unsubReaction = wsManager.on('reactionUpdate', (data) => {
      const { message_id, reactions } = data;
      setMessages(prev => prev.map(msg => 
        msg.id === message_id ? { ...msg, reactions } : msg
      ));
    });

    // Handle user status updates
    const unsubStatus = wsManager.on('userStatus', (data) => {
      const { user_id, status } = data;
      setUserStatus(prev => ({
        ...prev,
        [user_id]: { ...prev[user_id], status }
      }));
    });

    return () => {
      unsubMessage();
      unsubTyping();
      unsubReaction();
      unsubStatus();
    };
  }, [selectedChannel, selectedDMThread, currentUser]);

  // Select channel handler
  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
    setSelectedDMThread(null);
    setView('channel');
    fetchChannelMessages(channel.id);
    onMessageRead?.();
  };

  // Select DM thread handler
  const handleSelectDMThread = (thread) => {
    setSelectedDMThread(thread);
    setSelectedChannel(null);
    setView('dm');
    fetchDMMessages(thread.id);
    onMessageRead?.();
  };

  // Send message handler
  const handleSendMessage = async (content) => {
    if (sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      if (view === 'channel' && selectedChannel) {
        const newMessage = await chatService.sendChannelMessage(selectedChannel.id, content);
        setMessages(prev => [...prev, newMessage]);
      } else if (view === 'dm' && selectedDMThread) {
        const newMessage = await chatService.sendDMMessage(selectedDMThread.id, content);
        setMessages(prev => [...prev, newMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle typing
  const handleTyping = useCallback(() => {
    if (view === 'channel' && selectedChannel) {
      wsManager.sendTyping(selectedChannel.id, null);
    } else if (view === 'dm' && selectedDMThread) {
      wsManager.sendTyping(null, selectedDMThread.id);
    }
  }, [view, selectedChannel, selectedDMThread]);

  // Search handler
  const handleSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      setIsSearching(true);
      const results = await chatService.searchMessages(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (showSearch) {
        handleSearch(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, showSearch]);

  // Create channel handler
  const handleCreateChannel = async (channelData) => {
    try {
      const newChannel = await chatService.createChannel(channelData);
      setChannels(prev => [...prev, newChannel]);
      setShowCreateChannel(false);
      handleSelectChannel(newChannel);
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  };

  // Start new DM handler
  const handleStartDM = async (userId) => {
    try {
      const thread = await chatService.startDMThread(userId);
      setDMThreads(prev => {
        const exists = prev.find(t => t.id === thread.id);
        if (exists) return prev;
        return [...prev, thread];
      });
      setShowNewDM(false);
      handleSelectDMThread(thread);
    } catch (error) {
      console.error('Error starting DM:', error);
    }
  };

  // Back to list handler
  const handleBackToList = () => {
    setView('list');
    setSelectedChannel(null);
    setSelectedDMThread(null);
    setMessages([]);
    onMessageRead?.();
  };

  // Get typing indicator for current view
  const getTypingIndicator = () => {
    const key = selectedChannel?.id || selectedDMThread?.id;
    return typingUsers[key];
  };

  // Handle search result click
  const handleSearchResultClick = (result) => {
    if (result.context_type === 'channel') {
      const channel = channels.find(c => c.id === result.channel_id);
      if (channel) {
        setShowSearch(false);
        setSearchQuery('');
        handleSelectChannel(channel);
      }
    } else if (result.context_type === 'dm') {
      const thread = dmThreads.find(t => t.id === result.dm_thread_id);
      if (thread) {
        setShowSearch(false);
        setSearchQuery('');
        handleSelectDMThread(thread);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-24 right-6 w-[380px] h-[550px] bg-white rounded-2xl shadow-2xl 
                 border border-gray-200 overflow-hidden z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-red to-red-600">
        <div className="flex items-center gap-3">
          <div className="bg-white/95 rounded px-1.5 py-0.5">
            <img src={CORTRACKER_LOGO} alt="CORtracker" className="h-4 w-auto" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-lg">CORChat</h2>
            <p className="text-xs text-white/70">Team Communication</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-full transition-colors ${
              showSearch ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
            title="Search messages"
          >
            <Search className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 overflow-hidden"
          >
            <div className="p-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <CloseIcon className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>
            
            {/* Search Results */}
            {(searchQuery.length >= 2 || searchResults.length > 0) && (
              <SearchResults
                results={searchResults}
                loading={isSearching}
                onResultClick={handleSearchResultClick}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {view === 'list' ? (
          <div className="h-full overflow-y-auto">
            {/* Channels */}
            <ChannelList
              channels={channels}
              selectedChannel={selectedChannel}
              onSelectChannel={handleSelectChannel}
              onCreateChannel={() => setShowCreateChannel(true)}
              loading={loadingChannels}
            />
            
            {/* DMs */}
            <DMList
              threads={dmThreads}
              selectedThread={selectedDMThread}
              onSelectThread={handleSelectDMThread}
              onStartNewDM={() => setShowNewDM(true)}
              loading={loadingDMs}
              userStatus={userStatus}
            />
          </div>
        ) : (
          <MessageView
            type={view === 'channel' ? 'channel' : 'dm'}
            target={view === 'channel' ? selectedChannel : selectedDMThread}
            messages={messages}
            currentUserId={currentUser?.id}
            onSendMessage={handleSendMessage}
            onBack={handleBackToList}
            onTyping={handleTyping}
            loading={loadingMessages}
            sending={sendingMessage}
            typingIndicator={getTypingIndicator()}
          />
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateChannel && (
          <CreateChannelModal
            onClose={() => setShowCreateChannel(false)}
            onCreate={handleCreateChannel}
          />
        )}
        {showNewDM && (
          <NewDMModal
            onClose={() => setShowNewDM(false)}
            onSelectUser={handleStartDM}
            currentUserId={currentUser?.id}
            userStatus={userStatus}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ChatPanel;
