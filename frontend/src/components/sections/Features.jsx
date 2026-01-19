import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Users, 
  CalendarDays, 
  BarChart3, 
  MessageSquare,
  Ticket,
  Shield,
  Smartphone
} from 'lucide-react';
import TiltCard from '../ui/TiltCard';

const features = [
  {
    icon: Clock,
    title: 'Time & Attendance',
    description: 'Clock in/out from desktop or mobile. Timesheet approvals, overtime tracking, and break management built-in.',
    color: 'text-brand-black',
    bgColor: 'bg-brand-black/10'
  },
  {
    icon: Users,
    title: 'Employee Management',
    description: 'Centralized employee profiles with role-based access. Manage departments, positions, and team structures effortlessly.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    icon: CalendarDays,
    title: 'Leave & Holiday Management',
    description: 'Custom leave types, approval workflows, and carry-forward logic. Visual calendar for team-wide leave visibility.',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    icon: BarChart3,
    title: 'HR Analytics & Dashboards',
    description: 'Real-time insights into attendance trends, leave patterns, and workforce productivity. Export reports instantly.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    icon: Ticket,
    title: 'Support Ticketing',
    description: 'Internal helpdesk for HR, IT, and facilities requests. SLA tracking, priority management, and comment threads.',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  {
    icon: MessageSquare,
    title: 'Team Communication',
    description: 'Built-in chat channels, direct messaging, and company announcements. Keep your team connected and informed.',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100'
  },
  {
    icon: Shield,
    title: 'Secure & Compliant',
    description: 'Role-based permissions, audit trails, and data encryption. Stay compliant with labor regulations effortlessly.',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100'
  },
  {
    icon: Smartphone,
    title: 'Mobile-First Design',
    description: 'Access HR tools from anywhere. Responsive interface that works seamlessly on all devices.',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100'
  }
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' }
  }
};

const Features = () => {
  return (
    <section id="features" className="py-24 bg-white">
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
            Full Suite of HR Tools
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-brand-dark">
            Everything you need to manage your workforce
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            AurborBloom HRM offers modular tools that work beautifully together — 
            streamlining processes and creating meaningful employee experiences.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <TiltCard 
                className="h-full"
                tiltAmount={8}
                glareOpacity={0.1}
                scale={1.03}
              >
                <div 
                  className="bg-white rounded-2xl p-6 h-full border border-gray-100 hover:border-gray-200 transition-colors"
                  data-testid={`feature-card-${index}`}
                >
                  <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-brand-dark mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
