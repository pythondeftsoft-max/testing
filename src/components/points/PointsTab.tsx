import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserPointsSummary from './UserPointsSummary';
import UserPointsHistory from './UserPointsHistory';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';

export interface PointsTabProps {
  userId: string;
  portfolioId?: string;
  defaultTab?: string;
}

const PointsTab: React.FC<PointsTabProps> = ({ userId, portfolioId, defaultTab }) => {
  return (
    <div className="space-y-6">
      <UserPointsSummary userId={userId} portfolioId={portfolioId} />
      
      <CardEnhanced variant="elevated" className="card-hover">
        <CardEnhancedContent className="p-6">
          <Tabs defaultValue={defaultTab || "all"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all" className="text-sm data-[state=active]:bg-openkey-blue data-[state=active]:text-white">All Points</TabsTrigger>
              <TabsTrigger value="recent" className="text-sm data-[state=active]:bg-openkey-blue data-[state=active]:text-white">Recent Activity</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4 mt-6">
              <UserPointsHistory userId={userId} portfolioId={portfolioId} />
            </TabsContent>
            
            <TabsContent value="recent" className="space-y-4 mt-6">
              <UserPointsHistory userId={userId} portfolioId={portfolioId} />
            </TabsContent>
          </Tabs>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};

export default PointsTab;