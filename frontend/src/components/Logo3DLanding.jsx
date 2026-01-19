import React from 'react';
import { motion } from 'framer-motion';

const Logo3DLanding = ({ size = 320, className = '' }) => {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer glow ring 3 - largest, faintest */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 1.4,
          height: size * 1.4,
          background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Outer glow ring 2 - medium */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 1.1,
          height: size * 1.1,
          background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />

      {/* Inner glow ring 1 - closest, brightest */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.85,
          height: size * 0.85,
          background: 'radial-gradient(circle, rgba(212,175,55,0.35) 0%, transparent 60%)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.2,
        }}
      />

      {/* Soft blur glow behind logo */}
      <motion.div
        className="absolute"
        style={{
          width: size * 0.7,
          height: size * 0.7,
          background: 'radial-gradient(circle, rgba(212,175,55,0.4) 0%, transparent 50%)',
          filter: 'blur(20px)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Logo container with morphing bloom effect */}
      <motion.div
        className="relative z-10"
        animate={{
          scale: [1, 1.06, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Logo shadow for depth */}
        <motion.div
          className="absolute inset-0"
          style={{
            filter: 'blur(15px)',
            opacity: 0.3,
          }}
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <img
            src="/aurborbloom_logo_transparent.png"
            alt=""
            className="w-full h-full object-contain"
          />
        </motion.div>

        {/* Main logo image */}
        <img
          src="/aurborbloom_logo_transparent.png"
          alt="AurborBloom"
          className="relative z-10 object-contain"
          style={{
            width: size * 0.7,
            height: size * 0.7,
            filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.1))',
          }}
        />
      </motion.div>

      {/* Sparkle particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 bg-brand-accent rounded-full"
          style={{
            left: `${50 + Math.cos((i * 60 * Math.PI) / 180) * 42}%`,
            top: `${50 + Math.sin((i * 60 * Math.PI) / 180) * 42}%`,
          }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        />
      ))}
    </div>
  );
};

export default Logo3DLanding;
