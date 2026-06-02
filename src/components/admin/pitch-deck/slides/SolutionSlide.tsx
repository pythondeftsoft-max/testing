import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Users, Building2, CreditCard, BarChart3, Landmark, Eye, Zap } from 'lucide-react';

export function SolutionSlide() {
  return (
    <div className="h-full px-4 py-4 flex flex-col">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-4"
      >
        The Solution
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-xl text-gray-600 text-center mb-4 max-w-3xl mx-auto"
      >
        OpenKey: The Complete Platform for Affordable Housing
      </motion.p>

      <div className="grid md:grid-cols-2 gap-6 w-full">
        {/* Unified Portfolio Management */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-8 h-8 text-[#d4af37]" />
            <h3 className="text-2xl font-bold">Unified Portfolio Management</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-[#d4af37] flex-shrink-0" />
              <span>One login for ALL your properties</span>
            </li>
            <li className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-[#d4af37] flex-shrink-0" />
              <span>Works across multiple PMs</span>
            </li>
            <li className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-[#d4af37] flex-shrink-0" />
              <span>Single "Everything" dashboard</span>
            </li>
            <li className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-[#d4af37] flex-shrink-0" />
              <span>Complete financial visibility</span>
            </li>
          </ul>
        </motion.div>

        {/* Smart Tenant Matching */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-[#d4af37] to-[#c4a030] rounded-2xl p-6 text-[#1e3a5f]"
        >
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8" />
            <h3 className="text-2xl font-bold">Smart Tenant Matching</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              <span>AI + team reviewed matching</span>
            </li>
            <li className="flex items-center gap-3">
              <Users className="w-5 h-5 flex-shrink-0" />
              <span>Pre-screened voucher holders</span>
            </li>
            <li className="flex items-center gap-3">
              <Zap className="w-5 h-5 flex-shrink-0" />
              <span>Push properties to tenants</span>
            </li>
            <li className="flex items-center gap-3">
              <Building2 className="w-5 h-5 flex-shrink-0" />
              <span>Faster fills, less vacancy</span>
            </li>
          </ul>
        </motion.div>
      </div>

      {/* Powered By Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-4 max-w-4xl mx-auto"
      >
        <div className="bg-gray-100 rounded-xl px-6 py-4">
          <p className="text-center text-sm text-gray-500 mb-3">Powered by</p>
          <div className="flex flex-wrap justify-center items-center gap-6">
            <div className="flex items-center gap-2 text-gray-700">
              <CreditCard className="w-4 h-4 text-[#635bff]" />
              <span className="text-sm font-medium">Stripe Payments</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-2 text-gray-700">
              <Landmark className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Plaid Tracking</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-2 text-gray-700">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">HAP Separation</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-2 text-gray-700">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Portfolio Analytics</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center mt-4"
      >
        <p className="text-lg text-gray-600">
          One platform. <span className="font-bold text-[#1e3a5f]">See everything.</span>{' '}
          <span className="font-bold text-[#d4af37]">Match tenants.</span>{' '}
          <span className="font-bold text-green-600">Get paid.</span>
        </p>
      </motion.div>
    </div>
  );
}
