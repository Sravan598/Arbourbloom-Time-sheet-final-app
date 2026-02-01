import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Code, 
  Brain, 
  Smartphone, 
  GraduationCap, 
  Briefcase, 
  TrendingUp, 
  Lightbulb,
  CheckCircle,
  Star,
  ArrowRight,
  Users,
  Clock,
  Award,
  ChevronRight,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';

const KnowviaTechHome = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const courses = [
    {
      title: 'Full Stack .NET Development',
      level: 'Beginner to Advanced',
      duration: '6 months',
      rating: 4.8,
      icon: Code,
      color: '#512BD4'
    },
    {
      title: 'Generative AI',
      level: 'Beginner',
      duration: '3 months',
      rating: 4.8,
      icon: Brain,
      color: '#10B981'
    },
    {
      title: 'Mobile App Development',
      level: 'Beginner',
      duration: '6 months',
      rating: 4.9,
      icon: Smartphone,
      color: '#3B82F6'
    }
  ];

  const targetAudience = [
    {
      title: 'Fresh Graduates',
      description: 'Bridge the gap between college education and industry requirements with practical, job-ready skills.',
      icon: GraduationCap
    },
    {
      title: 'Career Switchers',
      description: 'Transition into high-paying software development roles without a computer science degree.',
      icon: Briefcase
    },
    {
      title: 'Working Professionals',
      description: 'Upskill in cutting-edge technologies like Generative AI and .NET to accelerate career growth.',
      icon: TrendingUp
    },
    {
      title: 'Aspiring Entrepreneurs',
      description: 'Build your own apps and digital products without depending on expensive development agencies.',
      icon: Lightbulb
    }
  ];

  const steps = [
    { number: '01', title: 'Choose Your Path', description: 'Select the course that aligns with your career goals.' },
    { number: '02', title: 'Learn with Projects', description: 'Follow structured modules with real-world projects.' },
    { number: '03', title: 'Get Expert Guidance', description: 'Mentors available for doubt-clearing and code reviews.' },
    { number: '04', title: 'Land Your Dream Job', description: 'Career support, resume guidance, and interview prep.' }
  ];

  const companies = ['Microsoft', 'Google', 'Intel', 'Cisco', 'Verizon', 'Infopulse'];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/knowviatech" className="flex items-center gap-2">
              <img src="/knowviatech_logo.png" alt="Knowvia Tech" className="h-10 w-auto" />
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#courses" className="text-gray-600 hover:text-red-600 transition-colors">Courses</a>
              <a href="#about" className="text-gray-600 hover:text-red-600 transition-colors">About</a>
              <a href="#contact" className="text-gray-600 hover:text-red-600 transition-colors">Contact</a>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                to="/knowviatech/login"
                className="text-gray-700 hover:text-red-600 font-medium transition-colors"
              >
                Login
              </Link>
              <Link 
                to="/knowviatech/signup"
                className="bg-gradient-to-r from-red-600 to-red-500 text-white px-5 py-2 rounded-full font-medium hover:shadow-lg hover:shadow-red-500/30 transition-all"
              >
                Employee Portal
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-gray-50 via-white to-red-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium mb-6">
                <Award className="w-4 h-4" />
                Best Online Learning Platform
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Code Your Future with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-green-600">
                  Industry-Ready Skills
                </span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Master in-demand technologies like .NET Full Stack, Generative AI, and Mobile App Development 
                through hands-on projects and expert mentorship.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="#courses"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white px-8 py-4 rounded-full font-semibold hover:shadow-xl hover:shadow-red-500/30 transition-all"
                >
                  Explore Courses
                  <ArrowRight className="w-5 h-5" />
                </a>
                <Link 
                  to="/knowviatech/login"
                  className="inline-flex items-center justify-center gap-2 bg-white text-gray-800 px-8 py-4 rounded-full font-semibold border-2 border-gray-200 hover:border-red-500 hover:text-red-600 transition-all"
                >
                  Employee Portal
                </Link>
              </div>
              <div className="flex items-center gap-8 mt-10">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">1000+</div>
                  <div className="text-sm text-gray-500">Students</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">4.8</div>
                  <div className="text-sm text-gray-500">Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">95%</div>
                  <div className="text-sm text-gray-500">Placement</div>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-gradient-to-br from-red-500 to-green-500 rounded-3xl p-1">
                <div className="bg-white rounded-3xl p-8">
                  <div className="grid grid-cols-3 gap-4">
                    {[Code, Brain, Smartphone].map((Icon, idx) => (
                      <div key={idx} className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center">
                        <Icon className={`w-10 h-10 ${idx === 0 ? 'text-purple-600' : idx === 1 ? 'text-green-600' : 'text-blue-600'}`} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 text-center">
                    <h3 className="font-semibold text-gray-900">Knowledge via Technology</h3>
                    <p className="text-sm text-gray-500 mt-1">Transform your career with us</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section id="courses" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Courses</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Industry-aligned curriculum designed to make you job-ready
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {courses.map((course, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-red-200 transition-all group"
              >
                <div className="h-48 flex items-center justify-center" style={{ backgroundColor: `${course.color}10` }}>
                  <course.icon className="w-20 h-20" style={{ color: course.color }} />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
                  <p className="text-gray-600 mb-4">{course.level}</p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-4 h-4" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      {course.rating}
                    </div>
                  </div>
                  <button className="w-full mt-4 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 group-hover:border-red-500 group-hover:text-red-600 transition-all flex items-center justify-center gap-2">
                    View Course
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Courses are Suitable for...</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {targetAudience.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-6 hover:shadow-lg transition-all"
              >
                <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">Your journey to a tech career in 4 simple steps</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="text-5xl font-bold text-red-600 mb-4">{step.number}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 bg-gradient-to-br from-red-600 to-red-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-white">
            <div className="flex justify-center mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl font-medium mb-6 leading-relaxed">
              "As a Python developer, I wanted to get into AI. The Generative AI course gave me hands-on 
              experience with GPT models and LangChain. Within 2 months of completion, I landed an AI 
              engineer role with a 60% salary hike."
            </blockquote>
            <div className="font-semibold">— Rahul Mehta, AI Engineer</div>
          </div>
        </div>
      </section>

      {/* Companies */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h3 className="text-lg font-medium text-gray-500">Where Our Graduates Work</h3>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {companies.map((company, idx) => (
              <div key={idx} className="text-xl font-bold text-gray-300 hover:text-gray-500 transition-colors">
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Book a Free Career Counseling Session
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Not sure which course is right for you? Talk to our career advisors who'll help you 
                choose the perfect learning path based on your background and goals.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <div className="font-medium text-gray-900">info@knowviatech.com</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Community</div>
                    <div className="font-medium text-gray-900">Join 1000+ learners</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Get a Consultation</h3>
              <form className="space-y-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <textarea
                  placeholder="Your Message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-red-500/30 transition-all"
                >
                  Get a Consultation
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Employee Portal CTA */}
      <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Knowvia Tech Employee Portal
          </h2>
          <p className="text-gray-400 mb-8">
            Access your timesheets, leave management, and HR services
          </p>
          <Link
            to="/knowviatech/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white px-8 py-4 rounded-full font-semibold hover:shadow-xl hover:shadow-red-500/30 transition-all"
          >
            Access Employee Portal
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src="/knowviatech_logo.png" alt="Knowvia Tech" className="h-10 w-auto brightness-0 invert" />
            </div>
            <div className="text-sm">
              Knowvia Tech © 2025 All rights reserved
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs">Knowledge via Technology</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default KnowviaTechHome;
