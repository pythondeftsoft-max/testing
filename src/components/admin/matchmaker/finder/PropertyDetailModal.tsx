import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, Home, MapPin, DollarSign, Clock, Send, ExternalLink, Users, Bed, Bath } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InternalMatch, FinderTenant } from '@/hooks/usePropertyFinder';
import { UnitPushRecipientList } from './UnitPushRecipientList';
import { usePropertyPushHistory } from '@/hooks/usePropertyPushHistory';
import { formatDistanceToNow } from 'date-fns';

interface PropertyDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: InternalMatch | null;
  tenant: FinderTenant;
  onPush: (match: InternalMatch) => void;
}

const FACTOR_WEIGHTS = [
  { key: 'location', label: 'Location', max: 30 },
  { key: 'bedrooms', label: 'Bedrooms', max: 30 },
  { key: 'budget', label: 'Budget', max: 15 },
  { key: 'move_in', label: 'Timing', max: 10 },
  { key: 'pets', label: 'Pets', max: 5 },
] as const;

const getDriveTimeColor = (mins: number | null) => {
  if (mins === null) return 'text-muted-foreground';
  if (mins <= 30) return 'text-green-600';
  if (mins <= 45) return 'text-yellow-600';
  return 'text-red-600';
};

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  open,
  onOpenChange,
  match,
  tenant,
  onPush,
}) => {
  const { data: pushHistory = [] } = usePropertyPushHistory(
    tenant.user_id,
    match?.unit_id,
    match?.property_id
  );

  if (!match) return null;

  const breakdown = match.breakdown;
  const photo = match.photos?.[0];

  const handleOpenMarketplace = () => {
    window.open(`/marketplace?property=${match.property_id}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4 text-primary" />
            {match.address}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {match.city}, {match.state} {match.zip_code}
            </span>
            <Badge variant="outline" className="text-xs capitalize">
              {match.property_type}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-5">
            {/* Photo + key facts */}
            <div className="grid sm:grid-cols-[200px,1fr] gap-4">
              {photo ? (
                <img
                  src={photo}
                  alt={match.address}
                  className="w-full h-[140px] object-cover rounded-md border"
                />
              ) : (
                <div className="w-full h-[140px] rounded-md border bg-muted flex items-center justify-center">
                  <Home className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Bed className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{match.bedrooms}</span> BR
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Bath className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{match.bathrooms}</span> BA
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">${match.monthly_rent.toLocaleString()}</span>/mo
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="capitalize text-xs">{match.status}</Badge>
                </div>
                {match.drive_time_minutes !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className={cn('w-4 h-4', getDriveTimeColor(match.drive_time_minutes))} />
                    <span className={cn('font-medium', getDriveTimeColor(match.drive_time_minutes))}>
                      {match.drive_time_minutes} min drive
                    </span>
                    {match.drive_time_source && (
                      <span className="text-xs text-muted-foreground">
                        ({match.drive_time_source})
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      from {tenant.preferred_locations?.[0] || tenant.city}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Push recipients (this unit, all tenants) */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Push activity
              </h4>
              <UnitPushRecipientList unitId={match.unit_id} />
            </div>

            <Separator />

            {/* Match calculation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Match calculation</h4>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{match.match_score}%</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {match.tier?.replace('_', ' ') || 'Score'}
                  </div>
                </div>
              </div>

              {breakdown ? (
                <div className="space-y-2">
                  {FACTOR_WEIGHTS.map(({ key, label, max }) => {
                    const value = (breakdown as any)[key] ?? 0;
                    const pct = Math.min(100, (value / max) * 100);
                    const barColor =
                      pct >= 80 ? 'bg-green-500' :
                      pct >= 50 ? 'bg-yellow-500' :
                      'bg-red-400';
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{label}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {value} / {max}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full transition-all', barColor)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Detailed breakdown not available for this match.
                </p>
              )}
            </div>

            {/* Push history for THIS tenant against THIS unit */}
            {pushHistory.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    Push history with {tenant.full_name}
                  </h4>
                  <ul className="space-y-1.5">
                    {pushHistory.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 text-xs">
                        <Send className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(p.pushed_at), { addSuffix: true })}
                        </span>
                        <span className="capitalize">{p.status.replace('_', ' ')}</span>
                        {p.events.admin_name && (
                          <span className="text-muted-foreground">· by {p.events.admin_name}</span>
                        )}
                        {p.is_expired && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">expired</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-3 border-t flex-row sm:justify-between gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenMarketplace}>
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Open marketplace page
          </Button>
          <Button size="sm" onClick={() => { onPush(match); onOpenChange(false); }}>
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Push to {tenant.full_name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
