import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, User } from 'lucide-react';
import chatService from '../../services/chatService';

const NewDMModal = ({ onClose, onSelectUser, currentUserId, userStatus = {} }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [starting, setStarting] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await chatService.getChatUsers();
        // Filter out current user
        const filteredUsers = data.filter(u => u.id !== currentUserId);
        setUsers(filteredUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUserId]);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectUser = async (userId) => {
    setStarting(userId);
    try {
      await onSelectUser(userId);
    } catch (error) {
      console.error('Error starting DM:', error);
    } finally {
      setStarting(null);
    }
  };

  // Get user status
  const getUserStatus = (userId) => {
    return userStatus[userId]?.status || 'offline';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl w-full max-w-sm shadow-xl max-h-[80%] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">New Message</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:bg-white"
              autoFocus
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {searchQuery ? 'No users found' : 'No team members available'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {filteredUsers.map((user) => {
                const status = getUserStatus(user.id);
                
                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user.id)}
                    disabled={starting === user.id}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50
                             disabled:opacity-50 transition-colors"
                  >
                    {/* Avatar with status */}
                    <div className="relative flex-shrink-0">
                      {user.profile_image ? (
                        <img
                          src={user.profile_image}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-red to-red-600 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      {/* Status indicator */}
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    </div>

                    {/* User info */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{user.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          status === 'online' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>

                    {starting === user.id && (
                      <div className="animate-spin w-5 h-5 border-2 border-brand-red border-t-transparent rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NewDMModal;
