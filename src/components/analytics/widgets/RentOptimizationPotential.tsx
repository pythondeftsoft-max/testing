import React from 'react';
import { DollarSign } from 'lucide-react';
import ModernAnalyticsCard from '@/components/analytics/ModernAnalyticsCard';

interface RentOptimizationPotentialProps {
  landlordId: string;
  portfolioId?: string;
}

export const RentOptimizationPotential: React.FC<RentOptimizationPotentialProps> = ({
  landlordId,
  portfolioId
}) => {
  // Mock data for rent optimization potential
  const optimizationPotential = 2850; // Monthly potential in dollars

  return (
    <ModernAnalyticsCard
      title="Rent Optimization"
      value={optimizationPotential}
      subtitle="Monthly optimization potential"
      icon={DollarSign}
      formatValue="currency"
      className="h-[150px]"
    />
  );
};