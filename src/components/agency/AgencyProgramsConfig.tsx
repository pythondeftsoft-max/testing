import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PROGRAM_LABELS } from './ProgramFilter';

const PROGRAM_DESCRIPTIONS: Record<keyof typeof PROGRAM_LABELS, string> = {
  hcv: 'Housing Choice Voucher (Section 8 tenant-based)',
  public_housing: 'Public Housing (PHA-owned units)',
  vash: 'HUD-VASH (Veterans Affairs Supportive Housing)',
  ehv: 'Emergency Housing Vouchers',
  mod_rehab: 'Section 8 Moderate Rehabilitation',
  project_based: 'Project-Based Vouchers (PBV)',
};

interface ProgramRow {
  id: string;
  program_type: keyof typeof PROGRAM_LABELS;
  is_enabled: boolean;
}

interface Props { agencyId: string; }

const AgencyProgramsConfig: React.FC<Props> = ({ agencyId }) => {
  const qc = useQueryClient();

  const { data: programs, isLoading } = useQuery({
    queryKey: ['agency-programs', agencyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_programs')
        .select('*')
        .eq('agency_id', agencyId);
      if (error) throw error;
      return (data || []) as ProgramRow[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ programType, enabled }: { programType: string; enabled: boolean }) => {
      const existing = programs?.find(p => p.program_type === programType);
      if (existing) {
        const { error } = await (supabase as any).from('agency_programs')
          .update({ is_enabled: enabled }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('agency_programs')
          .insert({ agency_id: agencyId, program_type: programType, is_enabled: enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-programs', agencyId] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update'),
  });

  const isEnabled = (pt: string) => {
    const row = programs?.find(p => p.program_type === pt);
    return row ? row.is_enabled : pt === 'hcv'; // Default HCV on
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Housing Programs</CardTitle>
        <CardDescription>
          Enable the HUD programs your agency operates. Records, reports, and filters will reflect these choices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            {(Object.keys(PROGRAM_LABELS) as Array<keyof typeof PROGRAM_LABELS>).map(pt => (
              <div key={pt} className="flex items-center justify-between p-3 rounded-md border">
                <div className="flex-1">
                  <Label className="text-sm font-medium">{PROGRAM_LABELS[pt]}</Label>
                  <p className="text-xs text-muted-foreground">{PROGRAM_DESCRIPTIONS[pt]}</p>
                </div>
                <Switch
                  checked={isEnabled(pt)}
                  disabled={pt === 'hcv'}
                  onCheckedChange={enabled => toggleMutation.mutate({ programType: pt, enabled })}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">HCV is always enabled as the platform default.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AgencyProgramsConfig;
