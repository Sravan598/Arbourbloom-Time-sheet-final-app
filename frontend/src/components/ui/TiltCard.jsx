import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * TiltCard - A 3D card that tilts based on mouse position
 * 
 * Features:
 * - Smooth 3D tilt effect on hover
 * - Glare/shine effect following mouse
 * - Shadow shift for depth
 * - Respects prefers-reduced-motion
 */
const TiltCard = ({ 
  children, 
  className = '', 
  tiltAmount = 10,      // Max tilt in degrees
  glareOpacity = 0.15,  // Glare intensity (0-1)
  scale = 1.02,         // Scale on hover
  shadow = true,        // Enable shadow shift
  glare = true,         // Enable glare effect
  ...props 
}) => {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const handleMouseMove = (e) => {
    if (prefersReducedMotion || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate mouse position relative to card center (-1 to 1)
    const mouseX = (e.clientX - centerX) / (rect.width / 2);
    const mouseY = (e.clientY - centerY) / (rect.height / 2);
    
    // Set tilt (inverted for natural feel)
    setTilt({
      x: -mouseY * tiltAmount,  // Tilt on X axis based on Y position
      y: mouseX * tiltAmount    // Tilt on Y axis based on X position
    });

    // Set glare position (percentage)
    setGlarePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
    setGlarePosition({ x: 50, y: 50 });
  };

  // Calculate dynamic shadow based on tilt
  const shadowX = -tilt.y * 2;
  const shadowY = tilt.x * 2;

  return (
    <motion.div
      ref={cardRef}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: tilt.x,
        rotateY: tilt.y,
        scale: isHovered ? scale : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
        mass: 0.5
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        boxShadow: shadow && isHovered 
          ? `${shadowX}px ${shadowY + 20}px 40px rgba(0, 0, 0, 0.15)`
          : '0 10px 30px rgba(0, 0, 0, 0.1)',
      }}
      {...props}
    >
      {/* Card Content */}
      <div style={{ transform: 'translateZ(0)' }}>
        {children}
      </div>

      {/* Glare Effect */}
      {glare && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: `radial-gradient(
              circle at ${glarePosition.x}% ${glarePosition.y}%,
              rgba(255, 255, 255, ${glareOpacity}) 0%,
              rgba(255, 255, 255, 0) 60%
            )`,
          }}
        />
      )}
    </motion.div>
  );
};

export default TiltCard;
