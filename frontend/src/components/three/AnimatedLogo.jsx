import React, { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const AnimatedLogo = () => {
  const containerRef = useRef(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), { stiffness: 100, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), { stiffness: 100, damping: 30 });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current || prefersReducedMotion) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, prefersReducedMotion]);

  return (
    <div ref={containerRef} className="relative w-full h-[500px] md:h-[600px] flex items-center justify-center perspective-1000">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={prefersReducedMotion ? {} : { 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-red/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={prefersReducedMotion ? {} : { 
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gray-400/20 rounded-full blur-3xl"
        />
      </div>

      {/* Main 3D Card Container */}
      <motion.div
        style={prefersReducedMotion ? {} : { rotateX, rotateY }}
        className="relative z-10"
      >
        {/* Floating animation wrapper */}
        <motion.div
          animate={prefersReducedMotion ? {} : { y: [0, -15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Glass Card */}
          <div className="relative p-8 md:p-12 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            {/* Orbit ring */}
            <motion.div
              animate={prefersReducedMotion ? {} : { rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="absolute inset-[-30px] border-2 border-gray-300/30 rounded-full" />
              <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 w-3 h-3 bg-brand-red rounded-full shadow-lg shadow-brand-red/50" />
            </motion.div>

            {/* Logo Image */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative"
            >
              <img 
                src="https://customer-assets.emergentagent.com/job_readable-link/artifacts/ufwwws2h_image.png" 
                alt="CORtracker - A 360° ERP Solutions"
                className="w-64 md:w-80 h-auto drop-shadow-2xl"
              />
              
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-brand-red/20 to-transparent blur-2xl -z-10" />
            </motion.div>

            {/* Lightning bolt accent */}
            <motion.div
              animate={prefersReducedMotion ? {} : { 
                opacity: [0.5, 1, 0.5],
                scale: [0.95, 1.05, 0.95]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-4 top-1/2 -translate-y-1/2"
            >
              <svg width="40" height="60" viewBox="0 0 40 60" fill="none" className="drop-shadow-lg">
                <path 
                  d="M20 0L0 30H15L10 60L40 25H22L30 0H20Z" 
                  fill="url(#lightning-gradient)"
                />
                <defs>
                  <linearGradient id="lightning-gradient" x1="0" y1="0" x2="40" y2="60">
                    <stop offset="0%" stopColor="#C0C0C0" />
                    <stop offset="100%" stopColor="#888888" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>

            {/* Sparkle effects */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={prefersReducedMotion ? {} : {
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
                className="absolute w-2 h-2 bg-brand-red rounded-full"
                style={{
                  top: `${20 + (i * 10)}%`,
                  left: `${10 + (i * 13)}%`,
                }}
              />
            ))}
          </div>

          {/* Shadow */}
          <motion.div
            animate={prefersReducedMotion ? {} : { 
              scaleX: [1, 0.9, 1],
              opacity: [0.3, 0.2, 0.3]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-black/20 rounded-full blur-xl"
          />
        </motion.div>
      </motion.div>

      {/* Floating particles */}
      {!prefersReducedMotion && [...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut"
          }}
          className="absolute w-1 h-1 bg-brand-red/60 rounded-full"
          style={{
            top: `${15 + i * 10}%`,
            left: `${10 + i * 10}%`,
          }}
        />
      ))}
    </div>
  );
};

export default AnimatedLogo;
