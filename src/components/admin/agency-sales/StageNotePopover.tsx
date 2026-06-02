import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { StickyNote, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  source: 'lead' | 'prospect';
  recordId: string;
  stage?: string;
  trigger?: React.ReactNode;
  onSaved?: () => void;
}

export const StageNotePopover: React.FC<Props> = ({ source, recordId, stage, trigger, onSaved }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (source === 'lead') {
        const { error } = await supabase.from('agency_lead_activities').insert({
          lead_id: recordId,
          actor_id: user?.id,
          activity_type: 'note',
          description: text.trim(),
          metadata: { stage, pinned },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pha_prospect_notes').insert({
          prospect_id: recordId,
          author_user_id: user?.id,
          note: text.trim(),
          kind: 'pipeline',
          metadata: { stage, pinned },
        });
        if (error) throw error;
      }
      toast({ title: 'Note saved' });
      setText('');
      setPinned(false);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['pipeline-cards'] });
      qc.invalidateQueries({ queryKey: ['deal-notes'] });
      onSaved?.();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-7 px-2">
            <StickyNote className="h-3.5 w-3.5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 space-y-2" align="end">
        <div className="text-sm font-medium">
          Add note{stage ? <span className="text-muted-foreground"> · {stage}</span> : null}
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's the latest? Decisions, blockers, owner conversations…"
          rows={4}
          className="text-sm"
        />
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={pinned} onCheckedChange={(v) => setPinned(!!v)} />
            Pin to deal card
          </Label>
          <Button size="sm" onClick={save} disabled={saving || !text.trim()}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default StageNotePopover;
