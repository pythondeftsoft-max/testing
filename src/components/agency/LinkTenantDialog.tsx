import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Search, UserPlus } from 'lucide-react';

interface LinkTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  onLinked: () => void;
}

interface SearchResult {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
}

const LinkTenantDialog: React.FC<LinkTenantDialogProps> = ({ open, onOpenChange, agencyId, onLinked }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);

    // Search tenant profiles without an agency_id
    const { data } = await supabase
      .from('tenant_profiles')
      .select('id, user_id, city, profiles:user_id(full_name, email)')
      .is('agency_id', null)
      .limit(20);

    const filtered = (data || []).filter((t: any) => {
      const name = (t.profiles?.full_name || '').toLowerCase();
      const email = (t.profiles?.email || '').toLowerCase();
      return name.includes(query.toLowerCase()) || email.includes(query.toLowerCase());
    }).map((t: any) => ({
      id: t.id,
      user_id: t.user_id,
      full_name: t.profiles?.full_name,
      email: t.profiles?.email,
      city: t.city,
    }));

    setResults(filtered);
    setSearching(false);
  };

  const handleLink = async (tenantId: string) => {
    setLinking(tenantId);
    const { error } = await supabase
      .from('tenant_profiles')
      .update({ agency_id: agencyId } as any)
      .eq('id', tenantId);

    if (error) {
      toast.error('Failed to link tenant');
      setLinking(null);
      return;
    }

    toast.success('Tenant linked to agency');
    onLinked();
    setLinking(null);
    // Remove from results
    setResults(prev => prev.filter(r => r.id !== tenantId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Tenant to Agency</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by name or email..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="outline" onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {results.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-auto">
              {results.map(r => (
                <div key={r.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div>
                    <p className="text-sm font-medium">{r.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{r.email} • {r.city || 'No city'}</p>
                  </div>
                  <Button size="sm" onClick={() => handleLink(r.id)} disabled={linking === r.id}>
                    {linking === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Search for unlinked tenants to add to this agency.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LinkTenantDialog;
