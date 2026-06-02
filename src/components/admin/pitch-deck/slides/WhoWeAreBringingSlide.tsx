import React from 'react';
import { motion } from 'framer-motion';
import { Users, Building2, Home, GraduationCap } from 'lucide-react';

export function WhoWeAreBringingSlide() {
  const partnerTypes = [
    {
      icon: Users,
      title: 'Real Estate Creators',
      description: 'With landlord and investor audiences',
    },
    {
      icon: Building2,
      title: 'Buy & Hold Operators',
      description: 'Section 8-friendly landlords with active portfolios',
    },
    {
      icon: Home,
      title: 'Property Managers',
      description: 'Portfolio owners managing multiple properties',
    },
    {
      icon: GraduationCap,
      title: 'Trust-Based Educators',
      description: 'Community builders, not promo accounts',
    },
  ];

  return (
    <div className="min-h-[500px] h-full px-8 py-8 flex flex-col">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-3"
        style={{ opacity: 1, transform: 'none' }}
      >
        Who We're Bringing In Early
      </motion.h2>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl text-gray-600 text-center mb-8"
        style={{ opacity: 1 }}
      >
        Strategic partners who align with our mission
      </motion.p>

      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
        {/* Force 2-column grid with inline style for print */}
        <div 
          className="grid md:grid-cols-2 gap-5"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
        >
          {partnerTypes.map((partner, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-[#1e3a5f] rounded-2xl p-5 shadow-lg"
              style={{ opacity: 1, transform: 'none' }}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-[#d4af37]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <partner.icon 
                    className="w-5 h-5 text-[#d4af37]" 
                    style={{ width: '20px', height: '20px' }} 
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {partner.title}
                  </h3>
                  <p className="text-gray-300 text-sm">
                    {partner.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
          style={{ opacity: 1 }}
        >
          <p className="text-gray-500 text-sm italic">
            Limited to 2-5 partners for the initial rollout.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
