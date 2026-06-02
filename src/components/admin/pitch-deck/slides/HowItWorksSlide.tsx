import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Sparkles, ClipboardCheck, Key } from 'lucide-react';

export function HowItWorksSlide() {
  const steps = [
    {
      icon: UserPlus,
      title: 'Create Profile',
      description: 'Tenant enters voucher details and preferences',
      color: 'bg-blue-500',
    },
    {
      icon: Sparkles,
      title: 'AI + Team Matching',
      description: 'AI finds matches, team reviews for quality',
      color: 'bg-purple-500',
    },
    {
      icon: ClipboardCheck,
      title: 'Review & Apply',
      description: 'Landlord reviews pre-screened applicants',
      color: 'bg-green-500',
    },
    {
      icon: Key,
      title: 'Move In',
      description: 'Lease signed, everyone wins',
      color: 'bg-[#d4af37]',
    },
  ];

  return (
    <div className="min-h-[500px] h-full px-8 py-10 flex flex-col">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-10"
      >
        How It Works
      </motion.h2>

      <div className="flex-1 flex flex-col justify-center">
        {/* Force row layout with inline style for print compatibility */}
        <div 
          className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 max-w-5xl mx-auto"
          style={{ flexDirection: 'row' }}
        >
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.15 }}
              className="flex flex-col items-center text-center"
              style={{ opacity: 1, transform: 'none' }}
            >
              <div 
                className={`${step.color} w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-3`}
              >
                <step.icon className="w-8 h-8 text-white" style={{ width: '32px', height: '32px' }} />
              </div>
              <div className="bg-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-[#1e3a5f] border-2 border-[#1e3a5f] -mt-5 mb-2 relative z-10 text-sm">
                {index + 1}
              </div>
              <h3 className="text-lg font-semibold text-[#1e3a5f] mb-1">
                {step.title}
              </h3>
              <p className="text-gray-600 text-sm max-w-[160px]">
                {step.description}
              </p>
            </motion.div>

            {index < steps.length - 1 && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.4 + index * 0.15 }}
                className="hidden md:block w-12 h-0.5 bg-gradient-to-r from-gray-300 to-gray-400"
                style={{ display: 'block', opacity: 1, transform: 'none' }}
              />
            )}
          </React.Fragment>
        ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-8 text-center"
        style={{ opacity: 1, transform: 'none' }}
      >
        <p className="text-lg text-gray-600">
          Average time from signup to housing: <span className="font-bold text-[#d4af37] text-xl">18 days</span>
        </p>
        <p className="text-sm text-gray-400 mt-1">vs. 60+ days industry average</p>
      </motion.div>
    </div>
  );
}
