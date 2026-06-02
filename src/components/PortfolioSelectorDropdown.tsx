
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Building2, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';


interface PortfolioSelectorDropdownProps {
  selectedPortfolio: string;
  onPortfolioChange: (portfolioId: string) => void;
  userId: string;
  disableInternalNavigation?: boolean;
  showBackButton?: boolean;
  excludeEverything?: boolean;
}

const PortfolioSelectorDropdown = ({ 
  selectedPortfolio, 
  onPortfolioChange, 
  userId,
  disableInternalNavigation = false,
  showBackButton = false,
  excludeEverything = false
}: PortfolioSelectorDropdownProps) => {
  const navigate = useNavigate();
  const { portfolios, loading, error, refetch } = useUserPortfolios(userId);

  const handlePortfolioChange = (value: string) => {
    onPortfolioChange(value);
    // Only navigate if internal navigation is enabled
    if (!disableInternalNavigation) {
      if (value === 'everything') {
        navigate('/dashboard');
      } else {
        navigate(`/dashboard?portfolioId=${value}`);
      }
    }
  };

  const getDisplayName = () => {
    if (!excludeEverything && selectedPortfolio === 'everything') return 'Everything';
    const portfolio = portfolios.find(p => p.id === selectedPortfolio);
    return portfolio?.client_name || 'Select a portfolio';
  };

  return (
    <div className="flex items-center gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/portfolio-select')}
            className="h-9 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden lg:inline">Choose Different Portfolio</span>
          </Button>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium hidden md:inline">Portfolio:</span>
        </div>
        <Select value={selectedPortfolio} onValueChange={handlePortfolioChange}>
          <SelectTrigger className="w-56 md:w-72 h-9 text-sm bg-background/50 border-border/50 hover:bg-background hover:border-border focus:ring-2 focus:ring-ring/50 transition-all duration-200 rounded-lg shadow-sm">
            <SelectValue>
              <span className="font-medium">
                {loading ? 'Loading...' : error ? 'Error loading' : getDisplayName()}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="z-50 bg-background border-border">
            {!excludeEverything && (
              <SelectItem value="everything">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  Everything
                </div>
              </SelectItem>
            )}
            {portfolios.map((portfolio) => (
              <SelectItem key={portfolio.id} value={portfolio.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                  {portfolio.client_name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Refresh Button */}
        {error && (
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            title="Refresh portfolios"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
    </div>
  );
};

export default PortfolioSelectorDropdown;
