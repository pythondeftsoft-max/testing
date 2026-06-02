import { useState } from 'react';
import { useMatchCommandCenter } from '@/hooks/useMatchCommandCenter';
import { CommandControlBar } from './command/CommandControlBar';
import { GroupedMatchTable, ViewMode } from './command/GroupedMatchTable';
import { MatchDetailDrawer } from './command/MatchDetailDrawer';
import { HeroMetricsBar } from './command/HeroMetricsBar';
import { ActivePushesOverview } from './command/ActivePushesOverview';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, Zap, Database, Loader2 } from 'lucide-react';

export const MatchCommandCenter = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('property');
  
  const {
    filteredMatches,
    tenantGroups,
    propertyGroups,
    filterOptions,
    computedAt,
    needsSeed,
    isLoading,
    isFetching,
    filters,
    updateFilter,
    clearFilters,
    selectedMatch,
    drawerOpen,
    openDrawer,
    closeDrawer,
    seedMutation,
    approveMutation,
    rejectMutation,
    exportToCsv,
  } = useMatchCommandCenter();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  const entityCount = viewMode === 'tenant' ? tenantGroups.length : propertyGroups.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-blue-gold flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Match Command Center</h2>
          <p className="text-sm text-muted-foreground">
            Fill vacancies by matching units to qualified tenants
          </p>
        </div>
      </div>

      {/* Hero Metrics Bar */}
      {!needsSeed && propertyGroups.length > 0 && (
        <HeroMetricsBar 
          propertyGroups={propertyGroups} 
          filteredMatches={filteredMatches} 
        />
      )}

      {/* Active Pushes Overview */}
      {!needsSeed && <ActivePushesOverview />}

      {/* Control Bar */}
      <CommandControlBar
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
        filterOptions={filterOptions}
        onSeed={() => seedMutation.mutate()}
        onExport={exportToCsv}
        isSeeding={seedMutation.isPending}
        matchCount={filteredMatches.length}
        entityCount={entityCount}
        computedAt={computedAt}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Empty State - Needs Seed */}
      {needsSeed && !isFetching && (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/30">
          <Database className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Matches Computed</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            The match cache is empty. This happens when the system was just set up
            or match scoring logic was recently updated.
          </p>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Click below to compute matches for all active tenants and on-market properties.
          </p>
          <Button
            size="lg"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="gap-2"
          >
            {seedMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            Seed All Matches
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            This may take 30-60 seconds for large datasets.
          </p>
        </div>
      )}

      {/* Empty State - No Results After Filtering */}
      {!needsSeed && !filteredMatches.length && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No {viewMode === 'tenant' ? 'Tenants' : 'Properties'} Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-2">
            Try adjusting your filters or click "Seed Matches" to recompute.
          </p>
        </div>
      )}

      {/* Grouped Match Table */}
      {!needsSeed && (tenantGroups.length > 0 || propertyGroups.length > 0) && (
        <GroupedMatchTable
          viewMode={viewMode}
          tenantGroups={tenantGroups}
          propertyGroups={propertyGroups}
          onMatchClick={openDrawer}
          onApprove={(match) => approveMutation.mutate(match)}
          onReject={(match) => rejectMutation.mutate({ match })}
        />
      )}

      {/* Detail Drawer */}
      <MatchDetailDrawer
        match={selectedMatch}
        open={drawerOpen}
        onClose={closeDrawer}
        onApprove={(match) => {
          approveMutation.mutate(match);
          closeDrawer();
        }}
        onReject={(match) => {
          rejectMutation.mutate({ match });
          closeDrawer();
        }}
        isApproving={approveMutation.isPending}
        isRejecting={rejectMutation.isPending}
      />
    </div>
  );
};
