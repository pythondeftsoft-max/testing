import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, TrendingUp, Target, Scale } from 'lucide-react';

export function PartnerEconomicsSlide() {
  const economics = [
    {
      icon: BarChart3,
      text: 'Revenue-based profit participation',
    },
    {
      icon: Users,
      text: 'Typical ranges depend on reach and involvement',
    },
    {
      icon: Target,
      text: 'Performance-aligned (not flat fees)',
    },
    {
      icon: TrendingUp,
      text: 'Applies to sourced or attributed growth',
    },
    {
      icon: Scale,
      text: 'Designed to scale fairly as OpenKey grows',
    },
  ];

  return (
    <div className="h-full px-8 py-12 flex flex-col">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-4"
      >
        Partner Economics
      </motion.h2>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl text-gray-500 text-center mb-12"
      >
        High-Level Overview
      </motion.p>

      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          {economics.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-gray-50 rounded-xl p-5 flex items-center gap-4 border border-gray-100"
            >
              <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-[#d4af37]" />
              </div>
              <p className="text-gray-700 text-lg">
                {item.text}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center text-gray-400 text-sm mt-10 italic"
        >
          Details shared during alignment conversations.
        </motion.p>
      </div>
    </div>
  );
}
