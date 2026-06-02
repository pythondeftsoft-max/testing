
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PortfolioPointsDistributionManager from './PortfolioPointsDistributionManager';
import PortfolioPointsOverview from './PortfolioPointsOverview';
import PortfolioPointsAnalytics from './PortfolioPointsAnalytics';
import PortfolioPointsNotifications from './PortfolioPointsNotifications';
import PortfolioAuditLog from './PortfolioAuditLog';

interface PortfolioPointsDistributionProps {
  portfolioId: string;
  currentUserId: string;
}

const PortfolioPointsDistribution = ({ portfolioId, currentUserId }: PortfolioPointsDistributionProps) => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className={`grid w-full ${portfolioId === 'everything' ? 'grid-cols-3' : 'grid-cols-4'} bg-card/80 backdrop-blur-sm border border-openkey-blue/20 rounded-xl shadow-lg p-1 h-14`}>
          <TabsTrigger 
            value="overview" 
            className="flex items-center gap-2 data-[state=active]:bg-openkey-blue data-[state=active]:text-white rounded-lg transition-all h-12 text-sm font-medium"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="flex items-center gap-2 data-[state=active]:bg-openkey-blue data-[state=active]:text-white rounded-lg transition-all h-12 text-sm font-medium"
          >
            Analytics
          </TabsTrigger>
          {portfolioId !== 'everything' && (
            <TabsTrigger
              value="distribution" 
              className="flex items-center gap-2 data-[state=active]:bg-openkey-blue data-[state=active]:text-white rounded-lg transition-all h-12 text-sm font-medium"
            >
              Distribution
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="audit" 
            className="flex items-center gap-2 data-[state=active]:bg-openkey-blue data-[state=active]:text-white rounded-lg transition-all h-12 text-sm font-medium"
          >
            Audit
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PortfolioPointsOverview 
                portfolioId={portfolioId} 
                currentUserId={currentUserId}
                compact={true}
              />
            </div>
            <div className="lg:col-span-1">
              <PortfolioPointsNotifications portfolioId={portfolioId} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          <PortfolioPointsAnalytics portfolioId={portfolioId} />
        </TabsContent>
        
        {portfolioId !== 'everything' && (
          <TabsContent value="distribution" className="space-y-6">
            <PortfolioPointsDistributionManager 
              portfolioId={portfolioId} 
              currentUserId={currentUserId} 
            />
          </TabsContent>
        )}

        <TabsContent value="audit" className="space-y-6">
          <PortfolioAuditLog portfolioId={portfolioId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PortfolioPointsDistribution;
