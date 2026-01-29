import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';

// Tutorial steps for employees
const TUTORIAL_STEPS = [
  {
    target: '[data-tour="clock-widget"]',
    title: 'Clock In/Out',
    description: 'Start your workday by clicking "Clock In". When you\'re done, click "Clock Out" to record your hours.',
    position: 'right'
  },
  {
    target: '[data-tour="break-timer"]',
    title: 'Break Timer',
    description: 'Take breaks during your shift. Choose your break type (General, Lunch, Coffee) and track your break time.',
    position: 'right'
  },
  {
    target: '[data-tour="sidebar-timesheet"]',
    title: 'View Timesheets',
    description: 'Check your work history, view hours worked, and request corrections if needed.',
    position: 'right'
  },
  {
    target: '[data-tour="sidebar-leave"]',
    title: 'Request Leave',
    description: 'Submit vacation, sick, or personal leave requests. Track the status of your requests here.',
    position: 'right'
  },
  {
    target: '[data-tour="sidebar-tickets"]',
    title: 'Support Tickets',
    description: 'Need help? Submit IT, HR, or general support tickets and track their progress.',
    position: 'right'
  },
  {
    target: '[data-tour="sidebar-calendar"]',
    title: 'Calendar',
    description: 'View company holidays, your approved leaves, and important dates.',
    position: 'right'
  },
  {
    target: '[data-tour="profile-menu"]',
    title: 'Your Profile',
    description: 'Access your profile settings, update personal info, and manage your account.',
    position: 'bottom'
  },
  {
    target: '[data-tour="notification-bell"]',
    title: 'Notifications',
    description: 'Stay updated! You\'ll see alerts here for leave approvals, announcements, and more.',
    position: 'bottom'
  }
];

// Storage key includes tenant for isolation
const getStorageKey = (tenantSlug) => `${tenantSlug || 'default'}_tutorial_completed`;

const SpotlightTutorial = ({ forceShow = false, onComplete, tenantName = 'Your Company', tenantColor = '#1a1a1a' }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const isActiveRef = useRef(isActive);
  const currentStepRef = useRef(currentStep);

  // Keep refs in sync
  useEffect(() => {
    isActiveRef.current = isActive;
    currentStepRef.current = currentStep;
  }, [isActive, currentStep]);

  // Check if tutorial should show
  useEffect(() => {
    if (forceShow) {
      // Use timeout to avoid synchronous setState
      const timer = setTimeout(() => {
        setIsActive(true);
        setCurrentStep(0);
      }, 0);
      return () => clearTimeout(timer);
    }

    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay to let page render
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  // Update target element position
  const updateTargetPosition = useCallback(() => {
    if (!isActiveRef.current || currentStepRef.current >= TUTORIAL_STEPS.length) return;

    const step = TUTORIAL_STEPS[currentStepRef.current];
    const element = document.querySelector(step.target);

    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        position: step.position
      });
      setIsReady(true);

      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Element not found, skip to next step
      console.warn(`Tutorial target not found: ${step.target}`);
      if (currentStepRef.current < TUTORIAL_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }
  }, []);

  useEffect(() => {
    // Initial position update with small delay
    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 100);
    
    // Update on resize/scroll
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition, true);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition, true);
    };
  }, [updateTargetPosition, isActive, currentStep]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setIsReady(false);
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsReady(false);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsActive(false);
    setCurrentStep(0);
    onComplete?.();
  };

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (!targetRect) return {};

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;

    switch (targetRect.position) {
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left + targetRect.width + padding
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - padding
        };
      case 'bottom':
        return {
          top: targetRect.top + targetRect.height + padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        };
      case 'top':
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        };
      default:
        return {
          top: targetRect.top + targetRect.height + padding,
          left: targetRect.left
        };
    }
  };

  if (!isActive) return null;

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 z-[9999]" data-testid="spotlight-tutorial">
          {/* Overlay with spotlight cutout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70"
            onClick={handleSkip}
          />

          {/* Spotlight highlight */}
          {targetRect && isReady && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute rounded-xl pointer-events-none"
              style={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 30px rgba(212, 175, 55, 0.5)',
                border: '2px solid #D4AF37',
                zIndex: 10000
              }}
            />
          )}

          {/* Tooltip */}
          {targetRect && isReady && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bg-white rounded-2xl shadow-2xl p-6 w-80"
              style={{
                ...getTooltipStyle(),
                zIndex: 10001
              }}
            >
              {/* Close button */}
              <button
                onClick={handleSkip}
                className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                data-testid="tutorial-close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Step indicator */}
              <div className="flex items-center gap-1 mb-3">
                {TUTORIAL_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentStep 
                        ? 'w-6 bg-brand-gold' 
                        : index < currentStep 
                          ? 'w-1.5 bg-brand-gold/50' 
                          : 'w-1.5 bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-brand-dark mb-2">
                {step.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                {step.description}
              </p>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  data-testid="tutorial-skip"
                >
                  Skip tour
                </button>

                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrev}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-brand-dark transition-colors"
                      data-testid="tutorial-prev"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 px-4 py-2 bg-brand-black text-white rounded-lg hover:bg-brand-black/90 transition-colors text-sm font-medium"
                    data-testid="tutorial-next"
                  >
                    {currentStep === TUTORIAL_STEPS.length - 1 ? (
                      'Finish'
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Progress text */}
              <p className="text-xs text-gray-400 text-center mt-3">
                {currentStep + 1} of {TUTORIAL_STEPS.length}
              </p>
            </motion.div>
          )}

          {/* Welcome modal for step 0 */}
          {currentStep === 0 && !isReady && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-8 w-96 text-center"
              style={{ zIndex: 10001 }}
            >
              <div className="w-16 h-16 bg-brand-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8 text-brand-gold" />
              </div>
              <h2 className="text-2xl font-bold text-brand-dark mb-2">
                Welcome to AurborBloom! 👋
              </h2>
              <p className="text-gray-600 mb-6">
                Let&apos;s take a quick tour to help you get started with your dashboard.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  data-testid="tutorial-skip-welcome"
                >
                  Skip
                </button>
                <button
                  onClick={() => setIsReady(true)}
                  className="flex-1 px-4 py-2 bg-brand-black text-white rounded-lg hover:bg-brand-black/90 transition-colors font-medium"
                  data-testid="tutorial-start"
                >
                  Start Tour
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};

// Helper component for the Help button in header
export const TutorialHelpButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="p-2 text-gray-500 hover:text-brand-gold hover:bg-brand-gold/10 rounded-lg transition-colors"
    title="Take a tour"
    data-testid="help-tour-button"
  >
    <HelpCircle className="w-5 h-5" />
  </button>
);

// Function to reset tutorial (for replay)
export const resetTutorial = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export default SpotlightTutorial;
