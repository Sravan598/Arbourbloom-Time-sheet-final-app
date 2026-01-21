import React, { useState, useEffect, useCallback } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

/**
 * CursorSpotlight - A subtle spotlight/flashlight effect that follows the cursor
 * 
 * Features:
 * - Soft radial glow around cursor position
 * - Smooth eased movement using Framer Motion springs
 * - Respects prefers-reduced-motion
 * - Hides on touch devices
 * - Hides when mouse leaves window
 * - No interference with clicking (pointer-events: none)
 */
const CursorSpotlight = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // Motion values for cursor position
  const cursorX = useMotionValue(-200);
  const cursorY = useMotionValue(-200);
  
  // Spring configuration for smooth movement
  const springConfig = { damping: 30, stiffness: 200, mass: 0.8 };
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
    <>
      {/* Spotlight glow effect */}
      <motion.div
        className="cursor-spotlight"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '300px',
          height: '300px',
          background: `radial-gradient(
            circle at center,
            rgba(212, 175, 55, 0.15) 0%,
            rgba(212, 175, 55, 0.08) 30%,
            rgba(212, 175, 55, 0.03) 50%,
            transparent 70%
          )`,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99998,
          x: smoothX,
          y: smoothY,
          translateX: '-50%',
          translateY: '-50%',
          opacity: isVisible ? 1 : 0,
        }}
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      />
    </>
  );
};

export default CursorSpotlight;
