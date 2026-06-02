import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  agencyId: string;
  onNavigate?: () => void;
}

const PortInAwaitingWidget: React.FC<Props> = ({ agencyId, onNavigate }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('agency_portability_requests')
        .select('id, contact_name, initial_pha_name, status, search_expiration_date, created_at')
        .eq('agency_id', agencyId)
        .eq('request_type', 'port_in')
        .in('status', ['initiated', 'paperwork_sent', 'paperwork_received', 'searching'])
        .order('created_at', { ascending: false })
        .limit(5);
      setItems(data || []);
      setLoading(false);
    };
    load();
  }, [agencyId]);

  if (loading || items.length === 0) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowLeft className="h-4 w-4 text-primary" />
          Incoming Port-Ins ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((it) => {
            const days = it.search_expiration_date
              ? Math.ceil((new Date(it.search_expiration_date).getTime() - Date.now()) / 86400000)
              : null;
            return (
              <button
                key={it.id}
                onClick={onNavigate}
                className="w-full flex items-center justify-between gap-3 p-2 rounded-md border hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{it.contact_name || 'Unnamed applicant'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    From {it.initial_pha_name || 'unknown PHA'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {it.status.replace(/_/g, ' ')}
                  </Badge>
                  {days !== null && days < 14 && (
                    <Badge variant={days < 0 ? 'destructive' : 'warning'} className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {days < 0 ? 'Expired' : `${days}d`}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PortInAwaitingWidget;
