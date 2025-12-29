import React from 'react';
import Navbar from './components/sections/Navbar';
import Hero from './components/sections/Hero';
import Features from './components/sections/Features';
import HowItWorks from './components/sections/HowItWorks';
import ProductPreview from './components/sections/ProductPreview';
import Testimonials from './components/sections/Testimonials';
import Pricing from './components/sections/Pricing';
import FAQ from './components/sections/FAQ';
import Contact from './components/sections/Contact';
import Footer from './components/sections/Footer';
import './App.css';

function App() {
  return (
    <div className="App antialiased">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <ProductPreview />
        <Testimonials />
        <Pricing />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default App;
