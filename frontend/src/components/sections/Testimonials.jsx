import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'HR Director',
    company: 'TechFlow Inc.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    content: 'CORtracker transformed how we manage our remote team. The real-time tracking and automated reports have saved us countless hours every week.',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    role: 'Operations Manager',
    company: 'BuildRight Construction',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    content: 'The GPS verification feature is a game-changer for our field teams. We now have complete visibility across all job sites.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'CEO',
    company: 'HealthFirst Clinics',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    content: 'Compliance was a nightmare before CORtracker. Now we pass audits with ease. The automatic overtime calculations alone justify the investment.',
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 to-white">
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
            Testimonials
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-brand-dark">
            Loved by teams worldwide
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            See what industry leaders are saying about CORtracker.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-100/50 border border-gray-100 relative"
              data-testid={`testimonial-card-${index}`}
            >
              {/* Quote icon */}
              <div className="absolute top-6 right-6 text-brand-red/10">
                <Quote className="w-12 h-12" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-600 leading-relaxed mb-6">
                &ldquo;{testimonial.content}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-brand-dark">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
