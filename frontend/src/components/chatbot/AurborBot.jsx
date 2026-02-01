import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Bot, X, Minus, Send, Sparkles, RefreshCw } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Storage key for position persistence
const POSITION_STORAGE_KEY = 'corbot_position';

const AurborBot = () => {
  const { tenant, getTenantName } = useTenant();
  const { token, isAuthenticated } = useAuth();
  
  // Get tenant-specific bot name
  const getBotName = () => {
    if (!tenant || tenant.slug === 'aurborbloom') return 'AurborBot';
    return `${tenant.name || 'Your'} Assistant`;
  };
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [useAI, setUseAI] = useState(true); // Toggle between AI and FAQ mode
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const dragControls = useDragControls();
  const prevTenantSlug = useRef(null);
  
  // Initialize/update welcome message when tenant changes
  useEffect(() => {
    // Only update if tenant actually changed or first load
    if (tenant && tenant.slug !== prevTenantSlug.current) {
      prevTenantSlug.current = tenant.slug;
      const botName = getBotName();
      const aiIndicator = useAI && isAuthenticated ? ' I\'m powered by AI and can answer complex questions!' : '';
      setMessages([{
        type: 'bot',
        text: `Hi! 👋 I'm ${botName}, your HR assistant.${aiIndicator} Ask me anything about time tracking, timesheets, leave requests, support tickets, and more!`
      }]);
      setSessionId(null); // Reset session on tenant change
    }
  }, [tenant?.slug, isAuthenticated]);
  
  // Track if user has dragged (to show at saved position)
  const [isDragging, setIsDragging] = useState(false);
  // Use ref to track drag state to avoid closure issues
  const isDraggingRef = useRef(false);
  
  // Load initial position from localStorage
  const [initialPosition] = useState(() => {
    try {
      const saved = localStorage.getItem(POSITION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return { x: parsed.x, y: parsed.y };
        }
      }
    } catch {
      // Ignore
    }
    return null;
  });

  // Refs for tracking position
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Get element size
  const getSize = (forButton = false) => {
    if (forButton) return { width: 56, height: 56 };
    return { width: 360, height: isMinimized ? 56 : 500 };
  };

  // Save position to localStorage
  const savePosition = (element) => {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const { width, height } = getSize(!isOpen);
    const padding = 10;
    
    // Clamp to viewport
    const maxX = window.innerWidth - width - padding;
    const maxY = window.innerHeight - height - padding;
    
    const x = Math.max(padding, Math.min(rect.left, maxX));
    const y = Math.max(padding, Math.min(rect.top, maxY));
    
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ x, y }));
  };

  // Handle drag start
  const handleDragStart = () => {
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  // Handle drag end
  const handleDragEnd = () => {
    // Use setTimeout to ensure the drag state persists long enough
    // to prevent accidental click triggers
    setTimeout(() => {
      isDraggingRef.current = false;
      setIsDragging(false);
    }, 100);
    const el = isOpen ? panelRef.current : buttonRef.current;
    savePosition(el);
  };

  // Get base position style
  const getBaseStyle = () => {
    if (initialPosition) {
      return { left: initialPosition.x, top: initialPosition.y };
    }
    // Default: bottom-left
    return { left: 24, bottom: 24 };
  };

  // Message handlers - AI-powered
  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setIsTyping(true);
    
    // Use AI if authenticated, otherwise fall back to FAQ
    if (useAI && isAuthenticated && token) {
      try {
        const response = await axios.post(
          `${API}/api/chatbot/message`,
          { message: userMessage, session_id: sessionId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setMessages(prev => [...prev, { type: 'bot', text: response.data.response, isAI: true }]);
        setSessionId(response.data.session_id);
      } catch (err) {
        console.error('AI chatbot error:', err);
        // Fallback to FAQ on error
        const { findAnswer } = await import('./faqData');
        const faqResponse = findAnswer(userMessage);
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: faqResponse.answer + '\n\n_(AI temporarily unavailable, showing FAQ response)_',
          isAI: false 
        }]);
      }
    } else {
      // FAQ fallback for unauthenticated users
      const { findAnswer } = await import('./faqData');
      const faqResponse = findAnswer(userMessage);
      setMessages(prev => [...prev, { type: 'bot', text: faqResponse.answer, isAI: false }]);
    }
    
    setIsTyping(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    'How do I track time?',
    'How do I request leave?',
    'What\'s my PTO balance?',
    'Help me submit a ticket'
  ];

  const handleQuickQuestion = async (question) => {
    setMessages(prev => [...prev, { type: 'user', text: question }]);
    setIsTyping(true);
    
    if (useAI && isAuthenticated && token) {
      try {
        const response = await axios.post(
          `${API}/api/chatbot/message`,
          { message: question, session_id: sessionId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(prev => [...prev, { type: 'bot', text: response.data.response, isAI: true }]);
        setSessionId(response.data.session_id);
      } catch (err) {
        const { findAnswer } = await import('./faqData');
        const faqResponse = findAnswer(question);
        setMessages(prev => [...prev, { type: 'bot', text: faqResponse.answer, isAI: false }]);
      }
    } else {
      const { findAnswer } = await import('./faqData');
      const faqResponse = findAnswer(question);
      setMessages(prev => [...prev, { type: 'bot', text: faqResponse.answer, isAI: false }]);
    }
    
    setIsTyping(false);
  };
  
  // Start new conversation
  const handleNewChat = () => {
    setSessionId(null);
    const botName = getBotName();
    setMessages([{
      type: 'bot',
      text: `Hi! 👋 I'm ${botName}, your HR assistant. How can I help you today?`
    }]);
  };
  
  // Get tenant-specific colors
  const primaryColor = tenant?.primary_color || '#1a1a1a';

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            ref={buttonRef}
            data-testid="corbot-trigger-button"
            drag
            dragElastic={0.1}
            dragMomentum={false}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: isDragging ? 1 : 1.05 }}
            whileTap={{ scale: isDragging ? 1 : 0.95 }}
            onClick={() => {
              // Use ref for immediate check to avoid stale closure
              if (!isDraggingRef.current) setIsOpen(true);
            }}
            style={{
              ...getBaseStyle(),
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)`
            }}
            className={`fixed z-50 w-14 h-14 rounded-full shadow-lg
                       flex items-center justify-center group
                       ${isDragging ? 'cursor-grabbing shadow-2xl ring-2 ring-opacity-30' : 'cursor-grab'}`}
          >
            <Bot className="w-6 h-6 text-white pointer-events-none" />
            {!isDragging && (
              <span 
                className="absolute inset-0 rounded-full animate-ping opacity-25" 
                style={{ backgroundColor: primaryColor }}
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            data-testid="corbot-chat-panel"
            drag
            dragControls={dragControls}
            dragElastic={0.1}
            dragMomentum={false}
            dragListener={false}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: isDragging ? 1.02 : 1,
              height: isMinimized ? 'auto' : 500
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={getBaseStyle()}
            className={`fixed w-[360px] bg-white rounded-2xl overflow-hidden border border-gray-200 z-50
                       flex flex-col shadow-xl
                       ${isDragging ? 'shadow-2xl ring-2 ring-opacity-20' : ''}`}
          >
            {/* Header - Drag Handle */}
            <div
              onPointerDown={(e) => {
                if (!e.target.closest('button')) {
                  dragControls.start(e);
                }
              }}
              data-testid="corbot-drag-handle"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)` }}
              className={`flex items-center justify-between px-4 py-3
                         select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
              <div className="flex items-center gap-2 pointer-events-none">
                {tenant?.logo_url ? (
                  <div className="bg-white/95 rounded px-1.5 py-0.5 flex items-center">
                    <img src={tenant.logo_url} alt={getTenantName()} className="h-4 w-auto object-contain" />
                  </div>
                ) : (
                  <div 
                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: primaryColor }}
                  >
                    {getTenantName().charAt(0)}
                  </div>
                )}
                <h2 className="font-semibold text-white text-lg">{getBotName()}</h2>
                <span className="text-xs text-white/70 bg-white/20 px-2 py-0.5 rounded-full">FAQ</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors pointer-events-auto"
                  data-testid="corbot-minimize-button"
                >
                  <Minus className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => { setIsOpen(false); setIsMinimized(false); }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors pointer-events-auto"
                  data-testid="corbot-close-button"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Body */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex flex-col flex-1 overflow-hidden"
                >
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" style={{ maxHeight: 320 }}>
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.type === 'bot' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-black to-gray-700 
                                        flex items-center justify-center mr-2 flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                          msg.type === 'user'
                            ? 'bg-brand-black text-white rounded-tr-md'
                            : 'bg-white text-gray-800 rounded-tl-md shadow-sm border border-gray-100'
                        }`}>
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                    
                    {isTyping && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-black to-gray-700 
                                      flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white px-4 py-2 rounded-2xl rounded-tl-md shadow-sm border border-gray-100">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Questions */}
                  {messages.length <= 2 && (
                    <div className="px-3 py-2 border-t border-gray-100 bg-white">
                      <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {quickQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuickQuestion(q)}
                            className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-brand-black/10 
                                     text-gray-600 hover:text-brand-black rounded-full transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <div className="p-3 border-t border-gray-200 bg-white">
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything..."
                        className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm
                                   focus:outline-none focus:ring-2 focus:ring-brand-black/20 focus:bg-white transition-all"
                      />
                      <motion.button
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 rounded-full bg-brand-black text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AurborBot;
