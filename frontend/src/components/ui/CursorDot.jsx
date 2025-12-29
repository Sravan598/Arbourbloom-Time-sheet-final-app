import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

/**
 * CursorDot - A smooth, elegant red dot that follows the mouse cursor
 * 
 * Features:
 * - Smooth eased movement using Framer Motion springs
 * - Respects prefers-reduced-motion
 * - Hides on touch devices
 * - Hides when mouse leaves window
 * - High z-index to stay above all UI
 * - No interference with clicking (pointer-events: none)
 */
const CursorDot = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // Motion values for cursor position
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  // Spring configuration for smooth movement
  const springConfig = { damping: 25, stiffness: 300, mass: 0.5 };
  const smoothX = useSpring(cursorX, prefersReducedMotion ? { damping: 1000, stiffness: 1000 } : springConfig);
  const smoothY = useSpring(cursorY, prefersReducedMotion ? { damping: 1000, stiffness: 1000 } : springConfig);

  // Check for touch device and reduced motion preference
  useEffect(() => {
    // Check if touch device
    const checkTouchDevice = () => {
      const isTouch = 'ontouchstart' in window || 
                      navigator.maxTouchPoints > 0 || 
                      window.matchMedia('(pointer: coarse)').matches;
      setIsTouchDevice(isTouch);
    };
    
    // Check for reduced motion preference
    const checkReducedMotion = () => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      
      const handler = (e) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    };
    
    checkTouchDevice();
    const cleanup = checkReducedMotion();
    
    return cleanup;
  }, []);

  // Mouse move handler
  const handleMouseMove = useCallback((e) => {
    cursorX.set(e.clientX);
    cursorY.set(e.clientY);
    
    if (!isVisible) {
      setIsVisible(true);
    }
  }, [cursorX, cursorY, isVisible]);

  // Mouse enter/leave handlers for window
  const handleMouseEnter = useCallback(() => {
    setIsVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Visibility change handler (tab switching)
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      setIsVisible(false);
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (isTouchDevice || !isEnabled) return;

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTouchDevice, isEnabled, handleMouseMove, handleMouseEnter, handleMouseLeave, handleVisibilityChange]);

  // Don't render on touch devices or when disabled
  if (isTouchDevice || !isEnabled) {
    return null;
  }

  return (
    <motion.div
      className="cursor-dot"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '8px',
        height: '8px',
        backgroundColor: '#CC0000',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 99999,
        x: smoothX,
        y: smoothY,
        translateX: '-50%',
        translateY: '-50%',
        opacity: isVisible ? 0.9 : 0,
        boxShadow: '0 0 10px rgba(204, 0, 0, 0.5), 0 0 20px rgba(204, 0, 0, 0.3)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 0.9 : 0 }}
      transition={{ duration: 0.15 }}
    />
  );
};

export default CursorDot;
