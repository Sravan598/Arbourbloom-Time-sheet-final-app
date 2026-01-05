import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-red/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-silver/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="text-center lg:text-left">
            <span className="inline-block px-4 py-2 bg-brand-red/10 text-brand-red rounded-full text-sm font-semibold mb-6">
              360° ERP Solutions
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-dark leading-tight mb-6">
              Streamline Your
              <span className="text-brand-red"> Workforce</span>
              <br />
              Time Tracking
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0">
              The intelligent employee time tracking system that boosts productivity, 
              ensures compliance, and simplifies payroll processing.
            </p>

            <div className="flex justify-center lg:justify-start">
              <Link to="/signup">
                <Button 
                  variant="primary" 
                  size="lg"
                  data-testid="hero-get-started-btn"
                >
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column - Static Logo */}
          <div className="relative flex items-center justify-center">
            <div className="relative p-8 md:p-12 rounded-3xl bg-white/50 backdrop-blur-sm border border-gray-200 shadow-xl">
              <img 
                src="https://customer-assets.emergentagent.com/job_readable-link/artifacts/ufwwws2h_image.png" 
                alt="CORtracker - A 360° ERP Solutions"
                className="w-64 md:w-80 h-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-6 h-10 border-2 border-brand-dark/30 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-brand-red rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
