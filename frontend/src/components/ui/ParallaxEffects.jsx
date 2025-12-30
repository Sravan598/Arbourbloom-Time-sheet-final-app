import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

/**
 * FloatingParticles - Animated floating particles in the background
 * Creates a premium, dynamic feel
 */
const FloatingParticles = ({ count = 20, color = '#CC0000' }) => {
  const [particles, setParticles] = useState([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Generate random particles
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.3 + 0.1,
    }));
    setParticles(newParticles);
  }, [count]);

  if (prefersReducedMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: color,
            opacity: particle.opacity,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

/**
 * ScrollProgress - Red progress bar at top of page
 */
const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-red to-brand-red-dark origin-left z-[100]"
      style={{ scaleX: scrollYProgress }}
    />
  );
};

/**
 * ParallaxSection - Wrapper that adds parallax effect to children
 */
const ParallaxSection = ({ children, speed = 0.5, className = '' }) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 1000 * speed]);

  return (
    <motion.div className={className} style={{ y }}>
      {children}
    </motion.div>
  );
};

/**
 * ParallaxBackground - Background elements that move at different speeds
 */
const ParallaxBackground = () => {
  const { scrollY } = useScroll();
  
  // Different speeds for different elements
  const y1 = useTransform(scrollY, [0, 3000], [0, -300]);
  const y2 = useTransform(scrollY, [0, 3000], [0, -500]);
  const y3 = useTransform(scrollY, [0, 3000], [0, -200]);
  const rotate1 = useTransform(scrollY, [0, 3000], [0, 45]);
  const rotate2 = useTransform(scrollY, [0, 3000], [0, -30]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Large blob - slow */}
      <motion.div
        className="absolute -top-40 -right-40 w-96 h-96 bg-brand-red/5 rounded-full blur-3xl"
        style={{ y: y1, rotate: rotate1 }}
      />
      
      {/* Medium blob - medium speed */}
      <motion.div
        className="absolute top-1/3 -left-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl"
        style={{ y: y2 }}
      />
      
      {/* Small blob - faster */}
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-brand-red/8 rounded-full blur-2xl"
        style={{ y: y3, rotate: rotate2 }}
      />

      {/* Decorative shapes */}
      <motion.div
        className="absolute top-1/2 left-10 w-4 h-4 bg-brand-red/20 rounded-full"
        style={{ y: y2 }}
      />
      <motion.div
        className="absolute top-1/4 right-20 w-3 h-3 bg-brand-red/30 rounded-full"
        style={{ y: y1 }}
      />
      <motion.div
        className="absolute bottom-1/3 left-1/4 w-2 h-2 bg-brand-red/25 rounded-full"
        style={{ y: y3 }}
      />
    </div>
  );
};

export { FloatingParticles, ScrollProgress, ParallaxSection, ParallaxBackground };
