import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, Calculator, BarChart3, Layers, AlertTriangle } from 'lucide-react';

export function ProblemSlide() {
  const currentReality = [
    { icon: Lock, text: 'Different PM = Different login' },
    { icon: Layers, text: 'Different region = Separate account' },
    { icon: Eye, text: 'Same platform, still fragmented' },
  ];

  const theResult = [
    { icon: Eye, text: 'No unified view of all properties' },
    { icon: Calculator, text: 'Manual HAP vs tenant tracking' },
    { icon: BarChart3, text: 'No cross-portfolio analytics' },
    { icon: AlertTriangle, text: '"Which properties are profitable?"' },
  ];

  return (
    <div className="h-full px-8 py-12 flex flex-col">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-4"
      >
        The Problem
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-xl text-gray-600 text-center mb-10 max-w-3xl mx-auto"
      >
        Landlords with multiple properties or PMs are stuck in chaos
      </motion.p>

      <div className="flex-1 flex flex-col justify-center">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Current Reality */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-red-50 rounded-2xl p-8 border border-red-100"
        >
          <h3 className="text-2xl font-semibold text-red-800 mb-6 flex items-center gap-2">
            <span className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              🔐
            </span>
            Current Reality
          </h3>
          <ul className="space-y-4">
            {currentReality.map((item, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-4 text-lg text-red-700"
              >
                <item.icon className="w-6 h-6 flex-shrink-0" />
                <span>{item.text}</span>
              </motion.li>
            ))}
          </ul>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-sm text-red-600 italic border-t border-red-200 pt-4"
          >
            Even the same management platform requires separate logins for different regions
          </motion.p>
        </motion.div>

        {/* The Result */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-orange-50 rounded-2xl p-8 border border-orange-100"
        >
          <h3 className="text-2xl font-semibold text-orange-800 mb-6 flex items-center gap-2">
            <span className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              ⚠️
            </span>
            The Result
          </h3>
          <ul className="space-y-4">
            {theResult.map((item, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-center gap-4 text-lg text-orange-700"
              >
                <item.icon className="w-6 h-6 flex-shrink-0" />
                <span>{item.text}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="text-center text-xl text-gray-600 mt-10 max-w-3xl mx-auto"
      >
        The affordable housing PM space is <span className="font-bold text-[#1e3a5f]">fragmented</span> — 
        no platform gives landlords a <span className="font-bold text-[#d4af37]">complete picture</span>.
      </motion.p>
    </div>
  );
}
