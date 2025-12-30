import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Users, 
  BarChart3, 
  Shield, 
  Smartphone, 
  Zap 
} from 'lucide-react';
import TiltCard from '../ui/TiltCard';

const features = [
  {
    icon: Clock,
    title: 'Real-Time Tracking',
    description: 'Track employee hours instantly with our precision clock-in/clock-out system. Never miss a minute.',
    color: 'text-brand-red',
    bgColor: 'bg-brand-red/10'
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Organize teams, departments, and shifts effortlessly. Complete visibility into your workforce.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Powerful reports and insights to optimize productivity and identify trends in real-time.',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    icon: Shield,
    title: 'Compliance Ready',
    description: 'Stay compliant with labor laws. Automatic overtime calculations and audit trails included.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    icon: Smartphone,
    title: 'Mobile First',
    description: 'Clock in from anywhere with our native mobile apps. GPS verification available.',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  {
    icon: Zap,
    title: 'Instant Integration',
    description: 'Seamlessly connect with payroll, HR, and accounting software you already use.',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
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
          <span className="text-brand-red font-semibold text-sm uppercase tracking-wider">
            Features
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-brand-dark">
            Everything you need to manage time effectively
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            CORtracker provides a comprehensive suite of tools designed to streamline 
            your workforce management and boost operational efficiency.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
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
                  className="bg-white rounded-3xl p-6 h-full border border-gray-100"
                  data-testid={`feature-card-${index}`}
                >
                  <div className={`w-14 h-14 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6`}>
                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-brand-dark mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
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
