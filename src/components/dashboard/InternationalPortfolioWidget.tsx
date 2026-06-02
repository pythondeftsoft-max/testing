import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import InternationalPortfolioSummary from '@/components/analytics/InternationalPortfolioSummary';
import { Button } from '@/components/ui/button';
import { Globe, TrendingUp, DollarSign, Building } from 'lucide-react';

// Mock portfolio data
const mockPortfolioData = {
  totalValue: 2500000,
  monthlyIncome: 15000,
  propertyCount: 8,
  averageValue: 312500,
  currency: 'USD' as const,
  countryCode: 'US'
};

export const InternationalPortfolioWidget: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                International Portfolio
              </CardTitle>
              <CardDescription>
                Your global real estate investments with automatic currency conversion
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Portfolio Summary */}
      <InternationalPortfolioSummary 
        portfolioData={mockPortfolioData}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="flex items-center gap-2 h-auto py-3">
              <Building className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Browse Properties</div>
                <div className="text-xs text-muted-foreground">Search internationally</div>
              </div>
            </Button>
            <Button variant="outline" className="flex items-center gap-2 h-auto py-3">
              <DollarSign className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Currency Settings</div>
                <div className="text-xs text-muted-foreground">Change preferences</div>
              </div>
            </Button>
            <Button variant="outline" className="flex items-center gap-2 h-auto py-3">
              <TrendingUp className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Market Analysis</div>
                <div className="text-xs text-muted-foreground">View trends</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};