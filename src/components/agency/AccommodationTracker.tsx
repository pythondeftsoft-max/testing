import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Accessibility, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AccommodationTrackerProps {
  agencyId: string;
  tenantId: string;
  tenantName?: string;
}

interface Accommodation {
  id: string;
  accommodation_type: string;
  description: string;
  status: string;
  requested_date: string;
  decision_date: string | null;
  decision_notes: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  requested: { label: 'Requested', variant: 'secondary', icon: Clock },
  under_review: { label: 'Under Review', variant: 'outline', icon: FileText },
  approved: { label: 'Approved', variant: 'default', icon: CheckCircle },
  denied: { label: 'Denied', variant: 'destructive', icon: XCircle },
  withdrawn: { label: 'Withdrawn', variant: 'outline', icon: XCircle },
};

const TYPE_OPTIONS = [
  'Reasonable Accommodation',
  'Reasonable Modification',
  'Transfer Request',
  'Live-in Aide',
  'Accessible Unit',
  'Other',
];

const AccommodationTracker: React.FC<AccommodationTrackerProps> = ({ agencyId, tenantId, tenantName }) => {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newType, setNewType] = useState('Reasonable Accommodation');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAccommodations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('agency_accommodations')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('tenant_id', tenantId)
      .order('requested_date', { ascending: false });
    setAccommodations((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAccommodations(); }, [agencyId, tenantId]);

  const handleCreate = async () => {
    if (!newDesc.trim()) { toast.error('Description is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('agency_accommodations').insert({
      agency_id: agencyId,
      tenant_id: tenantId,
      accommodation_type: newType.toLowerCase().replace(/ /g, '_'),
      description: newDesc,
      status: 'requested',
    } as any);
    setSaving(false);
    if (error) { toast.error('Failed to create accommodation request'); return; }
    toast.success('Accommodation request created');
    setDialogOpen(false);
    setNewDesc('');
    fetchAccommodations();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'approved' || newStatus === 'denied') {
      updates.decision_date = new Date().toISOString().split('T')[0];
    }
    const { error } = await supabase
      .from('agency_accommodations')
      .update(updates)
      .eq('id', id);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    fetchAccommodations();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Accessibility className="h-4 w-4" />
            Reasonable Accommodations
            {tenantName && <span className="text-muted-foreground font-normal">— {tenantName}</span>}
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-3.5 w-3.5 mr-1" /> New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Accommodation Request</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Type</label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Describe the accommodation request..." rows={3} />
                </div>
                <Button onClick={handleCreate} disabled={saving} className="w-full">
                  {saving ? 'Creating...' : 'Create Request'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {accommodations.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <Accessibility className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm font-medium">No accommodation requests on file</p>
            <p className="text-xs text-muted-foreground">Reasonable accommodation requests under Section 504 / Fair Housing Act will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accommodations.map(acc => {
              const config = STATUS_CONFIG[acc.status] || STATUS_CONFIG.requested;
              const Icon = config.icon;
              return (
                <div key={acc.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm capitalize">{acc.accommodation_type.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-muted-foreground">{acc.description}</p>
                    </div>
                    <Badge variant={config.variant} className="shrink-0 flex items-center gap-1">
                      <Icon className="h-3 w-3" /> {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Requested: {new Date(acc.requested_date).toLocaleDateString()}</span>
                    {acc.decision_date && <span>Decision: {new Date(acc.decision_date).toLocaleDateString()}</span>}
                  </div>
                  {(acc.status === 'requested' || acc.status === 'under_review') && (
                    <div className="flex gap-2 pt-1">
                      {acc.status === 'requested' && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(acc.id, 'under_review')}>Start Review</Button>
                      )}
                      <Button size="sm" variant="default" onClick={() => handleStatusChange(acc.id, 'approved')}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusChange(acc.id, 'denied')}>Deny</Button>
                    </div>
                  )}
                  {acc.decision_notes && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">{acc.decision_notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccommodationTracker;
