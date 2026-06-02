import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, Building, MapPin, ArrowRight } from 'lucide-react';

export function PlatformAdvantageSlide() {
  const traditionalIssues = [
    { icon: Lock, location: 'Dallas Properties', pm: 'PM Company A' },
    { icon: Lock, location: 'Houston Properties', pm: 'PM Company B' },
    { icon: Lock, location: 'Austin Properties', pm: 'PM Company C' },
  ];

  return (
    <div className="h-full px-8 py-6 flex flex-col overflow-hidden" style={{ maxHeight: '167mm' }}>
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-[#1e3a5f] text-center mb-2"
      >
        One Account. Every Property.
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-xl text-gray-600 text-center mb-6"
      >
        Unlike other platforms where landlords need separate logins for each PM or region
      </motion.p>

      <div className="flex-1 flex flex-col justify-center">
        <div 
          className="max-w-5xl mx-auto grid gap-6 items-center"
          style={{ gridTemplateColumns: '1fr auto 1fr' }}
        >
        {/* Traditional Platforms */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-red-50 rounded-2xl p-6 border-2 border-red-200 min-w-[280px]"
        >
          <h3 className="text-lg font-semibold text-red-700 mb-4 text-center">Traditional Platforms</h3>
          <div className="space-y-3">
            {traditionalIssues.map((issue, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm"
              >
                <Lock className="w-5 h-5 text-red-500" style={{ width: 20, height: 20 }} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{issue.location}</p>
                  <p className="text-xs text-gray-500">{issue.pm}</p>
                </div>
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Separate Login</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 text-center space-y-1">
            <p className="text-2xl font-bold text-red-600">3 Logins</p>
            <p className="text-sm text-red-600">3 Dashboards • No Unified View</p>
          </div>
        </motion.div>

        {/* Arrow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-2"
        >
          <ArrowRight className="w-10 h-10 text-[#d4af37]" style={{ width: 40, height: 40 }} />
          <span className="text-sm font-medium text-[#d4af37]">vs</span>
        </motion.div>

        {/* OpenKey Solution */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] rounded-2xl p-6 text-white min-w-[280px]"
        >
          <h3 className="text-lg font-semibold text-[#d4af37] mb-4 text-center">OpenKey "Everything" View</h3>
          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Eye className="w-6 h-6 text-[#d4af37]" style={{ width: 24, height: 24 }} />
              <span className="text-lg font-semibold">Unified Dashboard</span>
            </div>
            <div className="space-y-2">
              {['Dallas (PM-A)', 'Houston (PM-B)', 'Austin (PM-C)'].map((location, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="bg-white/10 rounded-lg px-3 py-2 flex items-center gap-2"
                >
                  <Building className="w-4 h-4 text-[#d4af37]" style={{ width: 16, height: 16 }} />
                  <span className="text-sm">{location}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-[#d4af37]">1 Login</p>
            <p className="text-sm text-gray-300">Complete Portfolio View</p>
          </div>
        </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mt-4 text-center max-w-3xl mx-auto"
      >
        <div className="inline-flex items-center gap-3 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full px-6 py-2">
          <MapPin className="w-5 h-5 text-[#d4af37]" style={{ width: 20, height: 20 }} />
          <p className="text-gray-700">
            <span className="font-bold text-[#1e3a5f]">No other platform</span> lets landlords see properties 
            across multiple PMs in a single unified dashboard
          </p>
        </div>
      </motion.div>
    </div>
  );
}
