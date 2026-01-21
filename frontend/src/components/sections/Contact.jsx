import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin } from 'lucide-react';
import TiltCard from '../ui/TiltCard';

const contactInfo = [
  {
    icon: Mail,
    title: 'Email Us',
    content: 'hr@aurborbloom.com',
    href: 'mailto:hr@aurborbloom.com',
  },
  {
    icon: Phone,
    title: 'Call Us',
    content: '+1 (469) 465-0554',
    href: 'tel:+14694650554',
  },
  {
    icon: MapPin,
    title: 'Visit Us',
    content: '2351 W Northwest Hwy,\nSuite 1115, Dallas TX, 75220\nUnited States',
    href: null,
  },
];

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
          <span className="text-brand-black font-semibold text-sm uppercase tracking-wider">
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
          {contactInfo.map((info, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <TiltCard
                tiltAmount={10}
                glareOpacity={0.15}
                scale={1.05}
              >
                <div className="bg-gray-50 rounded-3xl p-8 text-center h-full border border-gray-100">
                  <div className="w-16 h-16 bg-brand-black/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <info.icon className="w-8 h-8 text-brand-black" />
                  </div>
                  <h3 className="font-semibold text-brand-dark text-lg mb-2">{info.title}</h3>
                  {info.href ? (
                    <a 
                      href={info.href}
                      className="text-gray-600 hover:text-brand-black transition-colors"
                    >
                      {info.content}
                    </a>
                  ) : (
                    <p className="text-gray-600 whitespace-pre-line">
                      {info.content}
                    </p>
                  )}
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Contact;
