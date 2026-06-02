import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export function WhatThisIsNotSlide() {
  const notItems = [
    'Not asking for upfront capital',
    'Not selling sponsorships or promotions',
    'Not a course, mastermind, or paid group',
    'No obligation to post or promote',
  ];

  return (
    <div className="h-full px-8 py-12 flex flex-col">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-12"
      >
        What This Is Not
      </motion.h2>

      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
        >
          <div className="space-y-5">
            {notItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <X className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-lg text-gray-700">
                  {item}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 bg-[#1e3a5f] rounded-xl p-6 text-center"
        >
          <p className="text-white text-lg">
            We're selectively aligning with operators who want long-term participation.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
