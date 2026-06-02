import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Award, DollarSign, Star } from 'lucide-react';

export function EarlyPartnerBenefitsSlide() {
  const benefits = [
    {
      icon: TrendingUp,
      title: 'Revenue Participation',
      description: 'Aligned to audience size and contribution',
    },
    {
      icon: Zap,
      title: 'Priority Product Access',
      description: 'Features and roadmap input before public release',
    },
    {
      icon: Award,
      title: 'Platform Partner Status',
      description: 'Early positioning as a partner, not a promoter',
    },
    {
      icon: DollarSign,
      title: 'Backend Income Opportunity',
      description: 'Beyond ads, affiliates, or courses',
    },
    {
      icon: Star,
      title: 'Optional Future Equity',
      description: 'Participation available, not required upfront',
    },
  ];

  return (
    <div className="h-full px-8 py-12 flex flex-col">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-12"
      >
        What Early Partners Get
      </motion.h2>

      <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-[#d4af37]/10 to-[#d4af37]/5 border border-[#d4af37]/20 rounded-2xl p-8"
        >
          <div className="space-y-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-[#d4af37]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1e3a5f]">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center text-gray-500 text-sm mt-8"
        >
          Designed for long-term alignment, not short-term promotion.
        </motion.p>
      </div>
    </div>
  );
}
