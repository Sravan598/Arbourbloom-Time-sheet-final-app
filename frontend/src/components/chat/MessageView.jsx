import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Hash, Lock, User, Smile, Paperclip, X, FileText, Image as ImageIcon, Download, Loader2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import EmojiPicker from './EmojiPicker';
import MessageReactions from './MessageReactions';
import chatService from '../../services/chatService';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MessageView = ({
  type,
  target,
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [target]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping?.(), 500);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size is 10MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || sending || uploading) return;

    try {
      let messageContent = newMessage.trim();
      let attachment = null;

      // Upload file if selected
      if (selectedFile) {
        setUploading(true);
        setUploadProgress(0);
        
        const uploadResult = await chatService.uploadChatFile(selectedFile, (progress) => {
          setUploadProgress(progress);
        });
        
        attachment = {
          id: uploadResult.id,
          filename: uploadResult.filename,
          file_url: uploadResult.file_url,
          content_type: uploadResult.content_type,
          size: uploadResult.size,
          is_image: uploadResult.is_image
        };
        
        // If no message text, use filename
        if (!messageContent) {
          messageContent = `📎 ${uploadResult.filename}`;
        }
        
        setUploading(false);
        clearSelectedFile();
      }

      // Send message with attachment info
      await onSendMessage(messageContent, attachment);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setUploading(false);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

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
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const groupMessagesByDate = (msgs) => {
    const groups = [];
    let currentDate = null;
    let currentGroup = [];

    msgs.forEach((msg) => {
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

  // Render attachment in message
  const renderAttachment = (attachment) => {
    if (!attachment) return null;
    
    const fileUrl = attachment.file_url?.startsWith('http') 
      ? attachment.file_url 
      : `${API_URL}${attachment.file_url}`;

    if (attachment.is_image) {
      return (
        <div className="mt-2 rounded-lg overflow-hidden max-w-[240px]">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            <img 
              src={fileUrl} 
              alt={attachment.filename}
              className="w-full h-auto max-h-[200px] object-cover hover:opacity-90 transition-opacity"
              loading="lazy"
            />
          </a>
        </div>
      );
    }

    // Document attachment
    return (
      <a 
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors max-w-[240px]"
      >
        <div className="w-10 h-10 bg-brand-black/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-brand-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{attachment.filename}</p>
          <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
        </div>
        <Download className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </a>
    );
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
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
                <p className="text-xs text-gray-500 truncate max-w-[200px]">{target.description}</p>
              )}
            </div>
          </>
        ) : (
          <>
            {target?.other_user_image ? (
              <img src={target.other_user_image} alt={target.other_user_name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-black to-gray-700 flex items-center justify-center">
                <span className="text-white text-sm font-medium">{target?.other_user_name?.charAt(0)?.toUpperCase() || '?'}</span>
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
            <div className="animate-spin w-8 h-8 border-3 border-brand-black border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              {type === 'channel' ? <Hash className="w-8 h-8 text-gray-400" /> : <User className="w-8 h-8 text-gray-400" />}
            </div>
            <p className="text-center">
              {type === 'channel' ? `This is the start of #${target?.name}` : `Start a conversation with ${target?.other_user_name}`}
            </p>
            <p className="text-sm text-gray-400 mt-1">Send a message to get started</p>
          </div>
        ) : (
          messageGroups.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-500 font-medium">{formatGroupDate(group.date)}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="space-y-3">
                {group.messages.map((msg, idx) => {
                  const isOwnMessage = msg.sender_id === currentUserId;
                  const showAvatar = idx === 0 || group.messages[idx - 1]?.sender_id !== msg.sender_id;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''} group`}
                    >
                      <div className="w-8 flex-shrink-0">
                        {showAvatar && !isOwnMessage && (
                          msg.sender_image ? (
                            <img src={msg.sender_image} alt={msg.sender_name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                              <span className="text-white text-xs font-medium">{msg.sender_name?.charAt(0)?.toUpperCase() || '?'}</span>
                            </div>
                          )
                        )}
                      </div>

                      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        {showAvatar && !isOwnMessage && (
                          <span className="text-xs text-gray-500 ml-1 mb-0.5 block">{msg.sender_name}</span>
                        )}
                        <div className="relative">
                          <div className={`px-3 py-2 rounded-2xl ${
                            isOwnMessage
                              ? 'bg-brand-black text-white rounded-tr-md'
                              : 'bg-white text-gray-900 rounded-tl-md shadow-sm border border-gray-100'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            {renderAttachment(msg.attachment)}
                          </div>
                          
                          <button
                            onClick={() => setSelectedMessageForReaction(selectedMessageForReaction === msg.id ? null : msg.id)}
                            className={`absolute -right-2 -bottom-2 p-1 bg-white rounded-full shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 ${isOwnMessage ? '-left-2 -right-auto' : ''}`}
                          >
                            <Smile className="w-3 h-3 text-gray-400" />
                          </button>
                          
                          {selectedMessageForReaction === msg.id && (
                            <div className={`absolute z-10 ${isOwnMessage ? 'right-0' : 'left-0'} -bottom-12`}>
                              <EmojiPicker onSelect={(emoji) => handleAddReaction(msg.id, emoji)} onClose={() => setSelectedMessageForReaction(null)} compact />
                            </div>
                          )}
                        </div>
                        
                        {msg.reactions && msg.reactions.length > 0 && (
                          <MessageReactions reactions={msg.reactions} onReactionClick={(emoji) => handleAddReaction(msg.id, emoji)} currentUserId={currentUserId} />
                        )}
                        
                        <span className={`text-xs text-gray-400 mt-0.5 block ${isOwnMessage ? 'text-right mr-1' : 'ml-1'}`}>
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
        
        {typingIndicator && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-gray-500">
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

      {/* File Preview */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 bg-gray-50 overflow-hidden"
          >
            <div className="p-3 flex items-center gap-3">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
              ) : (
                <div className="w-16 h-16 bg-brand-black/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-8 h-8 text-brand-black" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                {uploading && (
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-brand-black h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </div>
              <button onClick={clearSelectedFile} disabled={uploading} className="p-1 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <Smile className="w-5 h-5" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 z-10">
                <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
              </div>
            )}
          </div>
          
          {/* File attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            className="hidden"
          />
          
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={type === 'channel' ? `Message #${target?.name}` : `Message ${target?.other_user_name}`}
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-black/20 focus:bg-white transition-all"
            disabled={sending || uploading}
          />
          
          <motion.button
            type="submit"
            disabled={(!newMessage.trim() && !selectedFile) || sending || uploading}
            className="p-2 rounded-full bg-brand-black text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </motion.button>
        </div>
      </form>
    </div>
  );
};

export default MessageView;
