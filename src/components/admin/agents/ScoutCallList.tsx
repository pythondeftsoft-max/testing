import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Phone, Plus, Loader2, ExternalLink } from 'lucide-react';
import { useScoutFindings, useUpdateScoutStatus, usePromoteScoutLead } from '@/hooks/useScoutFindings';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const ScoutCallList = () => {
  const [view, setView] = useState<'active' | 'done'>('active');
  const { data: properties, isLoading } = useScoutFindings(view);
  const updateStatus = useUpdateScoutStatus();
  const promoteLead = usePromoteScoutLead();

  // Get admin profile for owner assignment
  const { data: adminProfile } = useQuery({
    queryKey: ['admin-profile-for-scout'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const handleAdd = async (lead: any) => {
    if (!adminProfile?.id) {
      toast({ title: 'Error', description: 'Could not determine owner', variant: 'destructive' });
      return;
    }
    try {
      await promoteLead.mutateAsync({ lead, ownerId: adminProfile.id });
      toast({ title: 'Property Added', description: `${lead.street_address || lead.city} added to properties` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'secondary' | 'destructive'> = {
      approved: 'success',
      called: 'secondary',
      dismissed: 'destructive',
    };
    return <Badge variant={map[status] || 'secondary'} className="text-xs capitalize">{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={view === 'active' ? 'gradient' : 'outline'}
          size="sm"
          onClick={() => setView('active')}
        >
          Call List
        </Button>
        <Button
          variant={view === 'done' ? 'gradient' : 'outline'}
          size="sm"
          onClick={() => setView('done')}
        >
          History
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !properties || properties.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {view === 'active' ? 'No leads to review yet — Wang hasn\'t found any new leads.' : 'No reviewed leads yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {properties.map((p: any) => (
            <Card key={p.id} className="flex items-center justify-between p-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {p.street_address || p.listing_title || 'No address'}
                  </p>
                  {view === 'done' && statusBadge(p.status)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span>{p.city}, {p.state}</span>
                  {p.bedrooms && (
                    <Badge variant="secondary" className="text-xs">{p.bedrooms} BR</Badge>
                  )}
                  {p.rent && (
                    <span className="text-primary font-medium">${Number(p.rent).toLocaleString()}/mo</span>
                  )}
                  <span>Found {new Date(p.created_at).toLocaleDateString()}</span>
                  {p.source_url && (
                    <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                      <ExternalLink className="h-3 w-3" />
                      Source
                    </a>
                  )}
                </div>
              </div>

              {view === 'active' && (
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    title="Add as property"
                    onClick={() => handleAdd(p)}
                    disabled={promoteLead.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-success hover:bg-success/10"
                    title="Mark as called"
                    onClick={() => updateStatus.mutate({ id: p.id, status: 'called' })}
                    disabled={updateStatus.isPending}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    title="Dismiss"
                    onClick={() => updateStatus.mutate({ id: p.id, status: 'dismissed' })}
                    disabled={updateStatus.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
