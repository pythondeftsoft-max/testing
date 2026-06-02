import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LAUNCH_QA_SECTIONS, ALL_ITEM_KEYS } from '@/lib/launchQAItems';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface StateRow {
  item_key: string;
  checked: boolean;
}

const LaunchQAChecklist: React.FC = () => {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin-qa-checklist', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('admin_qa_checklist_state')
        .select('item_key, checked')
        .eq('user_id', userId);
      if (error) throw error;
      return (data || []) as StateRow[];
    },
  });

  const checkedMap = useMemo(() => {
    const m = new Map<string, boolean>();
    rows?.forEach((r) => m.set(r.item_key, r.checked));
    return m;
  }, [rows]);

  const totalChecked = useMemo(
    () => ALL_ITEM_KEYS.filter((k) => checkedMap.get(k)).length,
    [checkedMap],
  );
  const overallPct = Math.round((totalChecked / ALL_ITEM_KEYS.length) * 100);

  const toggle = useMutation({
    mutationFn: async ({ itemKey, checked }: { itemKey: string; checked: boolean }) => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await (supabase as any)
        .from('admin_qa_checklist_state')
        .upsert(
          {
            user_id: userId,
            item_key: itemKey,
            checked,
            checked_at: checked ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,item_key' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-qa-checklist', userId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const setSection = useMutation({
    mutationFn: async ({ keys, checked }: { keys: string[]; checked: boolean }) => {
      if (!userId) throw new Error('Not signed in');
      const payload = keys.map((k) => ({
        user_id: userId,
        item_key: k,
        checked,
        checked_at: checked ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await (supabase as any)
        .from('admin_qa_checklist_state')
        .upsert(payload, { onConflict: 'user_id,item_key' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-qa-checklist', userId] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <AdminLayout activeTab="launch-checklist">
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Launch QA Checklist
            {overallPct === 100 && (
              <Badge className="bg-green-600 hover:bg-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Launch ready
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manual walk-through of every flow before going live. Progress saves automatically.
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{overallPct}%</div>
          <div className="text-xs text-muted-foreground">{totalChecked} / {ALL_ITEM_KEYS.length}</div>
        </div>
      </div>

      <Progress value={overallPct} className="h-2" />

      <div className="space-y-4">
        {LAUNCH_QA_SECTIONS.map((section) => {
          const sectionKeys = section.items.map((i) => i.key);
          const sectionChecked = sectionKeys.filter((k) => checkedMap.get(k)).length;
          const sectionPct = Math.round((sectionChecked / sectionKeys.length) * 100);

          return (
            <Card key={section.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {section.title}
                    <span className="text-xs text-muted-foreground font-normal">
                      {sectionChecked}/{sectionKeys.length}
                    </span>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSection.mutate({ keys: sectionKeys, checked: true })}
                      disabled={setSection.isPending}
                    >
                      Mark all
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSection.mutate({ keys: sectionKeys, checked: false })}
                      disabled={setSection.isPending}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
                <Progress value={sectionPct} className="h-1 mt-2" />
              </CardHeader>
              <CardContent className="space-y-2">
                {section.items.map((item) => {
                  const isChecked = !!checkedMap.get(item.key);
                  return (
                    <label
                      key={item.key}
                      className="flex items-start gap-3 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(v) => toggle.mutate({ itemKey: item.key, checked: !!v })}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                          {item.label}
                        </div>
                        {item.hint && (
                          <div className="text-xs text-muted-foreground mt-0.5">{item.hint}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
    </AdminLayout>
  );
};

export default LaunchQAChecklist;
