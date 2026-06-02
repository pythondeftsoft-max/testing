import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, CreditCard, Building2, ArrowRight, Percent } from 'lucide-react';

export function GrowthSlide() {
  return (
    <div className="h-full px-8 py-6 flex flex-col overflow-hidden" style={{ maxHeight: '167mm' }}>
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-3"
      >
        Payment Processing Opportunity
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-xl text-gray-600 text-center mb-5"
      >
        Global rent market: $2.9T in 2025 → $3.9T by 2029
      </motion.p>

      <div className="flex-1 grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Current Model with Stripe */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1e3a5f]">Current: With Stripe</h3>
              <p className="text-sm text-gray-500">Payment processing partner</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Our Fee</span>
              <span className="font-bold text-purple-600">0.5%</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Stripe Takes</span>
              <span className="font-bold text-gray-400">2.9% + 30¢</span>
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">1% of global rent market ($2.9T)</p>
            <p className="text-2xl font-bold text-purple-600">$145M Revenue</p>
            <p className="text-xs text-gray-500">at 0.5% fee ($29B × 0.005)</p>
          </div>
        </motion.div>

        {/* Future Model as Processor */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#d4af37] rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#1e3a5f]" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Future: As Processor</h3>
              <p className="text-sm text-gray-300">Direct payment processing</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between py-2 border-b border-white/20">
              <span className="text-gray-300">Card Payments</span>
              <span className="font-bold text-[#d4af37]">2.3%</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/20">
              <span className="text-gray-300">ACH Payments</span>
              <span className="font-bold text-[#d4af37]">0.7%</span>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-300 mb-1">1% of global rent market ($2.9T)</p>
            <p className="text-2xl font-bold text-[#d4af37]">$435M+ Revenue</p>
            <p className="text-xs text-gray-400">keep full fee, no middleman</p>
          </div>
        </motion.div>
      </div>

      {/* Growth Path */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 max-w-4xl mx-auto border border-green-200"
      >
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="text-center px-4">
            <Percent className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-sm text-gray-600">0.5% → 2.3%/0.7%</p>
            <p className="text-xs text-gray-500">Keep Full Fee</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 hidden md:block" />
          <div className="text-center px-4">
            <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-sm text-gray-600">3x+ Revenue</p>
            <p className="text-xs text-gray-500">Per Transaction</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 hidden md:block" />
          <div className="text-center px-4">
            <Building2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-sm text-gray-600">All Property Types</p>
            <p className="text-xs text-gray-500">Residential + Commercial</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
