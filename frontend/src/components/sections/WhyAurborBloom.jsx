import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Heart, TrendingUp, Smartphone, Shield } from 'lucide-react';

const reasons = [
  {
    icon: Brain,
    title: 'Intelligent',
    description: 'AI-powered workflows and decision support to automate repetitive tasks.',
    gradient: 'from-purple-500 to-indigo-600'
  },
  {
    icon: Heart,
    title: 'People-Centric',
    description: 'Built for employees, not just HR teams. Intuitive experience for everyone.',
    gradient: 'from-pink-500 to-rose-600'
  },
  {
    icon: TrendingUp,
    title: 'Scalable',
    description: 'From 10 to 10,000+ employees. Grows with your organization seamlessly.',
    gradient: 'from-green-500 to-emerald-600'
  },
  {
    icon: Smartphone,
    title: 'Mobile-First',
    description: 'Access HR from anywhere, anytime. Works on any device, any browser.',
    gradient: 'from-blue-500 to-cyan-600'
  },
  {
    icon: Shield,
    title: 'Secure & Compliant',
    description: 'Role-based access controls and audit trails for complete compliance.',
    gradient: 'from-orange-500 to-amber-600'
  }
];

const WhyAurborBloom = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-brand-black to-gray-900 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-brand-accent font-semibold text-sm uppercase tracking-wider">
            Why Choose Us
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold">
            Legacy HR software is outdated
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Traditional systems are disconnected and built for administrators — not for people. 
            We are changing that with a modern approach to HR management.
          </p>
        </motion.div>

        {/* Reasons Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          {reasons.map((reason, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 h-full border border-white/10 hover:border-white/20 transition-all hover:bg-white/10">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${reason.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <reason.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{reason.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{reason.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyAurborBloom;
