import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, Building2, TrendingUp, Calendar } from 'lucide-react';
import { HAPMetricsWidget } from './HAPMetricsWidget';
import { VoucherPropertyWidget } from './VoucherPropertyWidget';
import { HAPTenantSplitChart } from './HAPTenantSplitChart';
import { HAPTrendsChart } from './HAPTrendsChart';

interface EnhancedHAPAnalyticsProps {
  landlordId: string;
}

export const EnhancedHAPAnalytics = ({ landlordId }: EnhancedHAPAnalyticsProps) => {
  console.log('EnhancedHAPAnalytics rendering - should only have 3 tabs');
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            HAP Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="properties" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Properties
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Trends
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Top row - 3 key metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <HAPMetricsWidget landlordId={landlordId} variant="compact" />
                <div className="md:col-span-2">
                  <HAPMetricsWidget landlordId={landlordId} variant="full" />
                </div>
              </div>
              
              {/* Bottom row - Payment Sources Chart with more space */}
              <div className="grid grid-cols-1 gap-6">
                <HAPTenantSplitChart landlordId={landlordId} />
              </div>
            </TabsContent>

            <TabsContent value="properties" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <VoucherPropertyWidget landlordId={landlordId} />
                </div>
                <HAPMetricsWidget landlordId={landlordId} variant="compact" />
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <HAPTrendsChart landlordId={landlordId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};