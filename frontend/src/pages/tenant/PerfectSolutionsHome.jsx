import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  Code, 
  Briefcase, 
  Server, 
  ChevronRight,
  Clock,
  FileText,
  Calendar,
  Shield,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Linkedin,
  Twitter,
  Facebook,
  Globe,
  Zap,
  Target,
  Award
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const PerfectSolutionsHome = () => {
  const navigate = useNavigate();
  const [tenantInfo, setTenantInfo] = useState(null);

  useEffect(() => {
    // Set document title
    document.title = 'Perfect Solutions - HRMS';
    
    // Fetch tenant info
    const fetchTenant = async () => {
      try {
        const response = await fetch(`${API}/api/tenants/perfectsolutions/public`);
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

  const primaryColor = tenantInfo?.primary_color || '#1E3A8A';
  
  const services = [
    {
      icon: Users,
      title: 'US IT Talent Management',
      description: 'Helping organizations attract, grow, and retain the best tech professionals with deep industry knowledge.'
    },
    {
      icon: Code,
      title: 'Custom Product Development',
      description: 'Crafting smart, scalable, and user-centric products that turn bold ideas into real-world impact.'
    },
    {
      icon: Server,
      title: 'IT Services',
      description: 'Empowering businesses with IT solutions for growth, efficiency, and digital transformation.'
    },
    {
      icon: Briefcase,
      title: 'Flexi Staffing',
      description: 'Enabling custom staffing to meet dynamic business needs with precision and top-quality talent.'
    }
  ];

  const hrmsFeatures = [
    {
      icon: Clock,
      title: 'Time Tracking',
      description: 'Track work hours, breaks, and overtime with precision'
    },
    {
      icon: FileText,
      title: 'Timesheet Management',
      description: 'Streamlined timesheet submission and approval workflow'
    },
    {
      icon: Calendar,
      title: 'Leave Management',
      description: 'Easy PTO requests and approval with calendar integration'
    },
    {
      icon: Shield,
      title: 'Secure Access',
      description: 'Role-based access control for admin and employees'
    }
  ];

  const stats = [
    { value: '80+', label: 'Satisfied Clients' },
    { value: '80+', label: 'Expert Consultants' },
    { value: '80%', label: 'Client Satisfaction' },
    { value: '80+', label: 'Countries Presence' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {tenantInfo?.logo_url ? (
                <img src={tenantInfo.logo_url} alt="Perfect Solutions" className="h-10 object-contain" />
              ) : (
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: primaryColor }}
                >
                  P
                </div>
              )}
              <span className="text-xl font-bold" style={{ color: primaryColor }}>
                Perfect Solutions
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-gray-600 hover:text-gray-900 transition-colors">Services</a>
              <a href="#hrms" className="text-gray-600 hover:text-gray-900 transition-colors">HRMS Portal</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                to="/perfectsolutions/login"
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ color: primaryColor }}
              >
                Sign In
              </Link>
              <Link
                to="/perfectsolutions/login"
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                Employee Portal
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
                style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              >
                <Zap className="w-4 h-4" />
                Innovate Fast. Deliver Smart.
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Unleashing <span style={{ color: primaryColor }}>IT Talent</span>.
                <br />
                Powering the Future.
              </h1>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Perfect Solutions provides expert and committed consulting focused on US IT Talent Management 
                and IT Development, helping organizations attract, grow, and keep the best tech professionals.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <a 
                  href="#services"
                  className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-xl transition-all hover:shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  Explore Services
                  <ArrowRight className="w-5 h-5" />
                </a>
                <Link
                  to="/perfectsolutions/login"
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 font-medium rounded-xl transition-all hover:bg-gray-50"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  Employee Login
                  <ChevronRight className="w-5 h-5" />
                </Link>
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
                style={{ backgroundColor: primaryColor }}
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

      {/* Services Section */}
      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Professional & Dedicated Consulting Solutions
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We combine deep industry knowledge with customized strategies across strategy, operations, 
              and HR to deliver clear, powerful results and long-term success.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group p-6 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-lg transition-all bg-white"
                >
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: primaryColor }} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{service.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HRMS Portal Section */}
      <section id="hrms" className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm font-medium mb-6">
                <Target className="w-4 h-4" />
                Employee Portal
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Perfect Solutions HRMS
              </h2>
              
              <p className="text-lg text-blue-100 mb-8 leading-relaxed">
                Access your personal HR portal for time tracking, leave management, and more. 
                Our integrated HRMS solution helps you manage your work life efficiently.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {hrmsFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-blue-300" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">{feature.title}</h4>
                        <p className="text-sm text-blue-200">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <Link
                to="/perfectsolutions/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-900 font-medium rounded-xl hover:bg-blue-50 transition-colors"
              >
                Access Employee Portal
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="bg-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {tenantInfo?.logo_url ? (
                        <img src={tenantInfo.logo_url} alt="Perfect Solutions" className="h-8 object-contain" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold">
                          P
                        </div>
                      )}
                      <span className="text-white font-medium">Perfect Solutions HRMS</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-300 text-sm">Today&apos;s Hours</span>
                        <span className="text-white font-medium">7h 45m</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '80%' }} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-white">12</div>
                        <div className="text-xs text-blue-300">PTO Days Left</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-white">3</div>
                        <div className="text-xs text-blue-300">Active Projects</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Currently Clocked In
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="relative">
                <div 
                  className="absolute -inset-4 rounded-3xl opacity-10"
                  style={{ backgroundColor: primaryColor }}
                />
                <div className="relative bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold" style={{ color: primaryColor }}>10+ Years</div>
                      <div className="text-gray-600">Industry Experience</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {['Strategy Consulting', 'Operations Excellence', 'HR Solutions', 'Technology Enablement'].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5" style={{ color: primaryColor }} />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                About Perfect Solutions
              </h2>
              
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Perfect Solutions provides expert and committed consulting focused on US IT Talent Management 
                and IT Development, helping organizations attract, grow, and keep the best tech professionals.
              </p>
              
              <p className="text-gray-600 mb-8 leading-relaxed">
                We combine deep industry knowledge with customized strategies across strategy, operations, 
                and HR to deliver clear, powerful results and long-term success. From algorithms to insights, 
                we weave the thread where machines learn and technology paths are led.
              </p>
              
              <a 
                href="https://www.perfectgroupus.com/about.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium transition-colors"
                style={{ color: primaryColor }}
              >
                Learn More About Us
                <ArrowRight className="w-5 h-5" />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Get In Touch
            </h2>
            <p className="text-lg text-gray-600">
              Have questions? We&apos;d love to hear from you.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100"
            >
              <div 
                className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <MapPin className="w-7 h-7" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
              <p className="text-gray-600 text-sm">
                5005 W Royal Ln, Suite 250<br />
                Irving, TX 75063
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100"
            >
              <div 
                className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Phone className="w-7 h-7" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
              <a href="tel:+12485226204" className="text-gray-600 text-sm hover:text-blue-600">
                +1 248 522 6204
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100"
            >
              <div 
                className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Mail className="w-7 h-7" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <a href="mailto:info@perfectgroupus.com" className="text-gray-600 text-sm hover:text-blue-600">
                info@perfectgroupus.com
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {tenantInfo?.logo_url ? (
                <img src={tenantInfo.logo_url} alt="Perfect Solutions" className="h-10 object-contain brightness-0 invert" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                  P
                </div>
              )}
              <span className="text-xl font-bold">Perfect Solutions</span>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="https://www.perfectgroupus.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
            
            <p className="text-gray-400 text-sm">
              © 2025 Perfect Solutions. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PerfectSolutionsHome;
