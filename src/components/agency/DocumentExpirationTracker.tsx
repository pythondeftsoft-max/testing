import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { FileWarning, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface DocumentExpirationTrackerProps {
  agencyId: string;
}

interface ExpiringDoc {
  id: string;
  file_name: string;
  entity_type: string;
  entity_id: string;
  expiration_date: string;
  document_category: string | null;
  daysUntilExpiry: number;
}

const getUrgency = (days: number) => {
  if (days < 0) return { label: 'Expired', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle };
  if (days <= 30) return { label: '< 30 days', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle };
  if (days <= 60) return { label: '< 60 days', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock };
  return { label: '< 90 days', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle };
};

export const DocumentExpirationTracker: React.FC<DocumentExpirationTrackerProps> = ({ agencyId }) => {
  const { data: docs, isLoading } = useQuery({
    queryKey: ['agency-expiring-docs', agencyId],
    queryFn: async () => {
      const now = new Date();
      const ninetyDaysOut = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('agency_documents')
        .select('id, file_name, entity_type, entity_id, expiration_date, document_category')
        .eq('agency_id', agencyId)
        .not('expiration_date', 'is', null)
        .lte('expiration_date', ninetyDaysOut.toISOString().split('T')[0])
        .order('expiration_date', { ascending: true });

      if (error) throw error;

      return (data || []).map((doc: any) => ({
        ...doc,
        daysUntilExpiry: Math.ceil(
          (new Date(doc.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })) as ExpiringDoc[];
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const expired = docs?.filter(d => d.daysUntilExpiry < 0).length || 0;
  const within30 = docs?.filter(d => d.daysUntilExpiry >= 0 && d.daysUntilExpiry <= 30).length || 0;
  const within60 = docs?.filter(d => d.daysUntilExpiry > 30 && d.daysUntilExpiry <= 60).length || 0;
  const within90 = docs?.filter(d => d.daysUntilExpiry > 60 && d.daysUntilExpiry <= 90).length || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-amber-500" />
          Document Expiration Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Badges */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {expired > 0 && (
            <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">
              {expired} Expired
            </Badge>
          )}
          {within30 > 0 && (
            <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
              {within30} in 30 days
            </Badge>
          )}
          {within60 > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
              {within60} in 60 days
            </Badge>
          )}
          {within90 > 0 && (
            <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">
              {within90} in 90 days
            </Badge>
          )}
          {!docs?.length && !isLoading && (
            <span className="text-xs text-muted-foreground">No documents expiring in 90 days</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : docs && docs.length > 0 ? (
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {docs.map(doc => {
                const urgency = getUrgency(doc.daysUntilExpiry);
                const UrgencyIcon = urgency.icon;
                return (
                  <div key={doc.id} className="flex items-center justify-between p-2 rounded-md border bg-card text-card-foreground">
                    <div className="flex items-center gap-2 min-w-0">
                      <UrgencyIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{doc.file_name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {doc.document_category || doc.entity_type} · {doc.entity_type}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${urgency.color} text-[10px] shrink-0 ml-2`}>
                      {doc.daysUntilExpiry < 0
                        ? `${Math.abs(doc.daysUntilExpiry)}d overdue`
                        : `${doc.daysUntilExpiry}d left`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : null}
      </CardContent>
    </Card>
  );
};
