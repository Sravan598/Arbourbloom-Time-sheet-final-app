import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Star,
  ArrowRight,
  Clock,
  ChevronRight,
  Facebook,
  Instagram,
  Twitter,
  MessageCircle
} from 'lucide-react';

const KnowviaTechHome = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  // Professional images
  const images = {
    hero1: 'https://images.unsplash.com/photo-1758873268023-15a6e6d739ed?w=600&q=80',
    hero2: 'https://images.unsplash.com/photo-1690383921891-3f0b6b2f9bab?w=600&q=80',
    dotnet: 'https://images.unsplash.com/photo-1565687981296-535f09db714e?w=600&q=80',
    ai: 'https://images.unsplash.com/photo-1655393001768-d946c97d6fd1?w=600&q=80',
    mobile: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80',
    testimonial: 'https://images.unsplash.com/photo-1758598497628-942ad38a6dc4?w=600&q=80',
    consultation: 'https://images.unsplash.com/photo-1758518725921-1eb74ed293be?w=600&q=80',
    coding: 'https://images.unsplash.com/photo-1760670399462-f5e479452c27?w=600&q=80'
  };

  const courses = [
    {
      title: 'Full Stack .NET Development',
      subtitle: 'Beginner to Advanced',
      level: 'Progressive',
      duration: '6 months',
      rating: 4.8,
      image: images.dotnet
    },
    {
      title: 'Generative AI',
      subtitle: 'Gen AI Master',
      level: 'Beginner',
      duration: '3 months',
      rating: 4.8,
      image: images.ai
    },
    {
      title: 'Mobile Application Development',
      subtitle: 'All in One Mobile App',
      level: 'Beginner',
      duration: '6 months',
      rating: 4.9,
      image: images.mobile
    }
  ];

  const targetAudience = [
    {
      title: 'Fresh Graduates',
      description: 'Fresh Graduates looking to bridge the gap between college education and industry requirements with practical, job-ready skills in modern technologies.',
      icon: '📊'
    },
    {
      title: 'Career Switchers',
      description: 'Career Switchers from non-tech backgrounds who want to transition into high-paying software development roles without a computer science degree.',
      icon: '🔄'
    },
    {
      title: 'Working Professionals',
      description: 'Working Professionals seeking to upskill in cutting-edge technologies like Generative AI and .NET to accelerate their career growth and salary.',
      icon: '📈'
    },
    {
      title: 'Aspiring Entrepreneurs',
      description: 'Aspiring Entrepreneurs who want to build their own apps and digital products without depending on expensive development agencies.',
      icon: '💡'
    }
  ];

  const steps = [
    { 
      number: '01', 
      title: 'Choose Your Path', 
      description: "Select the course that aligns with your career goals. Not sure? Book a free counseling session with our career advisors." 
    },
    { 
      number: '02', 
      title: 'Learn with Hands-On Projects', 
      description: 'Follow structured modules with video lessons, coding exercises, and real-world projects that build your portfolio.' 
    },
    { 
      number: '03', 
      title: 'Get Expert Guidance', 
      description: 'Stuck? Our mentors are available for doubt-clearing sessions, code reviews, and career guidance throughout your journey.' 
    },
    { 
      number: '04', 
      title: 'Land Your Dream Job', 
      description: 'With our career support, resume guidance, and interview prep, confidently apply and secure your first tech role.' 
    }
  ];

  const companies = [
    { name: 'Microsoft', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/512px-Microsoft_logo.svg.png' },
    { name: 'Google', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/512px-Google_2015_logo.svg.png' },
    { name: 'Intel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Intel_logo_%282006-2020%29.svg/512px-Intel_logo_%282006-2020%29.svg.png' },
    { name: 'Cisco', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Cisco_logo_blue_2016.svg/512px-Cisco_logo_blue_2016.svg.png' },
    { name: 'Verizon', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Verizon_2015_logo_-vector.svg/512px-Verizon_2015_logo_-vector.svg.png' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Thank you for your inquiry! Our team will contact you soon.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/knowviatech" className="flex items-center">
              <img src="/knowviatech_logo.png" alt="Knowvia Tech" className="h-12 w-auto" />
            </Link>
            <div className="flex items-center gap-4">
              <Link 
                to="/knowviatech/login"
                className="bg-red-600 text-white px-6 py-2 rounded-md font-medium hover:bg-red-700 transition-all"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Code Your Future with Industry-Ready Skills
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Master in-demand technologies like .NET Full Stack, Generative AI, and Mobile App Development 
                through hands-on projects and expert mentorship. Join thousands of learners building real-world 
                applications and landing their dream tech jobs.
              </p>
              
              {/* Course Tags */}
              <div className="flex flex-wrap gap-3 mb-8">
                <span className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium">
                  .NET Full-stack Development
                </span>
                <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
                  Generative AI
                </span>
                <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
                  Mobile App Development
                </span>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <img 
                  src={images.hero1}
                  alt="Professional developer" 
                  className="rounded-2xl shadow-lg w-full h-64 object-cover"
                />
                <img 
                  src={images.coding}
                  alt="Coding workspace" 
                  className="rounded-2xl shadow-lg w-full h-64 object-cover mt-8"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Courses Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Our Courses</h2>
            <button className="flex items-center gap-2 text-red-600 font-medium hover:text-red-700">
              Explore Courses
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {courses.map((course, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all group"
              >
                <div className="h-48 overflow-hidden">
                  <img 
                    src={course.image} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-500 mb-1">{course.title}</p>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{course.subtitle}</h3>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{course.level}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      {course.rating}
                    </div>
                  </div>
                  
                  <button className="w-full py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:border-red-500 hover:text-red-600 transition-all flex items-center justify-center gap-2">
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
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            Our Courses are Suitable for …
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {targetAudience.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
            The Knowvia Tech Team with High Technical Skills
          </h2>
          <p className="text-xl text-gray-600 text-center mb-16">Help You Learn a New Profession</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="text-6xl font-bold text-red-600 mb-4">{step.number}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              <img 
                src={images.testimonial}
                alt="Rahul Mehta - Success Story"
                className="rounded-2xl shadow-2xl w-80 h-96 object-cover"
              />
            </div>
            <div className="text-white">
              <div className="text-6xl text-red-500 mb-6">"</div>
              <blockquote className="text-xl md:text-2xl font-light italic mb-8 leading-relaxed">
                As a Python developer, I wanted to get into AI. The Generative AI course gave me hands-on 
                experience with GPT models and LangChain. Within 2 months of completion, I landed an AI 
                engineer role with a 60% salary hike.
              </blockquote>
              <div className="flex items-center gap-4">
                <img 
                  src={images.testimonial}
                  alt="Rahul Mehta"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold">Rahul Mehta,</div>
                  <div className="text-gray-400">AI Engineer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Book a Free Career Counseling Session
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Not sure which course is right for you? Talk to our career advisors who'll help you 
                choose the perfect learning path based on your background and goals.
              </p>
              <img 
                src={images.consultation}
                alt="Career Counseling"
                className="rounded-2xl shadow-lg w-full h-80 object-cover"
              />
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Get a Consultation</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Message"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold hover:bg-red-700 transition-all"
                >
                  Get a Consultation
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Where Our Graduates Work */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Where Our Graduates Work in
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-12">
            {companies.map((company, idx) => (
              <div key={idx} className="grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
                <img 
                  src={company.logo} 
                  alt={company.name}
                  className="h-8 w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Employee Portal CTA */}
      <section className="py-16 bg-red-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Knowvia Tech Employee Portal
          </h2>
          <p className="text-red-100 mb-8">
            Access your timesheets, leave management, and HR services
          </p>
          <Link
            to="/knowviatech/login"
            className="inline-flex items-center gap-2 bg-white text-red-600 px-8 py-4 rounded-xl font-semibold hover:shadow-xl transition-all"
          >
            Access Employee Portal
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <Link to="/knowviatech" className="flex items-center mb-4">
                <img src="/knowviatech_logo.png" alt="Knowvia Tech" className="h-12 w-auto brightness-0 invert" />
              </Link>
              <p className="text-gray-400 mb-6">
                Knowvia Tech is an LMS platform that provides hands-on training in tech courses like 
                .NET Fullstack, Generative AI, and App Development.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            {/* Links */}
            <div>
              <h4 className="font-bold mb-4">Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Home</a></li>
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Courses</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            {/* Classes */}
            <div>
              <h4 className="font-bold mb-4">Class</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">.NET Full Stack</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Generative AI</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mobile App Dev</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>Knowvia Tech © 2025 All rights reserved by Cortracker360 Solutions</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default KnowviaTechHome;
