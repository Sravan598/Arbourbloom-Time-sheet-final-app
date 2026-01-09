import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Hash, Lock, User, Smile, Paperclip } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import EmojiPicker from './EmojiPicker';
import MessageReactions from './MessageReactions';
import chatService from '../../services/chatService';

const MessageView = ({
  type, // 'channel' or 'dm'
  target, // channel or thread object
  messages,
  currentUserId,
  onSendMessage,
  onBack,
  onTyping,
  loading,
  sending,
  typingIndicator
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [target]);

  // Handle typing indicator
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Debounce typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      onTyping?.();
    }, 500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim() && !sending) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Add emoji to message
  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Add reaction to message
  const handleAddReaction = async (messageId, emoji) => {
    try {
      await chatService.addReaction(messageId, emoji);
      setSelectedMessageForReaction(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const formatMessageTime = (dateStr) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDate = null;
    let currentGroup = [];

    messages.forEach((msg) => {
      const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = msgDate;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  const formatGroupDate = (dateStr) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        {type === 'channel' ? (
          <>
            {target?.type === 'PRIVATE' ? (
              <Lock className="w-5 h-5 text-gray-500" />
            ) : (
              <Hash className="w-5 h-5 text-gray-500" />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{target?.name}</h3>
              {target?.description && (
                <p className="text-xs text-gray-500 truncate max-w-[200px]">
                  {target.description}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            {target?.other_user_image ? (
              <img 
                src={target.other_user_image} 
                alt={target.other_user_name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-red to-red-600 flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {target?.other_user_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{target?.other_user_name}</h3>
              {target?.status && (
                <p className={`text-xs ${target.status === 'online' ? 'text-green-500' : 'text-gray-400'}`}>
                  {target.status === 'online' ? 'Online' : 'Offline'}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-3 border-brand-red border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              {type === 'channel' ? (
                <Hash className="w-8 h-8 text-gray-400" />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <p className="text-center">
              {type === 'channel' 
                ? `This is the start of #${target?.name}` 
                : `Start a conversation with ${target?.other_user_name}`}
            </p>
            <p className="text-sm text-gray-400 mt-1">Send a message to get started</p>
          </div>
        ) : (
          messageGroups.map((group, groupIdx) => (
            <div key={group.date}>
              {/* Date divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-500 font-medium">
                  {formatGroupDate(group.date)}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Messages for this date */}
              <div className="space-y-3">
                {group.messages.map((msg, idx) => {
                  const isOwnMessage = msg.sender_id === currentUserId;
                  const showAvatar = idx === 0 || 
                    group.messages[idx - 1]?.sender_id !== msg.sender_id;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''} group`}
                    >
                      {/* Avatar */}
                      <div className="w-8 flex-shrink-0">
                        {showAvatar && !isOwnMessage && (
                          msg.sender_image ? (
                            <img 
                              src={msg.sender_image} 
                              alt={msg.sender_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {msg.sender_name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )
                        )}
                      </div>

                      {/* Message bubble */}
                      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        {showAvatar && !isOwnMessage && (
                          <span className="text-xs text-gray-500 ml-1 mb-0.5 block">
                            {msg.sender_name}
                          </span>
                        )}
                        <div className="relative">
                          <div
                            className={`px-3 py-2 rounded-2xl ${
                              isOwnMessage
                                ? 'bg-brand-red text-white rounded-tr-md'
                                : 'bg-white text-gray-900 rounded-tl-md shadow-sm border border-gray-100'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          </div>
                          
                          {/* Reaction button (appears on hover) */}
                          <button
                            onClick={() => setSelectedMessageForReaction(
                              selectedMessageForReaction === msg.id ? null : msg.id
                            )}
                            className={`absolute -right-2 -bottom-2 p-1 bg-white rounded-full shadow-sm 
                                       border border-gray-200 opacity-0 group-hover:opacity-100 
                                       transition-opacity hover:bg-gray-50
                                       ${isOwnMessage ? '-left-2 -right-auto' : ''}`}
                          >
                            <Smile className="w-3 h-3 text-gray-400" />
                          </button>
                          
                          {/* Emoji picker for reactions */}
                          {selectedMessageForReaction === msg.id && (
                            <div className={`absolute z-10 ${isOwnMessage ? 'right-0' : 'left-0'} -bottom-12`}>
                              <EmojiPicker 
                                onSelect={(emoji) => handleAddReaction(msg.id, emoji)}
                                onClose={() => setSelectedMessageForReaction(null)}
                                compact
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* Reactions display */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <MessageReactions 
                            reactions={msg.reactions}
                            onReactionClick={(emoji) => handleAddReaction(msg.id, emoji)}
                            currentUserId={currentUserId}
                          />
                        )}
                        
                        <span className={`text-xs text-gray-400 mt-0.5 block ${
                          isOwnMessage ? 'text-right mr-1' : 'ml-1'
                        }`}>
                          {formatMessageTime(msg.created_at)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {typingIndicator && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-gray-500"
          >
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{typingIndicator.user_name} is typing...</span>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          {/* Emoji button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Smile className="w-5 h-5" />
            </button>
            
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 z-10">
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={type === 'channel' 
              ? `Message #${target?.name}` 
              : `Message ${target?.other_user_name}`
            }
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:bg-white
                       transition-all"
            disabled={sending}
          />
          
          <motion.button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-2 rounded-full bg-brand-red text-white disabled:opacity-50
                       disabled:cursor-not-allowed transition-opacity"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </form>
    </div>
  );
};

export default MessageView;
