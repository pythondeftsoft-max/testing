import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Globe, Search, Users, Building2, ArrowLeftRight, Zap, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TenantFinderList } from './finder/TenantFinderList';
import { TenantMatchSummary } from './finder/TenantMatchSummary';
import { InternalMatchesView } from './finder/InternalMatchesView';
import { ExternalLeadsView } from './finder/ExternalLeadsView';
import { PropertyFinderList, FinderProperty } from './finder/PropertyFinderList';
import { PropertyMatchSummary } from './finder/PropertyMatchSummary';
import { TenantMatchesView, TenantMatch } from './finder/TenantMatchesView';
import { PushConfirmationDialog } from './PushConfirmationDialog';
import { FinderKPIStrip } from './finder/FinderKPIStrip';
import { OpportunityInsightsStrip } from './finder/OpportunityInsightsStrip';
import { TenantFilters, DEFAULT_FILTERS } from './finder/TenantFilterBar';
import { UnitPushRecipientList } from './finder/UnitPushRecipientList';
import { useFinderTenants, useInternalMatches, useFinderProperties, useInternalTenantMatches, FinderTenant, InternalMatch } from '@/hooks/usePropertyFinder';
import { useApplicationWorkflow } from '@/hooks/useApplicationWorkflow';
import { useTenantMatchHistory } from '@/hooks/useMatchProposals';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FinderMode = 'tenant-to-property' | 'property-to-tenant';

interface PendingPush {
  match: InternalMatch;
  previousPush: {
    status: string;
    created_at: string;
    expires_at: string;
  };
}

