
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import PointsTab from './PointsTab';
import UnifiedPointsSummary from './points/UnifiedPointsSummary';
import { AlertCircle, Award, TrendingUp, Gift } from 'lucide-react';
import { CardEnhanced, CardEnhancedContent } from './enhanced/CardEnhanced';

interface LandlordPointsSectionProps {
  userId: string;
}

const LandlordPointsSection = ({ userId }: LandlordPointsSectionProps) => {
  const [searchParams] = useSearchParams();
  const portfolioId = searchParams.get('portfolioId') || undefined;
  
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Gradient Hero Section */}
      <div className="bg-gradient-blue-gold text-white relative overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <Award className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  My Rewards
                </h1>
                <p className="text-white/90 text-lg">
                  Track your points and rewards across portfolio management and referrals
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/20 backdrop-blur-sm">
                <TrendingUp className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">Growing</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/20 backdrop-blur-sm">
                <Gift className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">Rewards Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <UnifiedPointsSummary userId={userId} portfolioId={portfolioId} />
      
      <PointsTab userId={userId} spendLocked={false} />
    </div>
  );
};

export default LandlordPointsSection;
