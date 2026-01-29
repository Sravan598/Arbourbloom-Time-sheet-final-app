import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useTenant } from '../../context/TenantContext';

/**
 * A button that uses the tenant's primary color for branding
 */
const TenantButton = React.forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  disabled,
  ...props 
}, ref) => {
  const { tenant } = useTenant();
  const primaryColor = tenant?.primary_color || '#1a1a1a';
  
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  // Dynamic styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: primaryColor,
          color: '#ffffff',
        };
      case 'secondary':
        return {
          backgroundColor: '#ffffff',
          color: primaryColor,
          border: `2px solid ${primaryColor}`,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: primaryColor,
          border: `2px solid ${primaryColor}`,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: primaryColor,
        };
      default:
        return {
          backgroundColor: primaryColor,
          color: '#ffffff',
        };
    }
  };

  const hoverStyles = {
    primary: { boxShadow: `0 10px 25px ${primaryColor}30` },
    secondary: { backgroundColor: primaryColor, color: '#ffffff' },
    outline: { backgroundColor: primaryColor, color: '#ffffff' },
    ghost: { backgroundColor: `${primaryColor}10` },
  };

  return (
    <motion.button
      ref={ref}
      whileHover={disabled ? {} : { scale: 1.02, ...hoverStyles[variant] }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      style={getVariantStyles()}
      className={cn(baseStyles, sizes[size], disabled && 'opacity-50 cursor-not-allowed', className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
});

TenantButton.displayName = 'TenantButton';

export { TenantButton };
