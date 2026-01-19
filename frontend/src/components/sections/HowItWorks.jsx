import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Settings, Rocket } from 'lucide-react';
import TiltCard from '../ui/TiltCard';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Sign Up & Add Your Team',
    description: 'Create your account in under 2 minutes. Import employees via CSV or add them manually. Configure departments and roles with our guided setup.',
  },
  {
    number: '02',
    icon: Settings,
    title: 'Configure Your Workflows',
    description: 'Set up leave policies, approval chains, and time tracking rules. Customize settings to match how your organization works.',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Go Live & Empower Your Team',
    description: 'Invite employees to start tracking time, requesting leave, and using the platform. Get real-time insights from day one.',
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-brand-black font-semibold text-sm uppercase tracking-wider">
            Getting Started
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-brand-dark">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            AurborBloom is designed for simplicity. No complex implementation, 
            no lengthy onboarding — just results from day one.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-32 left-[16.67%] right-[16.67%] h-1 bg-gradient-to-r from-brand-black/20 via-brand-black to-brand-black/20" />

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative"
              >
                {/* Timeline dot */}
                <div className="hidden lg:flex justify-center mb-6">
                  <motion.div 
                    className="w-8 h-8 bg-brand-black rounded-full border-4 border-white shadow-lg flex items-center justify-center"
                    whileHover={{ scale: 1.2 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </motion.div>
                </div>

                <TiltCard
                  tiltAmount={6}
                  glareOpacity={0.12}
                  scale={1.02}
                >
                  <div className="bg-white rounded-3xl p-8 border border-gray-100 relative">
                    {/* Step number badge - mobile */}
                    <div className="lg:hidden absolute -top-4 left-8 bg-gradient-to-r from-brand-black to-gray-800 text-white text-sm font-bold px-4 py-2 rounded-full">
                      Step {step.number}
                    </div>

                    {/* Icon */}
                    <div className="w-16 h-16 bg-brand-black/10 rounded-2xl flex items-center justify-center mb-6 mt-2 lg:mt-0">
                      <step.icon className="w-8 h-8 text-brand-black" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-brand-dark mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
