import React from 'react';
import { motion } from 'framer-motion';
import { Target, Code, Users, Megaphone } from 'lucide-react';

export function AskSlide() {
  const useOfFunds = [
    { icon: Code, label: 'Product & Engineering', percentage: 40, color: 'bg-blue-500' },
    { icon: Users, label: 'Sales & Growth', percentage: 30, color: 'bg-green-500' },
    { icon: Megaphone, label: 'Marketing', percentage: 20, color: 'bg-purple-500' },
    { icon: Target, label: 'Operations', percentage: 10, color: 'bg-orange-500' },
  ];

  return (
    <div className="h-full px-8 py-12">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-12"
      >
        The Ask
      </motion.h2>

      <div className="max-w-4xl mx-auto">
        {/* Funding Amount */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] rounded-3xl p-10 text-center mb-10"
        >
          <p className="text-white text-xl mb-4">Raising</p>
          <p className="text-6xl font-bold text-[#d4af37] mb-4">$[X]M</p>
          <p className="text-white/80">Seed Round</p>
        </motion.div>

        {/* Use of Funds */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-8 shadow-lg"
        >
          <h3 className="text-xl font-semibold text-[#1e3a5f] mb-6 text-center">
            Use of Funds
          </h3>

          {/* Progress Bars */}
          <div className="space-y-4">
            {useOfFunds.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-sm font-bold text-[#1e3a5f]">{item.percentage}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                      className={`h-full ${item.color} rounded-full`}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-gray-500 text-sm mt-6"
        >
          * Update funding amount before presenting
        </motion.p>
      </div>
    </div>
  );
}
