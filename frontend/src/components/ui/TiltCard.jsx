import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * TiltCard - A 3D tilt effect card component
 * 
 * Features:
 * - 3D perspective tilt on mouse move
 * - Glare effect overlay
 * - Scale on hover
 * - Smooth spring animations
 * - Respects prefers-reduced-motion
 */
const TiltCard = ({ 
  children, 
  className = '', 
  tiltAmount = 10,
  glareOpacity = 0.15,
  scale = 1.02
}) => {
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;
  
  // Motion values for tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Spring config for smooth movement
  const springConfig = { stiffness: 300, damping: 30 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [tiltAmount, -tiltAmount]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-tiltAmount, tiltAmount]), springConfig);
  
  // Glare position
  const glareX = useSpring(useTransform(x, [-0.5, 0.5], [0, 100]), springConfig);
  const glareY = useSpring(useTransform(y, [-0.5, 0.5], [0, 100]), springConfig);
  
  const handleMouseMove = (e) => {
    if (prefersReducedMotion || !cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const normalizedX = (e.clientX - centerX) / (rect.width / 2);
    const normalizedY = (e.clientY - centerY) / (rect.height / 2);
    
    x.set(normalizedX * 0.5);
    y.set(normalizedY * 0.5);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };
  
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  
  if (prefersReducedMotion) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }
  
  return (
    <motion.div
      ref={cardRef}
      className={`relative ${className}`}
      style={{
        rotateX: rotateX,
        rotateY: rotateY,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      animate={{ scale: isHovered ? scale : 1 }}
      transition={{ duration: 0.2 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      {children}
      
      {/* Glare overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
        style={{
          opacity: isHovered ? glareOpacity : 0,
          background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.4) 0%, transparent 50%)`,
        }}
        transition={{ duration: 0.2 }}
      />
    </motion.div>
  );
};

export default TiltCard;
