
import React from 'react';
import { Button } from "@/components/ui/button";

const Hero = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="bg-gradient-blue-gold py-20 px-4 relative overflow-hidden">
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-subtle-blue opacity-10"></div>
      
      <div className="max-w-6xl mx-auto text-center relative z-10">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Open<span className="text-openkey-gold">Key</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-medium">
            Connecting Communities, Unlocking Opportunities
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <p className="text-lg text-white/80 leading-relaxed">
            We help Section 8 voucher holders find quality housing while connecting landlords 
            with pre-screened, reliable tenants. Fast, simple, and always free for renters.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Button 
            onClick={() => scrollToSection('tenant-form')}
            variant="gold"
            size="lg"
            className="px-8 py-3 text-lg shadow-lg"
          >
            Need Housing? Start Here
          </Button>
          <Button 
            onClick={() => scrollToSection('landlord-form')}
            variant="outline"
            size="lg"
            className="border-white text-white hover:bg-white hover:text-openkey-blue px-8 py-3 text-lg shadow-lg"
          >
            List Your Property
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
