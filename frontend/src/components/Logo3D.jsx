import React, { useState, useRef } from 'react';

const Logo3D = ({ size = 120, className = '' }) => {
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate rotation based on mouse position relative to center
    const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 15; // Max 15 degrees
    const rotateX = ((centerY - e.clientY) / (rect.height / 2)) * 15; // Max 15 degrees
    
    setTransform({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    // Smoothly return to original position
    setTransform({ rotateX: 0, rotateY: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative cursor-pointer ${className}`}
      style={{
        perspective: '1000px',
        width: size,
        height: size,
      }}
    >
      {/* Shadow layer */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-xl"
        style={{
          background: 'radial-gradient(circle, rgba(0,0,0,0.3) 0%, transparent 70%)',
          transform: `translateY(${10 + transform.rotateX * 0.5}px) scale(0.9)`,
          transition: 'transform 0.15s ease-out',
        }}
      />
      
      {/* Logo container with 3D transform */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        {/* Glow effect behind logo */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 60%)',
            transform: 'translateZ(-10px)',
          }}
        />
        
        {/* Main logo image */}
        <img
          src="/aurborbloom_icon_only.png"
          alt="AurborBloom"
          className="w-full h-full object-contain"
          style={{
            transform: 'translateZ(20px)',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
          }}
        />
        
        {/* Subtle shine overlay */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `linear-gradient(
              ${135 + transform.rotateY * 2}deg, 
              rgba(255,255,255,0.1) 0%, 
              transparent 50%
            )`,
            transform: 'translateZ(25px)',
          }}
        />
      </div>
    </div>
  );
};

export default Logo3D;
