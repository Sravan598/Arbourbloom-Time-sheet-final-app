import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const Button = React.forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  disabled,
  ...props 
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-gradient-to-r from-brand-black to-brand-black-dark text-white hover:shadow-lg hover:shadow-brand-black/30 focus:ring-brand-black',
    secondary: 'bg-white text-brand-dark border-2 border-brand-dark hover:bg-brand-dark hover:text-white focus:ring-brand-dark',
    outline: 'bg-transparent text-brand-black border-2 border-brand-black hover:bg-brand-black hover:text-white focus:ring-brand-black',
    ghost: 'bg-transparent text-brand-dark hover:bg-gray-100 focus:ring-gray-300',
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(baseStyles, variants[variant], sizes[size], disabled && 'opacity-50 cursor-not-allowed', className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
});

Button.displayName = 'Button';

export { Button };
