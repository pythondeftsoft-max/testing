import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Users, Building2, TrendingUp } from 'lucide-react';

export function MarketSlide() {
  return (
    <div className="h-full px-8 py-10 flex flex-col">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-2"
      >
        Market Opportunity
      </motion.h2>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-lg text-gray-500 text-center mb-10"
      >
        Market context - execution comes first
      </motion.p>

      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
        {/* Compact Market Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-8"
        >
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="border-r border-gray-100">
              <p className="text-2xl font-bold text-blue-600">$300B+</p>
              <p className="text-sm text-gray-600">Total Market</p>
            </div>
            <div className="border-r border-gray-100">
              <p className="text-2xl font-bold text-green-600">$50B</p>
              <p className="text-sm text-gray-600">Affordable Housing</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#d4af37]">$1B</p>
              <p className="text-sm text-gray-600">5yr Target</p>
            </div>
          </div>
        </motion.div>

        {/* Key Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-xl font-bold text-[#1e3a5f]">2.3M+</p>
            <p className="text-xs text-gray-600">Voucher Holders</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
            <Building2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-xl font-bold text-[#1e3a5f]">500K+</p>
            <p className="text-xs text-gray-600">Participating Landlords</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
            <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-xl font-bold text-[#1e3a5f]">300K+</p>
            <p className="text-xs text-gray-600">New Vouchers/Year</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
            <Globe className="w-6 h-6 text-[#d4af37] mx-auto mb-2" />
            <p className="text-xl font-bold text-[#1e3a5f]">250K</p>
            <p className="text-xs text-gray-600">Annual Movers</p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-gray-500 text-sm mt-8"
        >
          Large, growing, and underserved - but execution is everything.
        </motion.p>
      </div>
    </div>
  );
}
