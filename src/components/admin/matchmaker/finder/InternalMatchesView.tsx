import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, Building2, MapPin, DollarSign, Users, Eye, Send, Loader2, Clock, Flame, ThumbsUp } from 'lucide-react';
import { InternalMatch, FinderTenant } from '@/hooks/usePropertyFinder';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTenantLatestPushesByUnit } from '@/hooks/usePropertyPushHistory';
import { PushHistoryPill } from './PushHistoryPill';
import { PushTimelineDrawer } from './PushTimelineDrawer';
import { PropertyDetailModal } from './PropertyDetailModal';

interface InternalMatchesViewProps {
  matches: InternalMatch[];
  tenant: FinderTenant;
  isLoading: boolean;
  onViewProperty: (match: InternalMatch) => void;
  onCreateApplication: (match: InternalMatch) => void;
}

// Get tier badge styling
const getTierBadge = (tier: string | null, score: number) => {
  if (tier === 'hot_match' || score >= 80) {
    return { icon: Flame, label: 'Hot Match', variant: 'success' as const, className: 'bg-green-100 text-green-700' };
  }
  if (tier === 'decent_match' || score >= 60) {
    return { icon: ThumbsUp, label: 'Decent Match', variant: 'warning' as const, className: 'bg-yellow-100 text-yellow-700' };
  }
  return { icon: null, label: 'No Match', variant: 'secondary' as const, className: 'bg-gray-100 text-gray-600' };
};

// Get drive time display
const getDriveTimeDisplay = (minutes: number | null, source: string | null) => {
  if (minutes === null) return { label: 'Unknown', className: 'text-muted-foreground' };
  if (minutes <= 15) return { label: `<15 min`, className: 'text-green-600' };
  if (minutes <= 30) return { label: `${minutes} min`, className: 'text-green-600' };
  if (minutes <= 45) return { label: `${minutes} min`, className: 'text-yellow-600' };
  return { label: `${minutes} min`, className: 'text-red-600' };
};

export const InternalMatchesView: React.FC<InternalMatchesViewProps> = ({
  matches,
  tenant,
  isLoading,
  onViewProperty,
  onCreateApplication,
}) => {
  const { data: pushMap } = useTenantLatestPushesByUnit(tenant.user_id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMatch, setDrawerMatch] = useState<InternalMatch | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMatch, setDetailMatch] = useState<InternalMatch | null>(null);

  const openDrawer = (m: InternalMatch) => {
    setDrawerMatch(m);
    setDrawerOpen(true);
  };

  const openDetail = (m: InternalMatch) => {
    setDetailMatch(m);
    setDetailOpen(true);
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Finding matching properties...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Home className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="font-medium text-lg mb-1">No Cached Matches Found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Matches for {tenant.full_name} haven't been computed yet.
            Scores are calculated overnight or when tenant data changes.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Try the External Leads tab to search on Trulia, Zillow, and other platforms.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <ScrollArea className="h-[500px]">
        <div className="space-y-3 p-1">
          {matches.map((match) => {
            const tierInfo = getTierBadge(match.tier, match.match_score);
            const driveTime = getDriveTimeDisplay(match.drive_time_minutes, match.drive_time_source);
            const TierIcon = tierInfo.icon;
            const push = pushMap?.get(match.unit_id || match.property_id);

            return (
              <Card 
                key={match.id} 
                className="hover:shadow-md transition-shadow border-l-4"
                style={{ 
                  borderLeftColor: match.tier === 'hot_match' || match.match_score >= 80 
                    ? 'hsl(var(--success))' 
                    : match.tier === 'decent_match' || match.match_score >= 60 
                      ? 'hsl(var(--warning))' 
                      : 'hsl(var(--muted))' 
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Property Info */}
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-center gap-2">
                        {match.property_type === 'apartment' ? (
                          <Building2 className="w-4 h-4 text-primary" />
                        ) : (
                          <Home className="w-4 h-4 text-primary" />
                        )}
                        <h4 className="font-medium">{match.address}</h4>
                        <Badge variant="outline" className="text-xs capitalize">
                          {match.property_type}
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {match.city}, {match.state} {match.zip_code}
                        </span>
                        <span className="flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          {match.bedrooms} BR / {match.bathrooms} BA
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${match.monthly_rent.toLocaleString()}/mo
                        </span>
                        {/* Drive Time */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn("flex items-center gap-1", driveTime.className)}>
                              <Clock className="w-3 h-3" />
                              {driveTime.label}
                              {match.drive_time_source && (
                                <span className="text-xs opacity-60">
                                  ({match.drive_time_source})
                                </span>
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Drive time from tenant's preferred location</p>
                            {match.drive_time_source === 'google' && <p className="text-xs text-muted-foreground">From Google Routes API</p>}
                            {match.drive_time_source === 'cache' && <p className="text-xs text-muted-foreground">Cached result</p>}
                            {match.drive_time_source === 'estimated' && <p className="text-xs text-muted-foreground">Estimated (no exact data)</p>}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Other Tenants Match Badge */}
                      {match.tenant_match_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {match.tenant_match_count} other tenant{match.tenant_match_count > 1 ? 's' : ''} also match
                        </Badge>
                      )}

                      {/* Push history pill */}
                      <PushHistoryPill
                        push={push}
                        onClick={() => openDrawer(match)}
                        onRepush={() => onCreateApplication(match)}
                      />
                    </div>

                    {/* Right Side - Score & Actions */}
                    <div className="flex flex-col items-end gap-2">
                      {/* Tier Badge */}
                      <div className={cn(
                        "px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1",
                        tierInfo.className
                      )}>
                        {TierIcon && <TierIcon className="w-3 h-3" />}
                        {match.match_score}%
                      </div>
                      
                      {/* Tier Label */}
                      <span className="text-xs text-muted-foreground">
                        {tierInfo.label}
                      </span>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetail(match)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onCreateApplication(match)}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Push
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <PushTimelineDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        tenantUserId={tenant.user_id}
        unitId={drawerMatch?.unit_id || null}
        propertyId={drawerMatch?.property_id || null}
        tenantName={tenant.full_name}
        propertyAddress={drawerMatch?.address}
        onRepush={() => drawerMatch && onCreateApplication(drawerMatch)}
      />

      <PropertyDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        match={detailMatch}
        tenant={tenant}
        onPush={onCreateApplication}
      />
    </TooltipProvider>
  );
};
