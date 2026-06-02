import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AgencyBriefDownloadProps {
  agencyId: string;
  agencyName: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm';
}

export function AgencyBriefDownload({
  agencyId,
  agencyName,
  variant = 'outline',
  size = 'sm',
}: AgencyBriefDownloadProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-agency-brief', {
        body: { agency_id: agencyId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate brief');

      toast.success(`Brief ready for ${agencyName}`);
      if (data.url) {
        window.open(data.url, '_blank', 'noopener');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate brief');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleGenerate} disabled={loading} variant={variant} size={size}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <FileText className="h-4 w-4 mr-1" />
      )}
      Download Brief
    </Button>
  );
}
