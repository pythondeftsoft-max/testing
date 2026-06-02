import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Server } from 'lucide-react';
import { toast } from 'sonner';

interface Props { agencyId: string; }

interface PicSettings {
  agency_id: string;
  sftp_host_override: string | null;
  sftp_user_override: string | null;
  auto_transmit: boolean;
}

const PicSettingsCard: React.FC<Props> = ({ agencyId }) => {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<PicSettings>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['agency-pic-settings', agencyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('agency_pic_settings')
        .select('*')
        .eq('agency_id', agencyId)
        .maybeSingle();
      return (data || { agency_id: agencyId, auto_transmit: false }) as PicSettings;
    },
  });

  const merged = { ...(data || { agency_id: agencyId, auto_transmit: false }), ...draft } as PicSettings;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('agency_pic_settings').upsert({
        agency_id: agencyId,
        sftp_host_override: merged.sftp_host_override || null,
        sftp_user_override: merged.sftp_user_override || null,
        auto_transmit: !!merged.auto_transmit,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('PIC settings saved');
      setDraft({});
      qc.invalidateQueries({ queryKey: ['agency-pic-settings', agencyId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Server className="w-4 h-4 text-primary" /> IMS-PIC SFTP Settings</CardTitle>
        <CardDescription>
          Configure SFTP delivery to HUD IMS-PIC. Leave host/user blank to use the platform defaults.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">SFTP Host (override)</Label>
                <Input
                  value={merged.sftp_host_override || ''}
                  onChange={(e) => setDraft({ ...draft, sftp_host_override: e.target.value })}
                  placeholder="sftp.hud.gov"
                />
              </div>
              <div>
                <Label className="text-xs">SFTP User (override)</Label>
                <Input
                  value={merged.sftp_user_override || ''}
                  onChange={(e) => setDraft({ ...draft, sftp_user_override: e.target.value })}
                  placeholder="pha-1234"
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <div>
                <Label className="text-sm">Auto-transmit on generate</Label>
                <p className="text-xs text-muted-foreground">When enabled, generated submissions are sent immediately.</p>
              </div>
              <Switch
                checked={!!merged.auto_transmit}
                onCheckedChange={(v) => setDraft({ ...draft, auto_transmit: v })}
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || Object.keys(draft).length === 0}>
                {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PicSettingsCard;
