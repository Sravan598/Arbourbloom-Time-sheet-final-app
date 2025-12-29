import React from 'react';
import { cn } from '../../lib/utils';

const Badge = ({ children, variant = 'default', className, ...props }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-brand-red/10 text-brand-red',
    success: 'bg-green-100 text-green-800',
    popular: 'bg-gradient-to-r from-brand-red to-brand-red-dark text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export { Badge };
