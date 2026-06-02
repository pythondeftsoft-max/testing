
import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Home, TrendingUp, DollarSign, Grid3X3, CheckCircle, Settings } from 'lucide-react';
import { usePortfolioMetrics } from '@/hooks/usePortfolioMetrics';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface EverythingCardProps {
  onSelect: (portfolioId: string) => void;
  onSettings: (portfolioId: string) => void;
}

const EverythingCard = ({ onSelect, onSettings }: EverythingCardProps) => {
  const { data: metrics, isLoading, error } = usePortfolioMetrics('everything');

  const handleCardClick = () => {
    onSelect('everything');
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div data-tour="everything-card">
      <CardEnhanced
        variant="elevated"
        hover={true}
        animate={true}
        className="card-hover-gold cursor-pointer transition-all duration-300 hover:scale-105"
        onClick={handleCardClick}
      >
      <CardEnhancedContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-openkey-blue to-openkey-gold text-white rounded-lg shadow-sm">
              <Grid3X3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Portfolio Overview</h3>
              <p className="text-3xl font-bold text-openkey-blue">Everything</p>
            </div>
          </div>
          <Badge className="bg-openkey-blue text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            All Portfolios
          </Badge>
        </div>

        {/* Metrics */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Units</span>
            </div>
            <span className="font-semibold text-openkey-blue">
              {isLoading ? 'Loading...' : `${metrics?.unit_count || 0}`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Occupancy Rate</span>
            </div>
            <span className="font-semibold text-success">
              {formatPercentage(metrics?.occupancy_rate || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Monthly Rent</span>
            </div>
            <span className="font-semibold text-openkey-gold">
              {formatCurrency(metrics?.gross_monthly_rent || 0)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
        <Button 
            variant="outline"
            size="sm"
            onClick={(e) => handleActionClick(e, () => onSelect('everything'))}
            className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
            data-tour="everything-view-btn"
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => handleActionClick(e, () => onSettings('everything'))}
            className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
    </div>
  );
};

export default EverythingCard;
