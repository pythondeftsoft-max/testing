import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Plug, Network } from 'lucide-react';

export function InfrastructureSlide() {
  const pillars = [
    {
      icon: Layers,
      title: 'Consolidation, Not Replacement',
      description: 'We unify scattered tools and logins — not replace people or companies',
    },
    {
      icon: Plug,
      title: 'Integration-First Architecture',
      description: 'Built to work with existing PM software, not against it',
    },
    {
      icon: Network,
      title: 'Execution Layer',
      description: 'The infrastructure that makes housing operations actually work together',
    },
  ];

  return (
    <div className="h-full px-8 py-10 flex flex-col">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-4"
      >
        From Platform → Infrastructure
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-xl text-gray-600 text-center mb-10 max-w-3xl mx-auto"
      >
        OpenKey consolidates fragmented housing workflows into a single execution layer.
      </motion.p>

      <div className="flex-1 flex flex-col justify-center">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pillars.map((pillar, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.15 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center mb-4">
                <pillar.icon className="w-8 h-8 text-[#d4af37]" />
              </div>
              <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">
                {pillar.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-10 bg-gray-100 rounded-xl px-8 py-5 max-w-3xl mx-auto text-center"
        >
          <p className="text-gray-700 text-lg">
            We're building the <span className="font-bold text-[#1e3a5f]">connective tissue</span> — not competing with existing players.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
