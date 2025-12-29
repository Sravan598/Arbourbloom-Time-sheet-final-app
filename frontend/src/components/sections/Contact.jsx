import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin } from 'lucide-react';

const Contact = () => {
  return (
    <section id="contact" className="py-24 bg-white">
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
            Contact Us
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-brand-dark">
            Get in touch with our team
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Ready to transform your time tracking? Let's talk.
          </p>
        </motion.div>

        {/* Contact Info Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Email */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gray-50 rounded-3xl p-8 text-center hover:shadow-lg transition-shadow"
          >
            <div className="w-16 h-16 bg-brand-red/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-brand-red" />
            </div>
            <h3 className="font-semibold text-brand-dark text-lg mb-2">Email Us</h3>
            <a 
              href="mailto:Hr@cortracker360.com" 
              className="text-gray-600 hover:text-brand-red transition-colors"
            >
              Hr@cortracker360.com
            </a>
          </motion.div>

          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-gray-50 rounded-3xl p-8 text-center hover:shadow-lg transition-shadow"
          >
            <div className="w-16 h-16 bg-brand-red/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Phone className="w-8 h-8 text-brand-red" />
            </div>
            <h3 className="font-semibold text-brand-dark text-lg mb-2">Call Us</h3>
            <a 
              href="tel:+19472286910" 
              className="text-gray-600 hover:text-brand-red transition-colors"
            >
              +1 9472286910
            </a>
          </motion.div>

          {/* Address */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-gray-50 rounded-3xl p-8 text-center hover:shadow-lg transition-shadow"
          >
            <div className="w-16 h-16 bg-brand-red/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-8 h-8 text-brand-red" />
            </div>
            <h3 className="font-semibold text-brand-dark text-lg mb-2">Visit Us</h3>
            <p className="text-gray-600">
              5005 W Royal Ln, Ste 298<br />
              Irving, Texas 75063
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
