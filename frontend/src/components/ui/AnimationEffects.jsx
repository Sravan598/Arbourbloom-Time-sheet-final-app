import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useSpring, useMotionValue, useTransform } from 'framer-motion';

/**
 * TextReveal - Animated text that reveals word by word or letter by letter
 */
const TextReveal = ({ 
  children, 
  className = '', 
  delay = 0,
  staggerDelay = 0.05,
  type = 'words', // 'words' | 'letters' | 'lines'
  animation = 'fadeUp', // 'fadeUp' | 'fadeIn' | 'slideLeft' | 'slideRight'
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  const text = typeof children === 'string' ? children : '';
  
  const getItems = () => {
    switch (type) {
      case 'letters':
        return text.split('');
      case 'lines':
        return text.split('\n');
      case 'words':
      default:
        return text.split(' ');
    }
  };

  const getAnimationVariants = () => {
    switch (animation) {
      case 'fadeIn':
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 }
        };
      case 'slideLeft':
        return {
          hidden: { opacity: 0, x: 50 },
          visible: { opacity: 1, x: 0 }
        };
      case 'slideRight':
        return {
          hidden: { opacity: 0, x: -50 },
          visible: { opacity: 1, x: 0 }
        };
      case 'fadeUp':
      default:
        return {
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 }
        };
    }
  };

  const items = getItems();
  const variants = getAnimationVariants();

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {items.map((item, index) => (
        <motion.span
          key={index}
          className="inline-block"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={variants}
          transition={{
            duration: 0.5,
            delay: delay + index * staggerDelay,
            ease: [0.25, 0.1, 0.25, 1]
          }}
        >
          {item}{type === 'words' ? '\u00A0' : ''}
        </motion.span>
      ))}
    </span>
  );
};

/**
 * TypewriterText - Text that types out character by character
 */
const TypewriterText = ({ 
  children, 
  className = '', 
  speed = 50, // ms per character
  delay = 0,
  cursor = true 
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const text = typeof children === 'string' ? children : '';

  useEffect(() => {
    if (!isInView) return;
    
    setIsTyping(true);
    let index = 0;
    
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, speed);
      
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [isInView, text, speed, delay]);

  return (
    <span ref={ref} className={className}>
      {displayText}
      {cursor && (
        <motion.span
          animate={{ opacity: isTyping ? [1, 0] : 0 }}
          transition={{ duration: 0.5, repeat: isTyping ? Infinity : 0 }}
          className="inline-block w-0.5 h-[1em] bg-brand-red ml-1 align-middle"
        />
      )}
    </span>
  );
};

/**
 * CountUp - Animated counter that counts up when in view
 */
const CountUp = ({ 
  end, 
  start = 0, 
  duration = 2, 
  delay = 0,
  prefix = '', 
  suffix = '',
  decimals = 0,
  className = '' 
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [hasStarted, setHasStarted] = useState(false);
  
  const count = useMotionValue(start);
  const rounded = useTransform(count, (value) => {
    if (decimals > 0) {
      return value.toFixed(decimals);
    }
    return Math.round(value);
  });
  
  const springConfig = { duration: duration * 1000, bounce: 0 };
  const animatedCount = useSpring(count, springConfig);
  
  const [displayValue, setDisplayValue] = useState(start);

  useEffect(() => {
    if (isInView && !hasStarted) {
      setHasStarted(true);
      setTimeout(() => {
        count.set(end);
      }, delay * 1000);
    }
  }, [isInView, hasStarted, count, end, delay]);

  useEffect(() => {
    const unsubscribe = animatedCount.on('change', (value) => {
      if (decimals > 0) {
        setDisplayValue(value.toFixed(decimals));
      } else {
        setDisplayValue(Math.round(value));
      }
    });
    return unsubscribe;
  }, [animatedCount, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}{displayValue}{suffix}
    </span>
  );
};

/**
 * MagneticButton - Button that follows cursor when nearby
 */
const MagneticButton = ({ 
  children, 
  className = '', 
  strength = 0.3,
  ...props 
}) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = (e.clientX - centerX) * strength;
    const distanceY = (e.clientY - centerY) * strength;
    
    setPosition({ x: distanceX, y: distanceY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * FloatingElement - Element that bobs up and down continuously
 */
const FloatingElement = ({ 
  children, 
  className = '',
  duration = 3,
  distance = 10,
  delay = 0,
  rotate = false,
}) => {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -distance, 0],
        rotate: rotate ? [0, 5, -5, 0] : 0,
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * SlideIn - Element that slides in from a direction when in view
 */
const SlideIn = ({ 
  children, 
  className = '',
  direction = 'up', // 'up' | 'down' | 'left' | 'right'
  delay = 0,
  duration = 0.6,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const getInitialPosition = () => {
    switch (direction) {
      case 'down': return { y: -50, opacity: 0 };
      case 'left': return { x: 50, opacity: 0 };
      case 'right': return { x: -50, opacity: 0 };
      case 'up':
      default: return { y: 50, opacity: 0 };
    }
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={getInitialPosition()}
      animate={isInView ? { x: 0, y: 0, opacity: 1 } : getInitialPosition()}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
};

/**
 * ScaleIn - Element that scales in when in view
 */
const ScaleIn = ({ 
  children, 
  className = '',
  delay = 0,
  duration = 0.5,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
};

/**
 * StaggerContainer - Container that staggers children animations
 */
const StaggerContainer = ({ 
  children, 
  className = '',
  staggerDelay = 0.1,
  delay = 0,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: staggerDelay,
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * StaggerItem - Item inside StaggerContainer
 */
const StaggerItem = ({ children, className = '' }) => {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
        }
      }}
    >
      {children}
    </motion.div>
  );
};

export { 
  TextReveal, 
  TypewriterText, 
  CountUp, 
  MagneticButton, 
  FloatingElement,
  SlideIn,
  ScaleIn,
  StaggerContainer,
  StaggerItem
};
