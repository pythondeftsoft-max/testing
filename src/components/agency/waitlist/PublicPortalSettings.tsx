import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Globe, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PublicPortalSettingsProps {
  agencyId: string;
  agencySlug?: string;
  canManage: boolean;
}

export const PublicPortalSettings: React.FC<PublicPortalSettingsProps> = ({
  agencyId,
  agencySlug,
  canManage,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [directOpen, setDirectOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState<'waitlist' | 'direct' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('housing_authorities')
        .select('public_waitlist_open, public_waitlist_message, direct_apply_open')
        .eq('id', agencyId)
        .maybeSingle();
      if (cancelled) return;
      setOpen(Boolean(data?.public_waitlist_open));
      setDirectOpen(Boolean((data as any)?.direct_apply_open));
      setMessage(data?.public_waitlist_message || '');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [agencyId]);

  const publicUrl = agencySlug ? `${window.location.origin}/apply/${agencySlug}` : '';
  const directUrl = agencySlug ? `${window.location.origin}/apply/${agencySlug}?mode=direct` : '';

  const copyLink = async (which: 'waitlist' | 'direct') => {
    const url = which === 'waitlist' ? publicUrl : directUrl;
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(which);
    toast.success('Link copied');
    setTimeout(() => setCopied(null), 2000);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('housing_authorities')
      .update({
        public_waitlist_open: open,
        public_waitlist_message: message || null,
        direct_apply_open: directOpen,
      } as any)
      .eq('id', agencyId);
    setSaving(false);
    if (error) {
      toast.error('Could not save settings');
      return;
    }
    toast.success('Public portal settings saved');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Public Application Portal
          <Badge variant={open ? 'default' : 'secondary'} className="ml-2">
            {open ? 'Open' : 'Closed'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="public-portal-toggle" className="font-medium">
                  Accept public applications
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When open, anyone with the link below can submit a waitlist application.
                </p>
              </div>
              <Switch
                id="public-portal-toggle"
                checked={open}
                onCheckedChange={setOpen}
                disabled={!canManage || saving}
              />
            </div>

            {agencySlug && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Public application URL (waitlist)</Label>
                <div className="flex items-center gap-2">
                  <Input value={publicUrl} readOnly className="text-xs h-8 font-mono" />
                  <Button variant="outline" size="sm" onClick={() => copyLink('waitlist')} className="h-8">
                    {copied === 'waitlist' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="outline" size="sm" asChild className="h-8">
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 border-t">
              <div>
                <Label htmlFor="direct-apply-toggle" className="font-medium">
                  Accept direct Section 8 applications
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Use when your agency takes applications outside the waitlist (e.g. open enrollment, special programs).
                </p>
              </div>
              <Switch
                id="direct-apply-toggle"
                checked={directOpen}
                onCheckedChange={setDirectOpen}
                disabled={!canManage || saving}
              />
            </div>

            {agencySlug && directOpen && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Direct apply URL</Label>
                <div className="flex items-center gap-2">
                  <Input value={directUrl} readOnly className="text-xs h-8 font-mono" />
                  <Button variant="outline" size="sm" onClick={() => copyLink('direct')} className="h-8">
                    {copied === 'direct' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="outline" size="sm" asChild className="h-8">
                    <a href={directUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="closed-message" className="text-xs text-muted-foreground">
                Message shown when portal is closed
              </Label>
              <Textarea
                id="closed-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="The waitlist is currently closed. Please check back later or contact our office for assistance."
                rows={3}
                disabled={!canManage}
                maxLength={1000}
              />
            </div>

            {canManage && (
              <div className="flex justify-end">
                <Button onClick={save} disabled={saving} size="sm">
                  {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Save settings
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
