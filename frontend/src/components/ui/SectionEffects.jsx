import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

/**
 * SectionDivider - Smooth gradient divider between sections
 */
const SectionDivider = ({ 
  fromColor = 'white', 
  toColor = 'gray-50',
  height = 150,
  wave = false 
}) => {
  if (wave) {
    return (
      <div className="relative w-full overflow-hidden" style={{ height }}>
        <svg
          className="absolute bottom-0 w-full"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          style={{ height: '100%' }}
        >
          <motion.path
            d="M0,60 C360,120 720,0 1080,60 C1260,90 1380,30 1440,60 L1440,120 L0,120 Z"
            fill={`var(--color-${toColor}, #f9fafb)`}
            initial={{ d: "M0,60 C360,120 720,0 1080,60 C1260,90 1380,30 1440,60 L1440,120 L0,120 Z" }}
            animate={{ 
              d: [
                "M0,60 C360,120 720,0 1080,60 C1260,90 1380,30 1440,60 L1440,120 L0,120 Z",
                "M0,80 C360,20 720,100 1080,40 C1260,60 1380,80 1440,40 L1440,120 L0,120 Z",
                "M0,60 C360,120 720,0 1080,60 C1260,90 1380,30 1440,60 L1440,120 L0,120 Z"
              ]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>
    );
  }

  return (
    <div 
      className={`w-full bg-gradient-to-b from-${fromColor} to-${toColor}`}
      style={{ height }}
    />
  );
};

/**
 * ParallaxImage - Image with parallax scroll effect
 */
const ParallaxImage = ({ src, alt, className = '', speed = 0.5 }) => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 100}%`]);

  return (
    <motion.div className={`overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        style={{ y }}
      />
    </motion.div>
  );
};

/**
 * RevealOnScroll - Reveals content with a wipe effect on scroll
 */
const RevealOnScroll = ({ children, className = '', direction = 'up' }) => {
  const { scrollYProgress } = useScroll();
  
  const clipPath = useTransform(scrollYProgress, [0, 0.5], [
    direction === 'up' ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)',
    'inset(0 0 0 0)'
  ]);

  return (
    <motion.div className={className} style={{ clipPath }}>
      {children}
    </motion.div>
  );
};

/**
 * GlowingBorder - Card with animated glowing border
 */
const GlowingBorder = ({ children, className = '', color = '#CC0000' }) => {
  return (
    <div className={`relative ${className}`}>
      <motion.div
        className="absolute -inset-0.5 rounded-3xl opacity-75 blur-sm"
        style={{ background: `linear-gradient(90deg, ${color}, transparent, ${color})` }}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
      <div className="relative bg-white rounded-3xl">
        {children}
      </div>
    </div>
  );
};

/**
 * AnimatedGradientBackground - Animated gradient that shifts colors
 */
const AnimatedGradientBackground = ({ className = '', children }) => {
  return (
    <motion.div
      className={`relative ${className}`}
      animate={{
        background: [
          'linear-gradient(135deg, #f9fafb 0%, #ffffff 50%, #f3f4f6 100%)',
          'linear-gradient(135deg, #ffffff 0%, #f9fafb 50%, #ffffff 100%)',
          'linear-gradient(135deg, #f3f4f6 0%, #ffffff 50%, #f9fafb 100%)',
          'linear-gradient(135deg, #f9fafb 0%, #ffffff 50%, #f3f4f6 100%)',
        ]
      }}
      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
    >
      {children}
    </motion.div>
  );
};

/**
 * PulsingDot - A dot that pulses to draw attention
 */
const PulsingDot = ({ className = '', color = '#CC0000', size = 12 }) => {
  return (
    <span className={`relative inline-flex ${className}`}>
      <span
        className="absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
      >
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </span>
      <span
        className="relative inline-flex rounded-full"
        style={{ backgroundColor: color, width: size, height: size }}
      />
    </span>
  );
};

export { 
  SectionDivider, 
  ParallaxImage, 
  RevealOnScroll, 
  GlowingBorder,
  AnimatedGradientBackground,
  PulsingDot
};
