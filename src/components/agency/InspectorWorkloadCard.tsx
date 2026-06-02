import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Loader2 } from 'lucide-react';

interface Props {
  agencyId: string;
}

const InspectorWorkloadCard: React.FC<Props> = ({ agencyId }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [staffRes, inspRes] = await Promise.all([
        supabase.from('agency_staff').select('id, user_id, profiles!agency_staff_user_id_fkey(full_name)').eq('agency_id', agencyId).eq('role', 'inspector'),
        supabase.from('inspections').select('id, inspector_id, status, scheduled_date').eq('agency_id', agencyId),
      ]);

      const staff = (staffRes.data || []) as any[];
      const inspections = (inspRes.data || []) as any[];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const chart = staff.map(s => {
        const mine = inspections.filter(i => i.inspector_id === s.id);
        return {
          name: s.profiles?.full_name?.split(' ')[0] || s.id.slice(0, 6),
          scheduled: mine.filter(i => i.status === 'scheduled').length,
          completed: mine.filter(i => i.status === 'completed' && i.scheduled_date >= monthStart).length,
          in_progress: mine.filter(i => i.status === 'in_progress').length,
        };
      });

      setData(chart);
      setLoading(false);
    };
    fetch();
  }, [agencyId]);

  if (loading) return <Card><CardContent className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></CardContent></Card>;
  if (!data.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Inspector Workload
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="scheduled" fill="hsl(var(--muted-foreground))" name="Scheduled" />
            <Bar dataKey="in_progress" fill="hsl(var(--primary))" name="In Progress" />
            <Bar dataKey="completed" fill="hsl(var(--accent))" name="Completed (Month)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default InspectorWorkloadCard;
