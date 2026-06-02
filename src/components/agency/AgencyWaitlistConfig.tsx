import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, ListOrdered, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

const DEFAULT_PREFERENCES = [
  'Veteran',
  'Elderly/Disabled',
  'Homeless',
  'Local Residency',
  'Domestic Violence',
  'Working Family',
];

interface WaitlistPolicy {
  is_open: boolean;
  selection_method: 'date_time' | 'lottery' | 'preference_points';
  max_waitlist_size: number | null;
  preference_categories: string[];
  auto_purge_months: number | null;
}

const AgencyWaitlistConfig: React.FC<Props> = ({ agencyId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<WaitlistPolicy>({
    is_open: true,
    selection_method: 'date_time',
    max_waitlist_size: null,
    preference_categories: [...DEFAULT_PREFERENCES],
    auto_purge_months: null,
  });

  useEffect(() => {
    loadPolicy();
  }, [agencyId]);

  const loadPolicy = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('housing_authorities')
      .select('metadata')
      .eq('id', agencyId)
      .single();

    if (data?.metadata) {
      const meta = data.metadata as Record<string, any>;
      if (meta.waitlist_policy) {
        setPolicy({
          is_open: meta.waitlist_policy.is_open ?? true,
          selection_method: meta.waitlist_policy.selection_method || 'date_time',
          max_waitlist_size: meta.waitlist_policy.max_waitlist_size || null,
          preference_categories: meta.waitlist_policy.preference_categories || [...DEFAULT_PREFERENCES],
          auto_purge_months: meta.waitlist_policy.auto_purge_months || null,
        });
      }
    }
    setLoading(false);
  };

  const savePolicy = async () => {
    setSaving(true);
    try {
      // Get current metadata first
      const { data: current } = await supabase
        .from('housing_authorities')
        .select('metadata')
        .eq('id', agencyId)
        .single();

      const existingMeta = (current?.metadata as Record<string, any>) || {};

      const { error } = await supabase
        .from('housing_authorities')
        .update({
          metadata: {
            ...existingMeta,
            waitlist_policy: policy as unknown as Record<string, unknown>,
          } as any,
        })
        .eq('id', agencyId);

      if (error) throw error;
      toast.success('Waitlist policy saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setPolicy(prev => ({
      ...prev,
      preference_categories: prev.preference_categories.includes(cat)
        ? prev.preference_categories.filter(c => c !== cat)
        : [...prev.preference_categories, cat],
    }));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ListOrdered className="w-4 h-4" /> Waitlist Policy Configuration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure how your agency's waiting list operates, including selection method and preference categories.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Open/Closed */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <Label className="font-medium">Waitlist Status</Label>
            <p className="text-xs text-muted-foreground">
              {policy.is_open ? 'Accepting new applications' : 'Waitlist is closed to new applicants'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={policy.is_open ? 'default' : 'secondary'}>
              {policy.is_open ? 'Open' : 'Closed'}
            </Badge>
            <Switch
              checked={policy.is_open}
              onCheckedChange={v => setPolicy(p => ({ ...p, is_open: v }))}
            />
          </div>
        </div>

        {/* Selection Method */}
        <div>
          <Label>Selection Method</Label>
          <p className="text-xs text-muted-foreground mb-2">How applicants are ordered on the waitlist</p>
          <Select
            value={policy.selection_method}
            onValueChange={v => setPolicy(p => ({ ...p, selection_method: v as WaitlistPolicy['selection_method'] }))}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_time">Date & Time (First Come, First Served)</SelectItem>
              <SelectItem value="lottery">Random Lottery</SelectItem>
              <SelectItem value="preference_points">Preference Points</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Max Size */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Maximum Waitlist Size</Label>
            <p className="text-xs text-muted-foreground mb-1">Leave blank for unlimited</p>
            <Input
              type="number"
              min={0}
              value={policy.max_waitlist_size || ''}
              onChange={e => setPolicy(p => ({ ...p, max_waitlist_size: parseInt(e.target.value) || null }))}
              placeholder="Unlimited"
              className="max-w-[200px]"
            />
          </div>
          <div>
            <Label>Auto-Purge Inactive After (months)</Label>
            <p className="text-xs text-muted-foreground mb-1">Remove unresponsive applicants</p>
            <Input
              type="number"
              min={0}
              value={policy.auto_purge_months || ''}
              onChange={e => setPolicy(p => ({ ...p, auto_purge_months: parseInt(e.target.value) || null }))}
              placeholder="Disabled"
              className="max-w-[200px]"
            />
          </div>
        </div>

        {/* Preference Categories */}
        <div>
          <Label className="font-medium">Active Preference Categories</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Select which preference categories are recognized by your agency. Used when scoring applicants.
          </p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_PREFERENCES.map(cat => (
              <Button
                key={cat}
                variant={policy.preference_categories.includes(cat) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleCategory(cat)}
                className="gap-1"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
          <Info className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Changes to selection method or preference categories only affect future waitlist operations. Existing positions are preserved.
          </p>
        </div>

        <Button onClick={savePolicy} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Waitlist Policy'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AgencyWaitlistConfig;
