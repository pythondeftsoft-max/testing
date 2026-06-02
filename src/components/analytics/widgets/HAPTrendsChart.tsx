import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';
import { Calendar } from 'lucide-react';

interface HAPTrendsChartProps {
  landlordId: string;
}

export const HAPTrendsChart = ({ landlordId }: HAPTrendsChartProps) => {
  const { data: trendData = [], isLoading } = useQuery({
    queryKey: ['hap-trends', landlordId],
    queryFn: async () => {
      // Get HAP batch items for this landlord's properties over last 12 months
      const twelveMonthsAgo = subMonths(new Date(), 12).toISOString();
      
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', landlordId);
      
      if (!properties || properties.length === 0) return [];
      
      const propertyIds = properties.map(p => p.id);
      
      const { data: batchItems } = await supabase
        .from('hap_batch_items')
        .select('hap_amount, created_at')
        .in('landlord_id', propertyIds.length > 0 ? [landlordId] : [])
        .gte('created_at', twelveMonthsAgo)
        .order('created_at', { ascending: true });
      
      if (!batchItems || batchItems.length === 0) return [];
      
      // Aggregate by month
      const monthMap: Record<string, number> = {};
      batchItems.forEach(item => {
        const monthKey = format(new Date(item.created_at), 'MMM yyyy');
        monthMap[monthKey] = (monthMap[monthKey] || 0) + (item.hap_amount || 0);
      });
      
      return Object.entries(monthMap).map(([month, total]) => ({
        month,
        total: Math.round(total),
      }));
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-[300px] bg-muted animate-pulse rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (trendData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No HAP Payment History</h3>
          <p className="text-muted-foreground">
            Payment trend data will appear here once HAP batches are processed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly HAP Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="HAP Amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
