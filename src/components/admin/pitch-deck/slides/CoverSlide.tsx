import React from 'react';
import { motion } from 'framer-motion';

export function CoverSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h1 className="text-6xl md:text-7xl font-bold mb-4">
          <span className="text-[#1e3a5f]">Open</span>
          <span className="text-[#d4af37]">Key</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 italic">
          Connecting Communities, Unlocking Opportunities
        </p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-4"
      >
        <h2 className="text-3xl md:text-4xl font-semibold text-[#1e3a5f]">
          Strategic Partner Deck
        </h2>
        <p className="text-lg text-gray-500">Early Partner Overview</p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-sm text-gray-400"
      >
        Press → or Space to continue
      </motion.div>
    </div>
  );
}
