import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Home, TrendingUp, X, Info } from 'lucide-react';
import { useEntityPipeline, TenantPipelineStats, PropertyPipelineStats } from '@/hooks/useEntityPipeline';
import { useWorkerPipeline } from '@/hooks/useWorkerPipeline';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineStageExpansion } from './PipelineStageExpansion';
import { EntityType, TenantStage, PropertyStage } from '@/hooks/useEntityStageDetails';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelineStageSummaryCards } from './PipelineStageSummaryCards';
import { PipelineHealthBar } from './PipelineHealthBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useAvailableWorkers } from '@/hooks/useAvailableWorkers';
import { useTerritories } from '@/hooks/useTerritories';

export const EntityPipelineView = () => {
  const queryClient = useQueryClient();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);
  
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: isAdmin } = useAdminCheck();
  const { data: availableWorkers } = useAvailableWorkers();
  const { data: territories } = useTerritories();

  const filteredWorkers = useMemo(() => {
    if (!availableWorkers) return [];
    if (selectedTerritoryId) {
      return availableWorkers.filter(w => w.territory_id === selectedTerritoryId);
    }
    return availableWorkers;
  }, [availableWorkers, selectedTerritoryId]);

  useEffect(() => {
    if (selectedWorkerId && !filteredWorkers.find(w => w.user_id === selectedWorkerId)) {
      setSelectedWorkerId(null);
    }
  }, [filteredWorkers, selectedWorkerId]);

  const effectiveWorkerId = isAdmin && selectedWorkerId 
    ? selectedWorkerId 
    : currentUser?.id || '';

  const { data: tenantStats, isLoading: loadingTenants } = useEntityPipeline('tenant');
  const { data: propertyStats, isLoading: loadingProperties } = useEntityPipeline('property');
  
  const { data: workerTenantStats, isLoading: loadingWorkerTenants } = useWorkerPipeline(
    'tenant', 
    effectiveWorkerId
  );
  const { data: workerPropertyStats, isLoading: loadingWorkerProperties } = useWorkerPipeline(
    'property', 
    effectiveWorkerId
  );
  
  const [selectedTenantStage, setSelectedTenantStage] = useState<{
    stage: TenantStage;
    label: string;
  } | null>(null);

  const [selectedPropertyStage, setSelectedPropertyStage] = useState<{
    stage: PropertyStage;
    label: string;
  } | null>(null);

  // Real-time subscriptions for instant updates
  useEffect(() => {
    const profilesChannel = supabase
      .channel('pipeline-profiles-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] });
          queryClient.invalidateQueries({ queryKey: ['entity-stage-details'] });
          queryClient.invalidateQueries({ queryKey: ['worker-pipeline'] });
        }
      )
      .subscribe();

    const unitsChannel = supabase
      .channel('pipeline-units-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'property_units' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] });
          queryClient.invalidateQueries({ queryKey: ['entity-stage-details'] });
          queryClient.invalidateQueries({ queryKey: ['worker-pipeline'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(unitsChannel);
    };
  }, [queryClient]);

  // Compute totals for tab badges
  const allTenantTotal = tenantStats && 'assigned' in tenantStats
    ? (tenantStats as TenantPipelineStats).unassigned + tenantStats.assigned + tenantStats.lease_signed + tenantStats.paid_housed
    : 0;
  const allPropertyTotal = propertyStats && 'in_process' in propertyStats
    ? (propertyStats as PropertyPipelineStats).unassigned + propertyStats.assigned + (propertyStats as PropertyPipelineStats).in_process + propertyStats.lease_signed + propertyStats.paid_housed
    : 0;
  const allTotal = allTenantTotal + allPropertyTotal;

  const myTenantTotal = workerTenantStats && 'assigned' in workerTenantStats
    ? workerTenantStats.assigned + workerTenantStats.lease_signed + workerTenantStats.paid_housed
    : 0;
  const myPropertyTotal = workerPropertyStats && 'in_process' in workerPropertyStats
    ? workerPropertyStats.assigned + (workerPropertyStats as PropertyPipelineStats).in_process + workerPropertyStats.lease_signed + workerPropertyStats.paid_housed
    : 0;
  const myTotal = myTenantTotal + myPropertyTotal;

  if (loadingTenants || loadingProperties || loadingWorkerTenants || loadingWorkerProperties) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entity Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Entity Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">{allTotal}</Badge>
            </TabsTrigger>
            <TabsTrigger value="my-pipeline">
              My Pipeline
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">{myTotal}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* All Tab with Nested Tenants/Properties */}
          <TabsContent value="all" className="mt-6">
            <Tabs defaultValue="tenants" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tenants" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Tenants
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{allTenantTotal}</Badge>
                </TabsTrigger>
                <TabsTrigger value="properties" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Properties
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{allPropertyTotal}</Badge>
                </TabsTrigger>
              </TabsList>

              {/* All Tenants Sub-Tab */}
              <TabsContent value="tenants" className="mt-6">
                {tenantStats && 'assigned' in tenantStats && (
                  <>
                    <PipelineHealthBar
                      totalEntities={allTenantTotal}
                      inProgress={tenantStats.assigned + tenantStats.lease_signed}
                      housed={tenantStats.paid_housed}
                      needsAttention={tenantStats.unassigned}
                      entityLabel="Tenants"
                      className="mb-4"
                    />

                    <PipelineStageSummaryCards
                      activeStageKey={selectedTenantStage?.stage || null}
                      stages={[
                        {
                          key: 'unassigned',
                          label: 'Unassigned',
                          count: tenantStats.unassigned,
                          stuckCount: tenantStats.unassigned > 3 ? tenantStats.unassigned : 0,
                          onClick: () => setSelectedTenantStage({ stage: 'unassigned', label: 'Unassigned Tenants' })
                        },
                        {
                          key: 'assigned',
                          label: 'Assigned',
                          count: tenantStats.assigned,
                          onClick: () => setSelectedTenantStage({ stage: 'assigned', label: 'Assigned Tenants' })
                        },
                        {
                          key: 'lease_signed',
                          label: 'Lease Signed – Awaiting Payment',
                          count: tenantStats.lease_signed,
                          onClick: () => setSelectedTenantStage({ stage: 'lease_signed', label: 'Lease Signed – Awaiting Payment' })
                        },
                        {
                          key: 'paid_housed',
                          label: 'Paid / Housed',
                          count: tenantStats.paid_housed,
                          onClick: () => setSelectedTenantStage({ stage: 'paid_housed', label: 'Paid / Housed' })
                        }
                      ]}
                      className="mb-6"
                    />

                    {selectedTenantStage && (
                      <PipelineStageExpansion
                        isOpen={!!selectedTenantStage}
                        onClose={() => setSelectedTenantStage(null)}
                        entityType="tenant"
                        stage={selectedTenantStage.stage}
                        stageLabel={selectedTenantStage.label}
                      />
                    )}
                  </>
                )}
              </TabsContent>

              {/* All Properties Sub-Tab */}
              <TabsContent value="properties" className="mt-6">
                {propertyStats && 'in_process' in propertyStats && (
                  <>
                    <PipelineHealthBar
                      totalEntities={allPropertyTotal}
                      inProgress={propertyStats.assigned + (propertyStats as PropertyPipelineStats).in_process + propertyStats.lease_signed}
                      housed={propertyStats.paid_housed}
                      needsAttention={propertyStats.unassigned}
                      entityLabel="Properties"
                      className="mb-4"
                    />

                    <PipelineStageSummaryCards
                      activeStageKey={selectedPropertyStage?.stage || null}
                      stages={[
                        {
                          key: 'unassigned',
                          label: 'Unassigned',
                          count: propertyStats.unassigned,
                          stuckCount: propertyStats.unassigned > 3 ? propertyStats.unassigned : 0,
                          onClick: () => setSelectedPropertyStage({ stage: 'unassigned', label: 'Unassigned Properties' })
                        },
                        {
                          key: 'assigned',
                          label: 'Assigned',
                          count: propertyStats.assigned,
                          onClick: () => setSelectedPropertyStage({ stage: 'assigned', label: 'Assigned Properties' })
                        },
                        {
                          key: 'in_process',
                          label: 'In Process',
                          count: (propertyStats as PropertyPipelineStats).in_process,
                          onClick: () => setSelectedPropertyStage({ stage: 'in_process', label: 'In Process' })
                        },
                        {
                          key: 'lease_signed',
                          label: 'Lease Signed – Awaiting Payment',
                          count: propertyStats.lease_signed,
                          onClick: () => setSelectedPropertyStage({ stage: 'lease_signed', label: 'Lease Signed – Awaiting Payment' })
                        },
                        {
                          key: 'paid_housed',
                          label: 'Paid / Housed',
                          count: propertyStats.paid_housed,
                          onClick: () => setSelectedPropertyStage({ stage: 'paid_housed', label: 'Paid / Housed' })
                        }
                      ]}
                      className="mb-6"
                    />

                    {selectedPropertyStage && (
                      <PipelineStageExpansion
                        isOpen={!!selectedPropertyStage}
                        onClose={() => setSelectedPropertyStage(null)}
                        entityType="property"
                        stage={selectedPropertyStage.stage}
                        stageLabel={selectedPropertyStage.label}
                      />
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* My Pipeline Tab with Nested Tenants/Properties */}
          <TabsContent value="my-pipeline" className="mt-6">
            {isAdmin && (
              <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex flex-col gap-2 min-w-[250px]">
                      <label className="text-sm font-medium">Filter by Worker</label>
                      <Select 
                        value={selectedWorkerId || currentUser?.id || ''} 
                        onValueChange={setSelectedWorkerId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select worker..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={currentUser?.id || ''}>
                            My Pipeline (Default)
                          </SelectItem>
                          <SelectSeparator />
                          {filteredWorkers?.map((worker) => (
                            <SelectItem key={worker.user_id} value={worker.user_id}>
                              {worker.full_name}
                              {worker.territory_name && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({worker.territory_name})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <label className="text-sm font-medium">Filter by Territory</label>
                      <Select 
                        value={selectedTerritoryId || 'all'} 
                        onValueChange={(value) => setSelectedTerritoryId(value === 'all' ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All territories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Territories</SelectItem>
                          <SelectSeparator />
                          {territories?.map((territory) => (
                            <SelectItem key={territory.id} value={territory.id}>
                              {territory.territory_name}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({territory.country})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedWorkerId(null);
                      setSelectedTerritoryId(null);
                    }}
                    className="mt-6"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reset Filters
                  </Button>
                </div>

                {selectedWorkerId && selectedWorkerId !== currentUser?.id && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>
                      Viewing pipeline for: 
                      <strong className="text-foreground ml-1">
                        {availableWorkers?.find(w => w.user_id === selectedWorkerId)?.full_name}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            )}
            
            <Tabs defaultValue="tenants" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tenants" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Tenants
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{myTenantTotal}</Badge>
                </TabsTrigger>
                <TabsTrigger value="properties" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Properties
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{myPropertyTotal}</Badge>
                </TabsTrigger>
              </TabsList>

              {/* My Tenants Sub-Tab */}
              <TabsContent value="tenants" className="mt-6">
                {workerTenantStats && 'assigned' in workerTenantStats ? (
                  <>
                    <PipelineHealthBar
                      totalEntities={myTenantTotal}
                      inProgress={workerTenantStats.assigned + workerTenantStats.lease_signed}
                      housed={workerTenantStats.paid_housed}
                      needsAttention={0}
                      entityLabel="Tenants"
                      className="mb-4"
                    />

                    <PipelineStageSummaryCards
                      activeStageKey={selectedTenantStage?.stage || null}
                      stages={[
                        {
                          key: 'assigned',
                          label: 'Assigned',
                          count: workerTenantStats.assigned,
                          onClick: () => setSelectedTenantStage({ stage: 'assigned', label: 'My Assigned Tenants' })
                        },
                        {
                          key: 'lease_signed',
                          label: 'Lease Signed – Awaiting Payment',
                          count: workerTenantStats.lease_signed,
                          onClick: () => setSelectedTenantStage({ stage: 'lease_signed', label: 'My Lease Signed – Awaiting Payment' })
                        },
                        {
                          key: 'paid_housed',
                          label: 'Paid / Housed',
                          count: workerTenantStats.paid_housed,
                          onClick: () => setSelectedTenantStage({ stage: 'paid_housed', label: 'My Paid / Housed' })
                        }
                      ]}
                      className="mb-6"
                    />

                    {selectedTenantStage && (
                      <PipelineStageExpansion
                        isOpen={!!selectedTenantStage}
                        onClose={() => setSelectedTenantStage(null)}
                        entityType="tenant"
                        stage={selectedTenantStage.stage}
                        stageLabel={selectedTenantStage.label}
                        workerId={effectiveWorkerId}
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No assigned tenants yet</p>
                    <p className="text-sm mt-2">Assign tenants from the Unassigned Queue to get started</p>
                  </div>
                )}
              </TabsContent>

              {/* My Properties Sub-Tab */}
              <TabsContent value="properties" className="mt-6">
                {workerPropertyStats && 'in_process' in workerPropertyStats ? (
                  <>
                    <PipelineHealthBar
                      totalEntities={myPropertyTotal}
                      inProgress={workerPropertyStats.assigned + (workerPropertyStats as PropertyPipelineStats).in_process + workerPropertyStats.lease_signed}
                      housed={workerPropertyStats.paid_housed}
                      needsAttention={0}
                      entityLabel="Properties"
                      className="mb-4"
                    />

                    <PipelineStageSummaryCards
                      activeStageKey={selectedPropertyStage?.stage || null}
                      stages={[
                        {
                          key: 'assigned',
                          label: 'Assigned',
                          count: workerPropertyStats.assigned,
                          onClick: () => setSelectedPropertyStage({ stage: 'assigned', label: 'My Assigned Properties' })
                        },
                        {
                          key: 'in_process',
                          label: 'In Process',
                          count: (workerPropertyStats as PropertyPipelineStats).in_process,
                          onClick: () => setSelectedPropertyStage({ stage: 'in_process', label: 'My In Process' })
                        },
                        {
                          key: 'lease_signed',
                          label: 'Lease Signed – Awaiting Payment',
                          count: workerPropertyStats.lease_signed,
                          onClick: () => setSelectedPropertyStage({ stage: 'lease_signed', label: 'My Lease Signed – Awaiting Payment' })
                        },
                        {
                          key: 'paid_housed',
                          label: 'Paid / Housed',
                          count: workerPropertyStats.paid_housed,
                          onClick: () => setSelectedPropertyStage({ stage: 'paid_housed', label: 'My Paid / Housed' })
                        }
                      ]}
                      className="mb-6"
                    />

                    {selectedPropertyStage && (
                      <PipelineStageExpansion
                        isOpen={!!selectedPropertyStage}
                        onClose={() => setSelectedPropertyStage(null)}
                        entityType="property"
                        stage={selectedPropertyStage.stage}
                        stageLabel={selectedPropertyStage.label}
                        workerId={effectiveWorkerId}
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Home className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No assigned properties yet</p>
                    <p className="text-sm mt-2">Assign properties from the Unassigned Queue to get started</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
