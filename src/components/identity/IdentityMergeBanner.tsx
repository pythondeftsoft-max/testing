import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { X, UserCheck, Building2, Home } from 'lucide-react';
import { toast } from 'sonner';

interface PendingLink {
  link_type: 'tenant' | 'landlord';
  link_id: string;
  user_id: string;
  agency_id: string;
  agency_name: string | null;
  status: string;
  source: string;
  created_at: string;
}

/**
 * Welcome / Merge-Confirm banner — shown at the top of the authenticated app
 * whenever there are unacknowledged tenant or landlord links for this user.
 * Lets users confirm "This is me" or dispute "Not me" for each pending link.
 */
export default function IdentityMergeBanner() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: links = [] } = useQuery({
    queryKey: ['pending-identity-links', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_identity_links' as any)
        .select('*');
      if (error) return [] as PendingLink[];
      return (data as unknown as PendingLink[]) || [];
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const updateLink = useMutation({
    mutationFn: async ({ link, action }: { link: PendingLink; action: 'confirm' | 'dispute' }) => {
      const table = link.link_type === 'tenant' ? 'agency_tenant_links' : 'agency_landlord_links';
      const patch = action === 'confirm'
        ? { acknowledged_at: new Date().toISOString() }
        : { disputed_at: new Date().toISOString() };
      const { error } = await supabase.from(table as any).update(patch).eq('id', link.link_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.action === 'confirm' ? 'Confirmed' : 'Marked as not me — agency will review');
      qc.invalidateQueries({ queryKey: ['pending-identity-links', user?.id] });
    },
    onError: () => toast.error('Could not update link'),
  });

  if (!user || links.length === 0) return null;

  return (
    <div className="border-b bg-primary/5">
      <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <UserCheck className="h-4 w-4" />
          {links.length === 1 ? 'Confirm an account link' : `Confirm ${links.length} account links`}
        </div>
        {links.map((link) => (
          <div
            key={link.link_id}
            className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              {link.link_type === 'landlord' ? (
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <Home className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="truncate">
                <span className="font-medium text-foreground">{link.agency_name || 'A housing authority'}</span>
                {' '}listed you as a {link.link_type}. Is this you?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateLink.mutate({ link, action: 'dispute' })}
                disabled={updateLink.isPending}
              >
                <X className="h-3 w-3 mr-1" /> Not me
              </Button>
              <Button
                size="sm"
                onClick={() => updateLink.mutate({ link, action: 'confirm' })}
                disabled={updateLink.isPending}
              >
                <UserCheck className="h-3 w-3 mr-1" /> This is me
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
