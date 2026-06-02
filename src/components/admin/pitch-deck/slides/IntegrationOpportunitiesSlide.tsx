import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Building2, Landmark, FileCheck } from 'lucide-react';

export function IntegrationOpportunitiesSlide() {
  const integrations = [
    {
      icon: Briefcase,
      title: 'Job Boards & Workforce Platforms',
      description: 'Connect housing workers with opportunities across the ecosystem',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      icon: Building2,
      title: 'Property Management Software',
      description: 'Sync with existing PM tools landlords already use',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      icon: Landmark,
      title: 'Housing Programs & Authorities',
      description: 'Direct connections to voucher and subsidy programs',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      icon: FileCheck,
      title: 'Financial & Compliance Tools',
      description: 'Integrate with accounting, tax, and compliance systems',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
  ];

  return (
    <div className="h-full px-8 py-10 flex flex-col">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-4"
      >
        Integration Opportunities
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-xl text-gray-500 text-center mb-10"
      >
        Potential platform connections as we scale
      </motion.p>

      <div className="flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {integrations.map((integration, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className={`${integration.bgColor} ${integration.borderColor} border-2 border-dashed rounded-2xl p-6`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-white shadow-sm`}>
                  <integration.icon className={`w-6 h-6 ${integration.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1e3a5f] mb-1">
                    {integration.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {integration.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-10 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl px-8 py-5 max-w-2xl mx-auto text-center border border-gray-200"
        >
          <p className="text-gray-600 text-lg">
            Built to <span className="font-bold text-[#1e3a5f]">expand</span> — not built to lock in.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
