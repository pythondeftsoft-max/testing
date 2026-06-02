import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Home, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface VacancyAnalysisReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const VacancyAnalysisReport: React.FC<VacancyAnalysisReportProps> = ({ onBack, portfolioId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['vacancy-analysis', portfolioId],
    queryFn: async () => {
      let query = supabase
        .from('property_units')
        .select('id, unit_number, status, monthly_rent, property_id, properties!inner(address, portfolio_id)');

      if (portfolioId) {
        query = query.eq('properties.portfolio_id', portfolioId);
      }

      const { data: units, error } = await query;
      if (error) throw error;

      // Group by property
      const propertyMap = new Map<string, { address: string; total: number; vacant: number; totalRent: number; vacantRent: number }>();

      for (const unit of (units || []) as any[]) {
        const addr = unit.properties?.address || 'Unknown';
        const pid = unit.property_id;
        if (!propertyMap.has(pid)) {
          propertyMap.set(pid, { address: addr, total: 0, vacant: 0, totalRent: 0, vacantRent: 0 });
        }
        const entry = propertyMap.get(pid)!;
        entry.total++;
        entry.totalRent += Number(unit.monthly_rent || 0);
        if (unit.status === 'vacant' || unit.status === 'available') {
          entry.vacant++;
          entry.vacantRent += Number(unit.monthly_rent || 0);
        }
      }

      const properties = Array.from(propertyMap.entries()).map(([id, v]) => ({
        id,
        ...v,
        vacancyRate: v.total > 0 ? (v.vacant / v.total) * 100 : 0,
      }));

      const totalUnits = properties.reduce((s, p) => s + p.total, 0);
      const totalVacant = properties.reduce((s, p) => s + p.vacant, 0);
      const totalVacantRent = properties.reduce((s, p) => s + p.vacantRent, 0);

      return {
        properties: properties.sort((a, b) => b.vacancyRate - a.vacancyRate),
        totalUnits,
        totalVacant,
        totalOccupied: totalUnits - totalVacant,
        overallRate: totalUnits > 0 ? (totalVacant / totalUnits) * 100 : 0,
        lostRevenue: totalVacantRent,
      };
    },
  });

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h2 className="text-2xl font-bold">Vacancy Analysis Report</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{data.totalUnits}</p>
                  <p className="text-xs text-muted-foreground">Total Units</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Home className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{data.totalOccupied}</p>
                  <p className="text-xs text-muted-foreground">Occupied</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{data.totalVacant}</p>
                  <p className="text-xs text-muted-foreground">Vacant</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{data.overallRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Vacancy Rate</p>
                <p className="text-xs text-destructive mt-1">${data.lostRevenue.toLocaleString()}/mo lost</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {data.properties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vacancy Rate by Property</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.properties.slice(0, 15)} margin={{ top: 5, right: 20, bottom: 60, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="address"
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Bar dataKey="vacancyRate" name="Vacancy Rate" radius={[4, 4, 0, 0]}>
                      {data.properties.slice(0, 15).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-right">Total Units</TableHead>
                      <TableHead className="text-right">Vacant</TableHead>
                      <TableHead className="text-right">Vacancy Rate</TableHead>
                      <TableHead className="text-right">Lost Revenue/mo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.properties.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.address}</TableCell>
                        <TableCell className="text-right">{p.total}</TableCell>
                        <TableCell className="text-right">{p.vacant}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={p.vacancyRate > 10 ? 'destructive' : p.vacancyRate > 5 ? 'warning' : 'secondary'}>
                            {p.vacancyRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">${p.vacantRent.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {data.properties.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No property data found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};
