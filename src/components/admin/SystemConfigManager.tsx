
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, RefreshCw, Award, Building2, Users, Package, DollarSign, Gift } from 'lucide-react';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { TenantPointsSection } from './TenantPointsSection';
import { LandlordPointsSection } from './LandlordPointsSection';
import { RedemptionManagement } from './RedemptionManagement';
import { RedemptionRatesConfig } from './RedemptionRatesConfig';
import { RewardCatalogManager } from './RewardCatalogManager';

export const SystemConfigManager = () => {
  const { configs, loading, refetch } = useSystemConfig();

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            System Configuration
          </h2>
          <p className="text-muted-foreground">
            Manage system-wide settings and points configuration
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      <Tabs defaultValue="tenant-points" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tenant-points" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Tenant Points
          </TabsTrigger>
          <TabsTrigger value="landlord-points" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            PM/Landlord Points
          </TabsTrigger>
          <TabsTrigger value="redemption-rates" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Redemption Rates
          </TabsTrigger>
          <TabsTrigger value="reward-catalog" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Reward Catalog
          </TabsTrigger>
          <TabsTrigger value="redemptions" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Redemptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenant-points">
          <TenantPointsSection />
        </TabsContent>

        <TabsContent value="landlord-points">
          <LandlordPointsSection />
        </TabsContent>

        <TabsContent value="redemption-rates">
          <RedemptionRatesConfig />
        </TabsContent>

        <TabsContent value="reward-catalog">
          <RewardCatalogManager />
        </TabsContent>

        <TabsContent value="redemptions">
          <RedemptionManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};
