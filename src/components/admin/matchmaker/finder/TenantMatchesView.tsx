import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, MapPin, DollarSign, Home, ArrowRight, Loader2, Clock, Flame, ThumbsUp, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUnitLatestPushesByTenant } from '@/hooks/usePropertyPushHistory';
import { PushHistoryPill } from './PushHistoryPill';
import { PushTimelineDrawer } from './PushTimelineDrawer';

export interface TenantMatch {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  state: string | null;
  zip_code: string;
  bedrooms_approved: number[];
  rent_range_min: number;
  rent_range_max: number;
  voucher_holder: boolean;
  voucher_amount: number;
  match_score: number;
  tier: 'hot_match' | 'decent_match' | 'no_match' | null;
  drive_time_minutes: number | null;
  drive_time_source: string | null;
  breakdown: {
    location: number;
    budget: number;
    bedrooms: number;
    pets: number;
    move_in: number;
  } | null;
}

interface TenantMatchesViewProps {
  matches: TenantMatch[];
  isLoading: boolean;
  onPushToTenant: (match: TenantMatch) => void;
  unitId?: string | null;
  propertyAddress?: string;
}

const getTierBadge = (tier: string | null, score: number) => {
  if (tier === 'hot_match' || score >= 80) {
    return { icon: Flame, label: 'Hot Match', className: 'bg-green-100 text-green-700' };
  }
  if (tier === 'decent_match' || score >= 60) {
    return { icon: ThumbsUp, label: 'Decent Match', className: 'bg-yellow-100 text-yellow-700' };
  }
  return { icon: null, label: 'No Match', className: 'bg-gray-100 text-gray-600' };
};

const getDriveTimeDisplay = (minutes: number | null) => {
  if (minutes === null) return { label: 'Unknown', className: 'text-muted-foreground' };
  if (minutes <= 15) return { label: `<15 min`, className: 'text-green-600' };
  if (minutes <= 30) return { label: `${minutes} min`, className: 'text-green-600' };
  if (minutes <= 45) return { label: `${minutes} min`, className: 'text-yellow-600' };
  return { label: `${minutes} min`, className: 'text-red-600' };
};

export const TenantMatchesView: React.FC<TenantMatchesViewProps> = ({
  matches,
  isLoading,
  onPushToTenant,
  unitId,
  propertyAddress,
}) => {
  const { data: pushMap } = useUnitLatestPushesByTenant(unitId || undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMatch, setDrawerMatch] = useState<TenantMatch | null>(null);
  const [pushedFilter, setPushedFilter] = useState<'all' | 'pushed' | 'not_pushed' | 'responded'>('all');

  const visible = matches.filter((m) => {
    const p = pushMap?.get(m.tenant_id);
    if (pushedFilter === 'pushed') return !!p;
    if (pushedFilter === 'not_pushed') return !p;
    if (pushedFilter === 'responded') return p && ['interested', 'denied', 'rejected', 'landlord_review', 'primary_applicant'].includes(p.status);
    return true;
  });

  const handleBulkPushTop5 = () => {
    const top5 = matches
      .filter((m) => !pushMap?.get(m.tenant_id) && (m.tier === 'hot_match' || m.match_score >= 80))
      .slice(0, 5);
    if (top5.length === 0) return;
    if (!confirm(`Push this property to ${top5.length} hot matches?`)) return;
    top5.forEach((m) => onPushToTenant(m));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Finding matching tenants...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="font-medium text-lg mb-1">No Matching Tenants Found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            No tenants have been matched to this property yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex gap-1">
          {(['all', 'not_pushed', 'pushed', 'responded'] as const).map(f => (
            <Button
              key={f}
              variant={pushedFilter === f ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPushedFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'not_pushed' ? 'Not pushed' : f === 'pushed' ? 'Pushed' : 'Responded'}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBulkPushTop5}>
          <ArrowRight className="w-3 h-3" />
          Push to top 5 hot matches
        </Button>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-3 p-1">
          {visible.map((match) => {
            const tierInfo = getTierBadge(match.tier, match.match_score);
            const driveTime = getDriveTimeDisplay(match.drive_time_minutes);
            const TierIcon = tierInfo.icon;
            const push = pushMap?.get(match.tenant_id);

            return (
              <Card
                key={match.id}
                className="hover:shadow-md transition-shadow border-l-4"
                style={{
                  borderLeftColor: match.tier === 'hot_match' || match.match_score >= 80
                    ? 'hsl(var(--success, 142 76% 36%))'
                    : match.tier === 'decent_match' || match.match_score >= 60
                      ? 'hsl(var(--warning, 38 92% 50%))'
                      : 'hsl(var(--muted))'
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <h4 className="font-medium">{match.full_name}</h4>
                        {match.voucher_holder && (
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                            <Ticket className="w-3 h-3 mr-1" />
                            Voucher ${match.voucher_amount.toLocaleString()}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {match.city}{match.state ? `, ${match.state}` : ''} {match.zip_code}
                        </span>
                        <span className="flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          {match.bedrooms_approved.length > 0 ? `${match.bedrooms_approved.join(', ')} BR` : 'Any BR'}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${match.rent_range_min.toLocaleString()} - ${match.rent_range_max.toLocaleString()}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn("flex items-center gap-1", driveTime.className)}>
                              <Clock className="w-3 h-3" />
                              {driveTime.label}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Drive time to this property</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      <PushHistoryPill
                        push={push}
                        onClick={() => { setDrawerMatch(match); setDrawerOpen(true); }}
                        onRepush={() => onPushToTenant(match)}
                      />
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className={cn("px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1", tierInfo.className)}>
                        {TierIcon && <TierIcon className="w-3 h-3" />}
                        {match.match_score}%
                      </div>
                      <span className="text-xs text-muted-foreground">{tierInfo.label}</span>
                      <Button size="sm" onClick={() => onPushToTenant(match)}>
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Push
                      </Button>
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
        tenantUserId={drawerMatch?.tenant_id}
        unitId={unitId || null}
        tenantName={drawerMatch?.full_name}
        propertyAddress={propertyAddress}
        onRepush={() => drawerMatch && onPushToTenant(drawerMatch)}
      />
    </TooltipProvider>
  );
};
