import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Bot, X, Minus, Send } from 'lucide-react';
import { findAnswer } from './faqData';

// CORtracker logo URL
const CORTRACKER_LOGO = "https://customer-assets.emergentagent.com/job_readable-link/artifacts/ufwwws2h_image.png";

// Storage key for position persistence
const POSITION_STORAGE_KEY = 'corbot_position';

const CORBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: "Hi! 👋 I'm CORBot, your CORtracker assistant. Ask me anything about the app - time tracking, timesheets, projects, documents, CORChat, and more!"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const constraintsRef = useRef(null);

  // Load saved position from localStorage
  const getSavedPosition = () => {
    try {
      const saved = localStorage.getItem(POSITION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore
    }
    return null;
  };

  const [savedPosition, setSavedPosition] = useState(getSavedPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragControls = useDragControls();
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

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

  // Get default position (bottom-left)
  const getDefaultPosition = (isButton = false) => {
    const size = isButton ? 56 : 360;
    const height = isButton ? 56 : (isMinimized ? 56 : 500);
    return {
      left: 24,
      top: typeof window !== 'undefined' ? window.innerHeight - height - 24 : 300
    };
  };

  // Get current position (saved or default)
  const getPosition = (isButton = false) => {
    if (savedPosition) {
      return { left: savedPosition.x, top: savedPosition.y };
    }
    return getDefaultPosition(isButton);
  };

  // Handle drag end - save position
  const handleDragEnd = () => {
    setIsDragging(false);
    
    const element = isOpen ? panelRef.current : buttonRef.current;
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const isButton = !isOpen;
    const width = isButton ? 56 : 360;
    const height = isButton ? 56 : (isMinimized ? 56 : 500);
    const padding = 10;
    
    // Clamp to viewport
    const maxX = window.innerWidth - width - padding;
    const maxY = window.innerHeight - height - padding;
    
    const x = Math.max(padding, Math.min(rect.left, maxX));
    const y = Math.max(padding, Math.min(rect.top, maxY));
    
    const newPos = { x, y };
    setSavedPosition(newPos);
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(newPos));
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (savedPosition) {
        const width = isOpen ? 360 : 56;
        const height = isOpen ? (isMinimized ? 56 : 500) : 56;
        const padding = 10;
        const maxX = window.innerWidth - width - padding;
        const maxY = window.innerHeight - height - padding;
        
        const newX = Math.max(padding, Math.min(savedPosition.x, maxX));
        const newY = Math.max(padding, Math.min(savedPosition.y, maxY));
        
        if (newX !== savedPosition.x || newY !== savedPosition.y) {
          const newPos = { x: newX, y: newY };
          setSavedPosition(newPos);
          localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(newPos));
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [savedPosition, isOpen, isMinimized]);

  // Handle sending message
  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setIsTyping(true);
    
    setTimeout(() => {
      const response = findAnswer(userMessage);
      setMessages(prev => [...prev, { type: 'bot', text: response.answer }]);
      setIsTyping(false);
    }, 500 + Math.random() * 500);
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick questions
  const quickQuestions = [
    'What is CORtracker?',
    'How do I track time?',
    'How does CORChat work?',
    'What can admins do?'
  ];

  const handleQuickQuestion = (question) => {
    setMessages(prev => [...prev, { type: 'user', text: question }]);
    setIsTyping(true);
    setTimeout(() => {
      const response = findAnswer(question);
      setMessages(prev => [...prev, { type: 'bot', text: response.answer }]);
      setIsTyping(false);
    }, 500);
  };

  const buttonPosition = getPosition(true);
  const panelPosition = getPosition(false);

  return (
    <>
      {/* Drag constraints */}
      <div 
        ref={constraintsRef} 
        className="fixed inset-0 pointer-events-none z-40"
        style={{ margin: 10 }}
      />

      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            ref={buttonRef}
            data-testid="corbot-trigger-button"
            drag
            dragConstraints={constraintsRef}
            dragElastic={0}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, scale: 0, left: buttonPosition.left, top: buttonPosition.top }}
            animate={{ opacity: 1, scale: 1, left: buttonPosition.left, top: buttonPosition.top }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: isDragging ? 1 : 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => !isDragging && setIsOpen(true)}
            className={`fixed z-50 w-14 h-14 rounded-full shadow-lg
                       bg-gradient-to-r from-brand-red to-red-600 hover:from-red-600 hover:to-red-700
                       flex items-center justify-center transition-colors group
                       ${isDragging ? 'cursor-grabbing shadow-2xl ring-2 ring-brand-red/30' : 'cursor-grab'}`}
          >
            <Bot className="w-6 h-6 text-white pointer-events-none" />
            {!isDragging && (
              <span className="absolute inset-0 rounded-full bg-brand-red animate-ping opacity-25" />
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
            dragConstraints={constraintsRef}
            dragElastic={0}
            dragMomentum={false}
            dragListener={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, scale: 0.95, left: panelPosition.left, top: panelPosition.top }}
            animate={{ 
              opacity: 1, 
              scale: isDragging ? 1.02 : 1,
              left: panelPosition.left, 
              top: panelPosition.top,
              height: isMinimized ? 'auto' : 500
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed w-[360px] bg-white rounded-2xl overflow-hidden border border-gray-200 z-50
                       flex flex-col transition-shadow duration-200
                       ${isDragging ? 'shadow-2xl ring-2 ring-brand-red/20' : 'shadow-xl'}`}
          >
            {/* Header - Drag Handle */}
            <div
              onPointerDown={(e) => {
                if (!e.target.closest('button')) {
                  dragControls.start(e);
                }
              }}
              data-testid="corbot-drag-handle"
              className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-red to-red-600
                         select-none transition-all
                         ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
              <div className="flex items-center gap-2 pointer-events-none">
                <div className="bg-white/95 rounded px-1.5 py-0.5 flex items-center">
                  <img 
                    src={CORTRACKER_LOGO} 
                    alt="CORtracker" 
                    className="h-4 w-auto"
                  />
                </div>
                <h2 className="font-semibold text-white text-lg">CORBot</h2>
                <span className="text-xs text-white/70 bg-white/20 px-2 py-0.5 rounded-full">FAQ</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors pointer-events-auto"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                  data-testid="corbot-minimize-button"
                >
                  <Minus className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsMinimized(false);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors pointer-events-auto"
                  title="Close"
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
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-red to-red-600 
                                        flex items-center justify-center mr-2 flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                            msg.type === 'user'
                              ? 'bg-brand-red text-white rounded-tr-md'
                              : 'bg-white text-gray-800 rounded-tl-md shadow-sm border border-gray-100'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Typing indicator */}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-red to-red-600 
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
                            className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-brand-red/10 
                                     text-gray-600 hover:text-brand-red rounded-full transition-colors"
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
                                   focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:bg-white
                                   transition-all"
                      />
                      <motion.button
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 rounded-full bg-brand-red text-white disabled:opacity-50
                                   disabled:cursor-not-allowed transition-opacity"
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

export default CORBot;
