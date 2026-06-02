import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Globe, CreditCard, Landmark, BarChart3, Building2, Shield } from 'lucide-react';

export function DifferentiatorSlide() {
  const differentiators = [
    {
      icon: Sparkles,
      title: 'AI + Team Matching',
      description: 'Proprietary algorithm with human review for quality assurance',
    },
    {
      icon: Globe,
      title: 'Category Creation',
      description: 'Not property management — Global Asset Portfolio Intelligence',
    },
    {
      icon: CreditCard,
      title: 'Stripe Rent Collection',
      description: 'In-app payment processing for seamless tenant payments',
    },
    {
      icon: Landmark,
      title: 'Plaid Payment Tracking',
      description: 'Auto-tag bank deposits, split across properties & units',
    },
    {
      icon: BarChart3,
      title: 'Portfolio Dashboard',
      description: 'Multi-property analytics with HAP/tenant portion tracking',
    },
    {
      icon: Building2,
      title: 'Two-Sided Network',
      description: 'Powerful network effects as tenants and landlords grow together',
    },
  ];

  return (
    <div className="min-h-[500px] h-full px-8 py-8 flex flex-col">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-2"
        style={{ opacity: 1, transform: 'none' }}
      >
        Why We're Different
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-lg text-[#d4af37] text-center mb-6 font-semibold"
        style={{ opacity: 1 }}
      >
        Housing Marketplace + Property Management Software
      </motion.p>

      <div className="flex-1 flex flex-col justify-center">
        {/* Force 3-column grid with inline style for print */}
        <div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
        >
        {differentiators.map((diff, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] rounded-xl p-4 text-white"
            style={{ opacity: 1, transform: 'none' }}
          >
            <diff.icon 
              className="w-8 h-8 text-[#d4af37] mb-2" 
              style={{ width: '32px', height: '32px' }} 
            />
            <h3 className="text-base font-semibold mb-1">{diff.title}</h3>
            <p className="text-gray-300 text-xs">{diff.description}</p>
          </motion.div>
        ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-4 text-center max-w-3xl mx-auto"
        style={{ opacity: 1, transform: 'none' }}
      >
        <div className="inline-flex items-center gap-2 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full px-4 py-1.5 mb-3">
          <Shield 
            className="w-4 h-4 text-[#d4af37]" 
            style={{ width: '16px', height: '16px' }} 
          />
          <span className="text-xs font-semibold text-[#1e3a5f]">Patent-Pending Technology</span>
          <span className="text-xs text-gray-600">— Proprietary matching algorithm</span>
        </div>
        <p className="text-base text-gray-600">
          We're not just competing in property management — 
          <span className="font-bold text-[#1e3a5f]"> we're building the operating system for affordable housing</span>
        </p>
      </motion.div>
    </div>
  );
}
