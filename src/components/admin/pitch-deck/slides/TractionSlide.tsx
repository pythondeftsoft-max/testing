import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Landmark, Receipt, Wallet } from 'lucide-react';

export function TractionSlide() {
  const expansionLayers = [
    {
      icon: CreditCard,
      title: 'Payment Processing',
      description: 'Rent collection and HAP payment tracking integrated into the platform',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Landmark,
      title: 'Banking Integration',
      description: 'Direct deposit and automated reconciliation with housing authorities',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Receipt,
      title: 'Invoice Management',
      description: 'Automated billing cycles and payment reminders',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: Wallet,
      title: 'Financial Services',
      description: 'Embedded lending and insurance products for landlords',
      color: 'text-[#d4af37]',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <div className="h-full px-8 py-12 flex flex-col">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-4"
      >
        Expansion Layers
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-xl text-gray-500 text-center mb-12"
      >
        Post-Launch Revenue Opportunities
      </motion.p>

      <div className="flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {expansionLayers.map((layer, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className={`${layer.bgColor} rounded-2xl p-6 border border-gray-100 shadow-sm`}
            >
              <layer.icon className={`w-10 h-10 ${layer.color} mb-4`} />
              <h3 className="text-xl font-semibold text-[#1e3a5f] mb-2">
                {layer.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {layer.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-10 bg-[#1e3a5f] rounded-2xl p-6 max-w-3xl mx-auto text-center"
        >
          <p className="text-white text-lg">
            Platform-native payments create <span className="text-[#d4af37] font-bold">high-margin recurring revenue</span> once core adoption is established.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
