
import React from 'react';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Settings, Trash2, Home, TrendingUp, DollarSign, CheckCircle, Crown, Users } from 'lucide-react';
import { usePortfolioMetrics } from '@/hooks/usePortfolioMetrics';
import { useAccountRoles } from '@/hooks/useAccountRoles';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface PortfolioCardProps {
  portfolio: {
    id: string;
    client_name: string;
    client_email?: string;
    user_role?: string;
  };
  iconData: {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  };
  onSelect: (portfolioId: string) => void;
  onSettings: (portfolioId: string) => void;
  onDelete: (portfolio: any) => void;
  isFirstCard?: boolean;
}

const PortfolioCard = ({ portfolio, iconData, onSelect, onSettings, onDelete, isFirstCard = false }: PortfolioCardProps) => {
  const { data: metrics, isLoading, error } = usePortfolioMetrics(portfolio.id);
  const IconComponent = iconData.icon;
  const { highestAccountRole } = useAccountRoles();
  const displayRole = (highestAccountRole === 'owner' ? 'owner' : (portfolio.user_role || ''));

  const handleCardClick = () => {
    onSelect(portfolio.id);
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const isAdmin = ['owner', 'admin_partner', 'portfolio_owner', 'admin'].includes(displayRole);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
      case 'admin_partner':
      case 'portfolio_owner':
        return <Crown className="w-3 h-3 mr-1" />;
      case 'admin':
        return <CheckCircle className="w-3 h-3 mr-1" />;
      default:
        return <Users className="w-3 h-3 mr-1" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
      case 'admin_partner':
      case 'portfolio_owner':
        return 'warning';
      case 'admin':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const cardContent = (
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
            <div className={cn(
              "p-3 text-white rounded-lg shadow-sm bg-gradient-to-r",
              iconData.color
            )}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{portfolio.client_name}</h3>
              <p className="text-3xl font-bold text-openkey-blue">{metrics?.unit_count || 0}</p>
            </div>
          </div>
          <Badge variant={getRoleBadgeVariant(displayRole)}>
            {getRoleIcon(displayRole)}
            {(displayRole || 'member').replace('_', ' ')}
          </Badge>
        </div>

        {/* Metrics */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Units</span>
            </div>
            <span className="font-semibold text-openkey-blue">
              {isLoading ? 'Loading...' : `${metrics?.unit_count || 0}`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Occupancy</span>
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
            onClick={(e) => handleActionClick(e, () => onSelect(portfolio.id))}
            className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          {isAdmin && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => handleActionClick(e, () => onSettings(portfolio.id))}
                className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
                aria-label="Portfolio settings"
                data-tour="portfolio-settings-btn"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
                onClick={(e) => handleActionClick(e, () => onDelete(portfolio))}
                aria-label="Delete portfolio"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );

  // Wrap first card with data-tour attribute for product tour
  if (isFirstCard) {
    return <div data-tour="portfolio-card">{cardContent}</div>;
  }

  return cardContent;
};

export default PortfolioCard;
