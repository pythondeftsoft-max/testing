import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Minus } from 'lucide-react';

export function CompetitiveSlide() {
  const features = [
    { name: 'Unified Multi-PM View', openkey: true, zillow: false, traditional: false, pmSoftware: false },
    { name: 'Cross-Region Single Account', openkey: true, zillow: false, traditional: false, pmSoftware: 'partial' },
    { name: 'AI-Powered Matching', openkey: true, zillow: false, traditional: false, pmSoftware: false },
    { name: 'Section 8 Specialization', openkey: true, zillow: false, traditional: 'partial', pmSoftware: 'partial' },
    { name: 'HAP/Tenant Portion Tracking', openkey: true, zillow: false, traditional: 'partial', pmSoftware: 'partial' },
    { name: 'Stripe In-App Payments', openkey: true, zillow: false, traditional: false, pmSoftware: true },
    { name: 'Plaid Bank Auto-Tagging', openkey: true, zillow: false, traditional: false, pmSoftware: 'partial' },
    { name: 'Two-Sided Marketplace', openkey: true, zillow: true, traditional: false, pmSoftware: false },
    { name: 'Tenant Rewards Program', openkey: true, zillow: false, traditional: false, pmSoftware: false },
    { name: 'Mobile-First Experience', openkey: true, zillow: true, traditional: false, pmSoftware: 'partial' },
  ];

  const renderStatus = (status: boolean | string) => {
    if (status === true) return <Check className="w-5 h-5 text-green-500" style={{ width: 20, height: 20 }} />;
    if (status === false) return <X className="w-5 h-5 text-red-400" style={{ width: 20, height: 20 }} />;
    return <Minus className="w-5 h-5 text-yellow-500" style={{ width: 20, height: 20 }} />;
  };

  return (
    <div className="h-full px-6 py-8 flex flex-col overflow-hidden" style={{ maxHeight: '167mm' }}>
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl md:text-4xl font-bold text-[#1e3a5f] text-center mb-6"
      >
        Competitive Landscape
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full"
      >
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Feature</th>
                <th className="px-3 py-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-[#1e3a5f]">Open</span>
                    <span className="text-sm font-bold text-[#d4af37]">Key</span>
                  </div>
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">
                  Zillow
                  <span className="block text-[10px] text-gray-400">Apartments.com</span>
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">
                  Traditional PM
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">
                  PM Software
                  <span className="block text-[10px] text-gray-400">Buildium/DoorLoop/Arthur</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="border-t border-gray-100"
                >
                  <td className="px-3 py-2 text-xs text-gray-700">{feature.name}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center">{renderStatus(feature.openkey)}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center">{renderStatus(feature.zillow)}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center">{renderStatus(feature.traditional)}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center">{renderStatus(feature.pmSoftware)}</div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-gray-600 mt-4 text-sm"
        >
          OpenKey is the <span className="font-bold text-[#1e3a5f]">only platform</span> purpose-built for Section 8 housing
        </motion.p>
      </motion.div>
    </div>
  );
}
