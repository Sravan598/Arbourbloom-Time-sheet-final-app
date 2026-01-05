import React from 'react';
import { UserPlus, Timer, FileText } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Create Your Account',
    description: 'Sign up in under 2 minutes. Add your team members and configure your departments with our guided setup wizard.',
  },
  {
    number: '02',
    icon: Timer,
    title: 'Start Tracking Time',
    description: 'Employees clock in/out via web, mobile, or kiosk. GPS verification and biometric options available for enhanced accuracy.',
  },
  {
    number: '03',
    icon: FileText,
    title: 'Generate Reports',
    description: 'Access real-time dashboards, export timesheets, and sync with payroll. Automate overtime calculations instantly.',
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-brand-red font-semibold text-sm uppercase tracking-wider">
            How It Works
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-brand-dark">
            Get started in 3 simple steps
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            CORtracker is designed for simplicity. Your team can be up and running 
            in minutes, not days.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line - positioned behind cards */}
          <div className="hidden lg:block absolute top-32 left-[16.67%] right-[16.67%] h-1 bg-gradient-to-r from-brand-red/20 via-brand-red to-brand-red/20" />

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Timeline dot - above the card */}
                <div className="hidden lg:flex justify-center mb-6">
                  <div className="w-8 h-8 bg-brand-red rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-gray-100 relative shadow-sm hover:shadow-md transition-shadow duration-300">
                  {/* Step number badge - mobile only */}
                  <div className="lg:hidden absolute -top-4 left-8 bg-gradient-to-r from-brand-red to-brand-red-dark text-white text-sm font-bold px-4 py-2 rounded-full">
                    Step {step.number}
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 bg-brand-red/10 rounded-2xl flex items-center justify-center mb-6 mt-2 lg:mt-0">
                    <step.icon className="w-8 h-8 text-brand-red" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-brand-dark mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
