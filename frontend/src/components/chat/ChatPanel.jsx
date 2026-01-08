import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Search } from 'lucide-react';
import ChannelList from './ChannelList';
import DMList from './DMList';
import MessageView from './MessageView';
import chatService from '../../services/chatService';

// CORtracker logo URL
const CORTRACKER_LOGO = "https://customer-assets.emergentagent.com/job_readable-link/artifacts/ufwwws2h_image.png";

const ChatPanel = ({ isOpen, onClose, currentUser }) => {
  const [view, setView] = useState('list'); // 'list' | 'channel' | 'dm'
  const [channels, setChannels] = useState([]);
  const [dmThreads, setDMThreads] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch channels and DM threads
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [channelsData, threadsData, usersData] = await Promise.all([
        chatService.getChannels(),
        chatService.getDMThreads(),
        chatService.getChatUsers()
      ]);
      setChannels(channelsData);
      setDMThreads(threadsData);
      setChatUsers(usersData);
    } catch (error) {
      console.error('Error fetching chat data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  // Fetch messages for selected channel/thread
  const fetchMessages = useCallback(async () => {
    if (view === 'channel' && selectedChannel) {
      setMessagesLoading(true);
      try {
        const data = await chatService.getChannelMessages(selectedChannel.id);
        setMessages(data);
      } catch (error) {
        console.error('Error fetching channel messages:', error);
      } finally {
        setMessagesLoading(false);
      }
    } else if (view === 'dm' && selectedThread) {
      setMessagesLoading(true);
      try {
        const data = await chatService.getDMMessages(selectedThread.id);
        setMessages(data);
      } catch (error) {
        console.error('Error fetching DM messages:', error);
      } finally {
        setMessagesLoading(false);
      }
    }
  }, [view, selectedChannel, selectedThread]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Handle channel selection
  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
    setView('channel');
  };

  // Handle DM thread selection
  const handleSelectThread = (thread) => {
    setSelectedThread(thread);
    setView('dm');
  };

  // Send message
  const handleSendMessage = async (content) => {
    setSending(true);
    try {
      if (view === 'channel' && selectedChannel) {
        const newMsg = await chatService.sendChannelMessage(selectedChannel.id, content);
        setMessages(prev => [...prev, newMsg]);
      } else if (view === 'dm' && selectedThread) {
        const newMsg = await chatService.sendDMMessage(selectedThread.id, content);
        setMessages(prev => [...prev, newMsg]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Create new channel
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    
    try {
      const channel = await chatService.createChannel({
        name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
        description: newChannelDesc.trim() || null,
        type: 'PUBLIC'
      });
      setChannels(prev => [...prev, channel]);
      setNewChannelName('');
      setNewChannelDesc('');
      setShowCreateChannel(false);
      handleSelectChannel(channel);
    } catch (error) {
      console.error('Error creating channel:', error);
      alert(error.response?.data?.detail || 'Failed to create channel');
    }
  };

  // Start new DM
  const handleStartNewDM = async (userId) => {
    try {
      const thread = await chatService.startDMThread(userId);
      // Refresh threads and select the new one
      const threadsData = await chatService.getDMThreads();
      setDMThreads(threadsData);
      const newThread = threadsData.find(t => t.id === thread.id);
      if (newThread) {
        handleSelectThread(newThread);
      }
      setShowNewDM(false);
    } catch (error) {
      console.error('Error starting DM:', error);
    }
  };

  // Back to list
  const handleBack = () => {
    setView('list');
    setSelectedChannel(null);
    setSelectedThread(null);
    setMessages([]);
    fetchData(); // Refresh data for updated unread counts
  };

  // Filter users for new DM
  const filteredUsers = chatUsers.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-24 right-6 w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl
                 flex flex-col overflow-hidden border border-gray-200 z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-red to-red-600">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-white/90 text-lg tracking-tight">COR</span>
          <span className="font-semibold text-white text-lg">Chat</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'list' ? (
          <div className="h-full overflow-y-auto">
            {/* Channel List */}
            <ChannelList
              channels={channels}
              selectedChannel={selectedChannel}
              onSelectChannel={handleSelectChannel}
              onCreateChannel={() => setShowCreateChannel(true)}
              loading={loading}
            />

            {/* DM List */}
            <DMList
              threads={dmThreads}
              selectedThread={selectedThread}
              onSelectThread={handleSelectThread}
              onStartNewDM={() => setShowNewDM(true)}
              loading={loading}
            />
          </div>
        ) : (
          <MessageView
            type={view}
            target={view === 'channel' ? selectedChannel : selectedThread}
            messages={messages}
            currentUserId={currentUser?.id}
            onSendMessage={handleSendMessage}
            onBack={handleBack}
            loading={messagesLoading}
            sending={sending}
          />
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-4 m-4 w-full max-w-[320px] shadow-xl"
          >
            <h3 className="font-semibold text-gray-900 mb-3">Create Channel</h3>
            <form onSubmit={handleCreateChannel}>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Channel Name</label>
                  <div className="flex items-center mt-1">
                    <span className="text-gray-400 text-lg mr-1">#</span>
                    <input
                      type="text"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="new-channel"
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm
                                 focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Description (optional)</label>
                  <input
                    type="text"
                    value={newChannelDesc}
                    onChange={(e) => setNewChannelDesc(e.target.value)}
                    placeholder="What's this channel about?"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm mt-1
                               focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateChannel(false)}
                  className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newChannelName.trim()}
                  className="flex-1 px-3 py-2 text-sm bg-brand-red text-white rounded-md
                             hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* New DM Modal */}
      {showNewDM && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-4 m-4 w-full max-w-[320px] shadow-xl max-h-[400px] flex flex-col"
          >
            <h3 className="font-semibold text-gray-900 mb-3">New Message</h3>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people..."
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                autoFocus
              />
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleStartNewDM(user.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  {user.profile_image ? (
                    <img 
                      src={user.profile_image} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-red to-red-600 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No users found</p>
              )}
            </div>

            <button
              onClick={() => {
                setShowNewDM(false);
                setSearchQuery('');
              }}
              className="mt-3 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default ChatPanel;
