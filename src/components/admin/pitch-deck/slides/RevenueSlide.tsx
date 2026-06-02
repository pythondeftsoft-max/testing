import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, DollarSign, TrendingUp, Building2 } from 'lucide-react';

export function RevenueSlide() {
  const revenueStreams = [
    {
      icon: CreditCard,
      title: 'Landlord Subscriptions',
      description: 'Monthly per-unit pricing for property management',
      percentage: 50,
      examples: ['$8/unit/month', 'Volume discounts available', 'Enterprise custom pricing'],
    },
    {
      icon: DollarSign,
      title: 'Placement Fees',
      description: 'Success-based fee on completed housing placements',
      percentage: 50,
      examples: ['40% of first month\'s rent', 'Paid by landlord', 'Only on successful matches'],
    },
  ];

  return (
    <div className="min-h-[500px] h-full px-8 py-8">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-3"
        style={{ opacity: 1, transform: 'none' }}
      >
        Revenue Model
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-xl text-gray-600 text-center mb-8"
        style={{ opacity: 1 }}
      >
        Recurring + transaction-based revenue
      </motion.p>

      {/* Force 2-column grid with inline style for print */}
      <div 
        className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
      >
        {revenueStreams.map((stream, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.15 }}
            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            style={{ opacity: 1, transform: 'none' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
                <stream.icon 
                  className="w-6 h-6 text-[#d4af37]" 
                  style={{ width: '24px', height: '24px' }} 
                />
              </div>
              <div className="text-2xl font-bold text-[#d4af37]">{stream.percentage}%</div>
            </div>
            <h3 className="text-xl font-semibold text-[#1e3a5f] mb-2">{stream.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{stream.description}</p>
            <ul className="space-y-1">
              {stream.examples.map((example, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full" />
                  {example}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-6 flex items-center justify-center gap-10 text-center"
        style={{ opacity: 1, transform: 'none', display: 'flex', flexDirection: 'row' }}
      >
        <div>
          <TrendingUp 
            className="w-7 h-7 text-green-500 mx-auto mb-1" 
            style={{ width: '28px', height: '28px' }} 
          />
          <p className="text-gray-600">
            <span className="font-bold text-xl text-green-600">85%</span>
          </p>
          <p className="text-xs text-gray-500">Gross Margins</p>
        </div>
        <div className="w-px h-12 bg-gray-200" />
        <div>
          <Building2 
            className="w-7 h-7 text-[#1e3a5f] mx-auto mb-1" 
            style={{ width: '28px', height: '28px' }} 
          />
          <p className="text-gray-600">
            <span className="font-bold text-xl text-[#1e3a5f]">$96/yr</span>
          </p>
          <p className="text-xs text-gray-500">Per Unit Revenue</p>
        </div>
        <div className="w-px h-12 bg-gray-200" />
        <div>
          <DollarSign 
            className="w-7 h-7 text-[#d4af37] mx-auto mb-1" 
            style={{ width: '28px', height: '28px' }} 
          />
          <p className="text-gray-600">
            <span className="font-bold text-xl text-[#d4af37]">~$500</span>
          </p>
          <p className="text-xs text-gray-500">Avg Placement Fee</p>
        </div>
      </motion.div>
    </div>
  );
}