export const PropertyFinderTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [finderMode, setFinderMode] = useState<FinderMode>('tenant-to-property');

  // Tenant filters with URL persistence
  const [tenantFilters, setTenantFilters] = useState<TenantFilters>(() => {
    const f = { ...DEFAULT_FILTERS };
    const s = searchParams.get('f_state'); if (s) f.state = s;
    const c = searchParams.get('f_city'); if (c) f.city = c;
    const v = searchParams.get('f_voucher'); if (v) f.voucher = v as any;
    const br = searchParams.get('f_br'); if (br) f.bedrooms = br.split(',').map(Number).filter(n => !isNaN(n));
    const rmin = searchParams.get('f_rmin'); if (rmin) f.rentMin = parseInt(rmin);
    const rmax = searchParams.get('f_rmax'); if (rmax) f.rentMax = parseInt(rmax);
    const dl = searchParams.get('f_days'); if (dl) f.daysLooking = dl as any;
    const hs = searchParams.get('f_housing'); if (hs) f.housingStatus = hs as any;
    const p = searchParams.get('f_pushed'); if (p) f.pushed = p as any;
    const pha = searchParams.get('f_pha'); if (pha) f.housingAuthorityId = pha;
    const sb = searchParams.get('f_sort'); if (sb) f.sortBy = sb as any;
    return f;
  });

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const setOrDelete = (k: string, v: string, def: string) => {
      if (v === def) params.delete(k); else params.set(k, v);
    };
    setOrDelete('f_state', tenantFilters.state, 'all');
    setOrDelete('f_city', tenantFilters.city, 'all');
    setOrDelete('f_voucher', tenantFilters.voucher, 'all');
    if (tenantFilters.bedrooms.length > 0) params.set('f_br', tenantFilters.bedrooms.join(',')); else params.delete('f_br');
    if (tenantFilters.rentMin !== 0) params.set('f_rmin', String(tenantFilters.rentMin)); else params.delete('f_rmin');
    if (tenantFilters.rentMax !== 5000) params.set('f_rmax', String(tenantFilters.rentMax)); else params.delete('f_rmax');
    setOrDelete('f_days', tenantFilters.daysLooking, 'all');
    setOrDelete('f_housing', tenantFilters.housingStatus, 'all');
    setOrDelete('f_pushed', tenantFilters.pushed, 'all');
    setOrDelete('f_pha', tenantFilters.housingAuthorityId, 'all');
    setOrDelete('f_sort', tenantFilters.sortBy, 'days_looking');
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantFilters]);

  // Tenant-to-Property state
  const [selectedTenant, setSelectedTenant] = useState<FinderTenant | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'internal' | 'external'>('internal');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPush, setPendingPush] = useState<PendingPush | null>(null);
  const [isCreatingApplication, setIsCreatingApplication] = useState(false);

  // Property-to-Tenant state
  const [selectedProperty, setSelectedProperty] = useState<FinderProperty | null>(null);

  const { user } = useAuth();
  
  // Tenant-to-Property hooks
  const { data: tenants = [], isLoading: tenantsLoading } = useFinderTenants();
  const { data: internalMatches = [], isLoading: matchesLoading } = useInternalMatches(selectedTenant);
  const { data: pushHistory = [] } = useTenantMatchHistory(selectedTenant?.user_id);
  
  // Property-to-Tenant hooks
  const { data: finderProperties = [], isLoading: propertiesLoading } = useFinderProperties();
  const { data: tenantMatches = [], isLoading: tenantMatchesLoading } = useInternalTenantMatches(selectedProperty?.unit_id || null);
  
  const { createApplication } = useApplicationWorkflow();

  const pushHistoryMap = useMemo(() => {
    const map = new Map<string, { status: string; created_at: string; expires_at: string }>();
    pushHistory.forEach(push => {
      const key = push.unit_id || push.tenant_id;
      if (!map.has(key) || new Date(push.created_at) > new Date(map.get(key)!.created_at)) {
        map.set(key, {
          status: push.status,
          created_at: push.created_at,
          expires_at: push.expires_at,
        });
      }
    });
    return map;
  }, [pushHistory]);

  const handleSelectTenant = (tenant: FinderTenant) => {
    setSelectedTenant(tenant);
    setActiveSubTab('internal');
  };

  const handleSelectProperty = (property: FinderProperty) => {
    setSelectedProperty(property);
  };

  const handleViewProperty = (match: InternalMatch) => {
    window.open(`/marketplace?property=${match.property_id}`, '_blank');
  };

  const executeCreateApplication = async (match: InternalMatch) => {
    if (!selectedTenant || !user) {
      toast.error('Unable to create application');
      return;
    }

    setIsCreatingApplication(true);
    try {
      await createApplication.mutateAsync({
        tenant_id: selectedTenant.user_id,
        property_id: match.property_id,
        status: 'pending',
        assigned_worker_id: user.id,
        ai_match_score: match.match_score,
      });

      toast.success('Application created successfully!', {
        description: `${selectedTenant.full_name} → ${match.address}`,
      });
    } catch (error) {
      console.error('Error creating application:', error);
      toast.error('Failed to create application');
    } finally {
      setIsCreatingApplication(false);
    }
  };

  const handleCreateApplication = async (match: InternalMatch) => {
    const lookupKey = match.unit_id || match.property_id;
    const previousPush = pushHistoryMap.get(lookupKey);

    if (previousPush) {
      setPendingPush({ match, previousPush });
      setShowConfirmDialog(true);
    } else {
      await executeCreateApplication(match);
    }
  };

  const handlePushToTenant = async (tenantMatch: TenantMatch) => {
    if (!selectedProperty || !user) {
      toast.error('Unable to create application');
      return;
    }

    setIsCreatingApplication(true);
    try {
      await createApplication.mutateAsync({
        tenant_id: tenantMatch.tenant_id,
        property_id: selectedProperty.property_id,
        status: 'pending',
        assigned_worker_id: user.id,
        ai_match_score: tenantMatch.match_score,
      });

      toast.success('Push sent!', {
        description: `${tenantMatch.full_name} → ${selectedProperty.address}`,
      });
    } catch (error) {
      console.error('Error creating application:', error);
      toast.error('Failed to push to tenant');
    } finally {
      setIsCreatingApplication(false);
    }
  };

  const handleConfirmPush = async () => {
    if (pendingPush) {
      await executeCreateApplication(pendingPush.match);
      setShowConfirmDialog(false);
      setPendingPush(null);
    }
  };

  const handleCloseDialog = () => {
    setShowConfirmDialog(false);
    setPendingPush(null);
  };

  const handleModeSwitch = (mode: FinderMode) => {
    setFinderMode(mode);
    // Reset selections when switching modes
    setSelectedTenant(null);
    setSelectedProperty(null);
  };

  return (
    <div className="space-y-4">
      <OpportunityInsightsStrip
        tenants={tenants}
        onApplyFilter={(next) => setTenantFilters((prev) => ({ ...prev, ...next }))}
      />
      <FinderKPIStrip tenants={tenants} />
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                {finderMode === 'tenant-to-property' ? 'Property Finder' : 'Tenant Finder'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {finderMode === 'tenant-to-property'
                  ? 'Select a tenant to find matching properties'
                  : 'Select a property to find matching tenants'}
              </p>
            </div>
            
            {/* Mode Toggle + Auto-Pusher link */}
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                <Link to="/admin/matchmaker/auto-pusher">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Auto-Pusher
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                <Link to="/admin/matchmaker/push-activity">
                  <Send className="w-3.5 h-3.5 text-primary" />
                  Push Activity
                </Link>
              </Button>
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  variant={finderMode === 'tenant-to-property' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleModeSwitch('tenant-to-property')}
                  className="gap-1.5 text-xs"
                >
                  <Users className="w-3.5 h-3.5" />
                  Tenant → Property
                </Button>
                <Button
                  variant={finderMode === 'property-to-tenant' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleModeSwitch('property-to-tenant')}
                  className="gap-1.5 text-xs"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Property → Tenant
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {finderMode === 'tenant-to-property' ? (
            /* ===== TENANT → PROPERTY MODE ===== */
            <div className="grid lg:grid-cols-[320px,1fr] gap-6">
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="bg-muted/50 px-4 py-3 border-b">
                  <h3 className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Select Tenant
                  </h3>
                </div>
                <TenantFinderList
                  tenants={tenants}
                  selectedTenant={selectedTenant}
                  onSelectTenant={handleSelectTenant}
                  isLoading={tenantsLoading}
                  filters={tenantFilters}
                  onFiltersChange={setTenantFilters}
                />
              </div>

              <div className="space-y-4">
                {selectedTenant ? (
                  <>
                    <TenantMatchSummary tenant={selectedTenant} />
                    <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'internal' | 'external')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="internal" className="flex items-center gap-2">
                          <Home className="w-4 h-4" />
                          Internal Matches
                          {internalMatches.length > 0 && (
                            <span className="ml-1 bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
                              {internalMatches.length}
                            </span>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="external" className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          External Leads
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="internal" className="mt-4">
                        <InternalMatchesView
                          matches={internalMatches}
                          tenant={selectedTenant}
                          isLoading={matchesLoading}
                          onViewProperty={handleViewProperty}
                          onCreateApplication={handleCreateApplication}
                        />
                      </TabsContent>
                      <TabsContent value="external" className="mt-4">
                        <ExternalLeadsView tenant={selectedTenant} adminUserId={user?.id || ''} />
                      </TabsContent>
                    </Tabs>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[400px] border rounded-lg bg-muted/20">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-medium text-lg mb-1">Select a Tenant</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Choose a tenant from the list to find matching properties.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ===== PROPERTY → TENANT MODE ===== */
            <div className="grid lg:grid-cols-[320px,1fr] gap-6">
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="bg-muted/50 px-4 py-3 border-b">
                  <h3 className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Select Property
                  </h3>
                </div>
                <PropertyFinderList
                  properties={finderProperties}
                  selectedProperty={selectedProperty}
                  onSelectProperty={handleSelectProperty}
                  isLoading={propertiesLoading}
                />
              </div>

              <div className="space-y-4">
                {selectedProperty ? (
                  <>
                    <PropertyMatchSummary property={selectedProperty} />
                    <UnitPushRecipientList unitId={selectedProperty.unit_id} />
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Matching Tenants
                        {tenantMatches.length > 0 && (
                          <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
                            {tenantMatches.length}
                          </span>
                        )}
                      </h3>
                      <TenantMatchesView
                        matches={tenantMatches}
                        isLoading={tenantMatchesLoading}
                        onPushToTenant={handlePushToTenant}
                        unitId={selectedProperty.unit_id}
                        propertyAddress={selectedProperty.address}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[400px] border rounded-lg bg-muted/20">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-medium text-lg mb-1">Select a Property</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Choose a property from the list to find matching tenants from the system.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PushConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmPush}
        tenantName={selectedTenant?.full_name || ''}
        propertyAddress={pendingPush?.match.address || ''}
        previousPush={pendingPush?.previousPush || null}
        isLoading={isCreatingApplication}
      />
    </div>
  );
};
