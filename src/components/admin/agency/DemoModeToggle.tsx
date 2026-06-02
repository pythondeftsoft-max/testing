import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  agencyId: string;
  agencyName: string;
}

export const DemoModeToggle: React.FC<Props> = ({ agencyId, agencyName }) => {
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [wiping, setWiping] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-demo-data', {
        body: { agency_id: agencyId },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Seed failed');
      const counts = data.counts || {};
      toast({
        title: 'Demo data seeded',
        description: `Created ${counts.landlords || 0} landlords, ${counts.hap_contracts || 0} HAP contracts, ${counts.recertifications || 0} recerts.`,
      });
    } catch (e: any) {
      toast({ title: 'Seed failed', description: e.message, variant: 'destructive' });
    } finally {
      setSeeding(false);
    }
  };

  const handleWipe = async () => {
    if (!confirm(`Wipe ALL demo data for "${agencyName}"?\n\nReal data will not be touched — only rows tagged is_demo:true.`)) return;
    setWiping(true);
    try {
      const { data, error } = await supabase.functions.invoke('wipe-demo-data', {
        body: { agency_id: agencyId },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Wipe failed');
      const deleted = data.deleted || {};
      const total = Object.values(deleted).reduce((a: number, b: any) => a + (b || 0), 0);
      toast({ title: 'Demo data wiped', description: `Removed ${total} demo rows.` });
    } catch (e: any) {
      toast({ title: 'Wipe failed', description: e.message, variant: 'destructive' });
    } finally {
      setWiping(false);
    }
  };

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-warning" />
          Demo Mode
        </CardTitle>
        <CardDescription>
          Seed realistic demo data into this agency for sales calls. Only rows tagged <code className="text-xs">is_demo:true</code> are affected — production data is safe.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleSeed} disabled={seeding} variant="outline" className="flex-1">
          {seeding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Seeding...</> : <><Sparkles className="h-4 w-4 mr-2" /> Seed Demo Data</>}
        </Button>
        <Button onClick={handleWipe} disabled={wiping} variant="outline" className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10">
          {wiping ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Wiping...</> : <><Trash2 className="h-4 w-4 mr-2" /> Wipe Demo Data</>}
        </Button>
      </CardContent>
    </Card>
  );
};
