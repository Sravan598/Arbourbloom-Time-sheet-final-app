import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const contactInfo = [
  {
    icon: Mail,
    title: 'Email Us',
    content: 'Hr@cortracker360.com',
    href: 'mailto:Hr@cortracker360.com',
  },
  {
    icon: Phone,
    title: 'Call Us',
    content: '+1 9472286910',
    href: 'tel:+19472286910',
  },
  {
    icon: MapPin,
    title: 'Visit Us',
    content: '5005 W Royal Ln, Ste 298\nIrving, Texas 75063',
    href: null,
  },
];

const Contact = () => {
  return (
    <section id="contact" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-brand-red font-semibold text-sm uppercase tracking-wider">
            Contact Us
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-brand-dark">
            Get in touch with our team
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Ready to transform your time tracking? Let's talk.
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {contactInfo.map((info, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-3xl p-8 text-center h-full border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <div className="w-16 h-16 bg-brand-red/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <info.icon className="w-8 h-8 text-brand-red" />
              </div>
              <h3 className="font-semibold text-brand-dark text-lg mb-2">{info.title}</h3>
              {info.href ? (
                <a 
                  href={info.href}
                  className="text-gray-600 hover:text-brand-red transition-colors"
                >
                  {info.content}
                </a>
              ) : (
                <p className="text-gray-600 whitespace-pre-line">
                  {info.content}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Contact;
