import React, { createContext, useContext, useEffect } from 'react';
import { useAdvancedHealthStore } from '@/stores/advancedHealthStore';

interface PortfolioHealthProviderProps {
  children: React.ReactNode;
}

const PortfolioHealthContext = createContext<null>(null);

export const PortfolioHealthProvider: React.FC<PortfolioHealthProviderProps> = ({ children }) => {
  const { initializeRealTimeStreams, disconnectStreams } = useAdvancedHealthStore();

  // Initialize real-time streams
  useEffect(() => {
    // Auto-initialize with demo portfolio
    initializeRealTimeStreams('demo-portfolio-123');

    return () => {
      disconnectStreams();
    };
  }, [initializeRealTimeStreams, disconnectStreams]);

  return (
    <PortfolioHealthContext.Provider value={null}>
      {children}
    </PortfolioHealthContext.Provider>
  );
};

export const usePortfolioHealthContext = () => {
  const context = useContext(PortfolioHealthContext);
  return context;
};