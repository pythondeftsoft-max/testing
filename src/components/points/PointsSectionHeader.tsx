
import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Award, TrendingUp, Gift } from 'lucide-react';

interface PointsSectionHeaderProps {
  title: string;
  description: string;
}

export const PointsSectionHeader: React.FC<PointsSectionHeaderProps> = ({
  title,
  description
}) => {
  return (
    <div className="flex items-center justify-between mb-8 animate-fade-in-up">
      <div className="flex items-center gap-6">
        <div className="p-4 rounded-xl bg-gradient-blue-gold shadow-lg card-hover">
          <Award className="h-10 w-10 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gradient-blue-gold mb-2">{title}</h1>
          <p className="text-muted-foreground text-lg">{description}</p>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
          <TrendingUp className="h-4 w-4 text-success" />
          <span className="text-sm font-medium text-success">Growing</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-openkey-gold/10 border border-openkey-gold/20">
          <Gift className="h-4 w-4 text-openkey-gold" />
          <span className="text-sm font-medium text-openkey-gold">Rewards Active</span>
        </div>
      </div>
    </div>
  );
};
