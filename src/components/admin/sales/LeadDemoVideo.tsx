import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Save, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  leadId: string;
  initialUrl?: string | null;
}

// Convert Loom share URL → embed URL
function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  const loom = url.match(/loom\.com\/share\/([a-z0-9]+)/i);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url; // assume embeddable
}

export const LeadDemoVideo: React.FC<Props> = ({ leadId, initialUrl }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [url, setUrl] = useState(initialUrl || '');
  const [saving, setSaving] = useState(false);

  const embedUrl = url ? toEmbedUrl(url) : null;

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agency_leads')
        .update({ demo_video_url: url || null })
        .eq('id', leadId);
      if (error) throw error;
      await supabase.from('agency_lead_activities').insert({
        lead_id: leadId,
        activity_type: 'demo_video_updated',
        description: url ? `Demo video attached: ${url}` : 'Demo video removed',
      });
      qc.invalidateQueries({ queryKey: ['agency_lead', leadId] });
      qc.invalidateQueries({ queryKey: ['agency_lead_activities', leadId] });
      toast({ title: 'Demo video saved' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Video className="h-4 w-4" /> Demo Recording
      </div>
      <div>
        <Label className="text-xs">Loom / YouTube / Vimeo URL</Label>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.loom.com/share/..."
            maxLength={500}
          />
          <Button onClick={save} disabled={saving} size="icon" variant="outline">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {embedUrl && (
        <div className="space-y-2">
          <div className="aspect-video rounded-md overflow-hidden border bg-background">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
              title="Demo video"
            />
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            Open in new tab <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
};
