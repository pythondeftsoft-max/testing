import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, MessageSquare, UserPlus, Loader2 } from 'lucide-react';
import { useInterestedPushes } from '@/hooks/usePushActivity';
import { formatDistanceToNow } from 'date-fns';

const InterestedTenantsTab: React.FC = () => {
  const { data: rows, isLoading } = useInterestedPushes();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading interested tenants…
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Heart className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No interested tenants yet. When a tenant replies "yes" to a push SMS, they'll show here so you can spin up a group chat with the landlord.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.id} className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-4 h-4 text-emerald-600 fill-emerald-500" />
                  <span className="font-medium">{r.tenant_name}</span>
                  <Badge variant="outline" className="text-xs">{r.tenant_phone ?? 'no phone'}</Badge>
                </div>
                <div className="text-sm">
                  Interested in <strong>{r.property_address}</strong> · {r.unit_label}
                  {r.unit_beds ? ` · ${r.unit_beds}BR` : ''}
                  {r.unit_rent ? ` · $${r.unit_rent}/mo` : ''}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Replied {r.interested_at ? formatDistanceToNow(new Date(r.interested_at), { addSuffix: true }) : 'recently'}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {r.sms_conversation_id && (
                  <Button asChild size="sm" variant="outline">
                    <a href={`/admin?tab=sms&conversation=${r.sms_conversation_id}`}>
                      <MessageSquare className="w-3.5 h-3.5 mr-1" /> Open Quo
                    </a>
                  </Button>
                )}
                <Button size="sm" disabled title="Coming soon: spin up tenant ↔ landlord group chat">
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Loop in Landlord
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InterestedTenantsTab;
