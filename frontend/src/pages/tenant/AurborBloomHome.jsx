import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock,
  FileText,
  Calendar,
  Shield,
  ArrowRight,
  Users,
  CheckCircle,
  BarChart3,
  Zap,
  Target,
  Sparkles,
  Building2,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const AurborBloomHome = () => {
  const [tenantInfo, setTenantInfo] = useState(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const response = await fetch(`${API}/api/tenants/aurborbloom/public`);
        if (response.ok) {
          const data = await response.json();
          setTenantInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch tenant info:', err);
      }
    };
    fetchTenant();
  }, []);

  const primaryColor = tenantInfo?.primary_color || '#1a1a1a';
  const secondaryColor = tenantInfo?.secondary_color || '#D4AF37';
  
  const features = [
    {
      icon: Clock,
      title: 'Time Tracking',
      description: 'Effortlessly track work hours with one-click clock in/out and automatic break detection.'
    },
    {
      icon: FileText,
      title: 'Timesheet Management',
      description: 'Streamlined timesheet submission with approval workflows and correction requests.'
    },
    {
      icon: Calendar,
      title: 'Leave Management',
      description: 'Request PTO, sick days, and personal leave with calendar integration.'
    },
    {
      icon: Users,
      title: 'Employee Management',
      description: 'Comprehensive employee profiles, documents, and organizational hierarchy.'
    },
    {
      icon: BarChart3,
      title: 'Performance Insights',
      description: 'Real-time analytics and reports on team productivity and attendance.'
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'Role-based access control with audit trails and data encryption.'
    }
  ];

  const stats = [
    { value: '99.9%', label: 'Uptime' },
    { value: '50K+', label: 'Hours Tracked' },
    { value: '500+', label: 'Happy Users' },
    { value: '24/7', label: 'Support' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="/aurborbloom_logo.png" 
                alt="AurborBloom" 
                className="h-10 object-contain"
              />
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                to="/aurborbloom/login"
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ color: primaryColor }}
              >
                Sign In
              </Link>
              <Link
                to="/aurborbloom/login"
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-gray-50 via-amber-50/30 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
                style={{ backgroundColor: `${secondaryColor}20`, color: primaryColor }}
              >
                <Sparkles className="w-4 h-4" style={{ color: secondaryColor }} />
                Modern HR Management
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Streamline Your
                <br />
                <span style={{ color: secondaryColor }}>Workforce</span> Management
              </h1>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                AurborBloom is a comprehensive HRMS platform that simplifies time tracking, 
                leave management, and employee administration. Built for modern teams.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/aurborbloom/login"
                  className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-xl transition-all hover:shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a 
                  href="#features"
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 font-medium rounded-xl transition-all hover:bg-gray-50"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  Learn More
                  <ChevronRight className="w-5 h-5" />
                </a>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div 
                className="absolute -inset-4 rounded-3xl opacity-20 blur-3xl"
                style={{ backgroundColor: secondaryColor }}
              />
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                <div className="grid grid-cols-2 gap-6">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="text-center p-4 rounded-xl bg-gray-50"
                    >
                      <div className="text-3xl font-bold mb-1" style={{ color: primaryColor }}>
                        {stat.value}
                      </div>
                      <div className="text-sm text-gray-600">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Team
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              A complete suite of HR tools designed to save time, reduce errors, 
              and keep your team productive.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group p-6 rounded-2xl border border-gray-100 hover:border-amber-100 hover:shadow-lg transition-all bg-white"
                >
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${secondaryColor}20` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: primaryColor }} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to Transform Your HR Operations?
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Join hundreds of companies using AurborBloom to streamline their workforce management.
            </p>
            <Link
              to="/aurborbloom/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white font-medium rounded-xl transition-all hover:shadow-lg"
              style={{ color: primaryColor }}
            >
              Get Started Today
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                About AurborBloom
              </h2>
              
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                AurborBloom is a modern HRMS platform built for growing businesses. 
                We believe managing your workforce should be simple, intuitive, and even enjoyable.
              </p>
              
              <p className="text-gray-600 mb-8 leading-relaxed">
                Our platform combines powerful features with beautiful design to create 
                an HR experience that both administrators and employees love to use.
              </p>
              
              <div className="space-y-4">
                {['Easy to use interface', 'Powerful reporting', 'Secure & compliant', '24/7 support'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" style={{ color: secondaryColor }} />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${secondaryColor}20` }}
                  >
                    <Building2 className="w-8 h-8" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: primaryColor }}>Enterprise Ready</div>
                    <div className="text-gray-600">Scalable for any team size</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {['Multi-tenant architecture', 'Custom branding', 'API integrations', 'Role-based access'].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Target className="w-4 h-4" style={{ color: secondaryColor }} />
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/aurborbloom_logo.png" 
                alt="AurborBloom" 
                className="h-10 object-contain brightness-0 invert"
              />
            </div>
            
            <div className="flex items-center gap-8 text-sm text-gray-400">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#about" className="hover:text-white transition-colors">About</a>
              <Link to="/aurborbloom/login" className="hover:text-white transition-colors">Sign In</Link>
            </div>
            
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} AurborBloom. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AurborBloomHome;
