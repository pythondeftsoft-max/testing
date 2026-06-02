import { Building2, Clock, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import PortfolioSelectorDropdown from '@/components/PortfolioSelectorDropdown';

interface AssetsFilterBarProps {
  portfolioId: string;
  onPortfolioChange: (portfolioId: string) => void;
  timeframe: '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all';
  onTimeframeChange: (timeframe: '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all') => void;
  userId: string;
  portfolioName?: string;
}

export const AssetsFilterBar = ({
  portfolioId,
  onPortfolioChange,
  timeframe,
  onTimeframeChange,
  userId,
  portfolioName,
}: AssetsFilterBarProps) => {
  const isLocked = portfolioId !== 'everything';

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Portfolio Filter */}
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              Portfolio
              {isLocked && <Lock className="h-3 w-3" />}
            </label>
            {isLocked ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-9 px-3 rounded-md border border-border bg-muted/50 flex items-center text-sm text-muted-foreground cursor-not-allowed">
                      {portfolioName || 'Current Portfolio'}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Navigate to "Everything" to change portfolio</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <PortfolioSelectorDropdown
                selectedPortfolio={portfolioId}
                onPortfolioChange={onPortfolioChange}
                userId={userId}
                disableInternalNavigation={false}
              />
            )}
          </div>

          {/* Timeframe Filter */}
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Timeframe
            </label>
            <Select value={timeframe} onValueChange={onTimeframeChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">3 Months</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
