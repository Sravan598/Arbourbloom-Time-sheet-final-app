import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const AccordionContext = React.createContext();

const Accordion = ({ children, className, ...props }) => {
  const [openItems, setOpenItems] = useState([]);

  const toggle = (value) => {
    setOpenItems(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div className={cn('space-y-4', className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

const AccordionItem = ({ children, value, className, ...props }) => {
  const { openItems, toggle } = React.useContext(AccordionContext);
  const isOpen = openItems.includes(value);

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100 overflow-hidden transition-shadow duration-300',
        isOpen && 'shadow-lg',
        className
      )}
      {...props}
    >
      {React.Children.map(children, child =>
        React.cloneElement(child, { isOpen, toggle: () => toggle(value) })
      )}
    </div>
  );
};

const AccordionTrigger = ({ children, isOpen, toggle, className, ...props }) => (
  <button
    onClick={toggle}
    className={cn(
      'w-full px-6 py-4 flex items-center justify-between text-left font-semibold text-brand-dark hover:bg-gray-50 transition-colors',
      className
    )}
    {...props}
  >
    {children}
    <motion.div
      animate={{ rotate: isOpen ? 180 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <ChevronDown className="w-5 h-5 text-brand-black" />
    </motion.div>
  </button>
);

const AccordionContent = ({ children, isOpen, className, ...props }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className={cn('px-6 pb-4 text-gray-600', className)} {...props}>
          {children}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
