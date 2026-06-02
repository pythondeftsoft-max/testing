import React from 'react';
import { motion } from 'framer-motion';

export function ProductScreenshotsSlide() {
  const screenshots = [
    {
      title: 'Portfolio Management',
      description: 'Everything view - all properties across portfolios',
      image: '/screenshots/portfolio-management.png?v=5',
    },
    {
      title: 'User Roles & Permissions',
      description: 'Enterprise-grade RBAC for team access control',
      image: '/screenshots/user-roles-permissions.png?v=9',
    },
    {
      title: 'Untagged Properties',
      description: 'Track which units need payment matching',
      image: '/screenshots/untagged-properties.png?v=7',
    },
    {
      title: 'Tagged & Tracked',
      description: 'Bank deposits matched to properties automatically',
      image: '/screenshots/tagged-tracked.png?v=5',
    },
  ];

  return (
    <div className="h-full px-4 py-1 flex flex-col" style={{ maxHeight: '167mm', overflow: 'hidden' }}>
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-bold text-[#1e3a5f] text-center mb-0"
      >
        Product Experience
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-[10px] text-gray-600 text-center mb-1"
      >
        Purpose-built for affordable housing management
      </motion.p>

      <div 
        className="flex-1 grid grid-cols-2 grid-rows-2 gap-2"
        style={{ maxHeight: 'calc(100% - 32px)' }}
      >
        {screenshots.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.08 }}
            className="flex flex-col"
          >
            {/* Screenshot Card */}
            <div className="flex-1 rounded-lg overflow-hidden shadow-md border border-gray-200 bg-white">
              <img 
                src={item.image} 
                alt={item.title}
                loading="eager"
                decoding="sync"
                onError={(e) => {
                  console.error('Failed to load screenshot:', item.image);
                  e.currentTarget.style.background = '#fee2e2';
                  e.currentTarget.style.border = '2px dashed #ef4444';
                }}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Caption */}
            <div className="text-center mt-0.5">
              <h3 className="text-[10px] font-semibold text-[#1e3a5f] leading-none">{item.title}</h3>
              <p className="text-[9px] text-gray-500 leading-tight">{item.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
