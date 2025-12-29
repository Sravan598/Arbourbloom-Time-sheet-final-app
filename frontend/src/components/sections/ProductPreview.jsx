import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, Smartphone, BarChart2 } from 'lucide-react';

const ProductPreview = () => {
  return (
    <section className="py-24 bg-brand-dark overflow-hidden">
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
            Product Preview
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-white">
            Beautiful, intuitive interface
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Designed for clarity and efficiency. Your team will love using CORtracker.
          </p>
        </motion.div>

        {/* Preview Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Desktop Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="md:col-span-2"
          >
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 border border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Monitor className="w-5 h-5 text-brand-red" />
                <span className="text-white font-medium">Dashboard View</span>
              </div>
              <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-20 h-20 bg-brand-red/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BarChart2 className="w-10 h-10 text-brand-red" />
                  </div>
                  <h4 className="text-white font-semibold mb-2">Real-Time Analytics</h4>
                  <p className="text-gray-500 text-sm">Track hours, productivity & attendance</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Mobile Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 border border-gray-700 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-5 h-5 text-brand-red" />
                <span className="text-white font-medium">Mobile App</span>
              </div>
              <div className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center justify-center h-[calc(100%-3rem)]">
                <div className="w-32 h-56 bg-gradient-to-b from-brand-red/30 to-brand-red/10 rounded-3xl border-2 border-brand-red/50 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-brand-red rounded-full flex items-center justify-center mb-4">
                    <span className="text-white text-2xl font-bold">▶</span>
                  </div>
                  <span className="text-white text-sm font-medium">Clock In</span>
                  <span className="text-gray-500 text-xs mt-1">Tap to start</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { value: '99.9%', label: 'Uptime' },
            { value: '< 1s', label: 'Clock Speed' },
            { value: '256-bit', label: 'Encryption' },
            { value: '24/7', label: 'Support' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-brand-red mb-2">
                {stat.value}
              </div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ProductPreview;
