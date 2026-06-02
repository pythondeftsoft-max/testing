import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Loader2, Users, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

interface IncomeLimit {
  id?: string;
  household_size: number;
  extremely_low: number;
  very_low: number;
  low: number;
  median_income: number | null;
}

const AgencyIncomeLimitsEditor: React.FC<Props> = ({ agencyId }) => {
  const [limits, setLimits] = useState<IncomeLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [metroArea, setMetroArea] = useState('');

  useEffect(() => {
    loadLimits();
  }, [agencyId, fiscalYear]);

  const loadLimits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_income_limits')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('fiscal_year', fiscalYear)
      .order('household_size', { ascending: true });

    if (error) {
      toast.error('Failed to load income limits');
    } else if (data && data.length > 0) {
      setLimits(data.map(d => ({
        id: d.id,
        household_size: d.household_size,
        extremely_low: Number(d.extremely_low),
        very_low: Number(d.very_low),
        low: Number(d.low),
        median_income: d.median_income ? Number(d.median_income) : null,
      })));
      setMetroArea(data[0].metro_area_name || '');
    } else {
      // Initialize with household sizes 1-8
      setLimits(Array.from({ length: 8 }, (_, i) => ({
        household_size: i + 1,
        extremely_low: 0,
        very_low: 0,
        low: 0,
        median_income: null,
      })));
    }
    setLoading(false);
  };

  const updateLimit = (householdSize: number, field: keyof IncomeLimit, value: number) => {
    setLimits(prev => prev.map(l =>
      l.household_size === householdSize ? { ...l, [field]: value } : l
    ));
  };

  const saveLimits = async () => {
    setSaving(true);
    try {
      const areaFilter = metroArea || null;
      let query = supabase
        .from('agency_income_limits')
        .delete()
        .eq('agency_id', agencyId)
        .eq('fiscal_year', fiscalYear);

      if (areaFilter) {
        query = query.eq('metro_area_name', areaFilter);
      } else {
        query = query.is('metro_area_name', null);
      }
      await query;

      const rows = limits.map(l => ({
        agency_id: agencyId,
        fiscal_year: fiscalYear,
        metro_area_name: metroArea || null,
        household_size: l.household_size,
        extremely_low: l.extremely_low,
        very_low: l.very_low,
        low: l.low,
        median_income: l.median_income,
      }));

      const { error } = await supabase
        .from('agency_income_limits')
        .insert(rows);

      if (error) throw error;
      toast.success('Income limits saved');
      loadLimits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" /> Income Limits / AMI Configuration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter HUD income limits by household size. Used for eligibility determinations during waitlist intake and recertifications.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
          <Info className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Income limits are published annually by HUD. Visit{' '}
            <a href="https://www.huduser.gov/portal/datasets/il.html" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              huduser.gov
            </a>{' '}
            to look up your metro area's current limits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Fiscal Year</Label>
            <Input
              type="number"
              min={2020}
              max={2035}
              value={fiscalYear}
              onChange={e => setFiscalYear(parseInt(e.target.value) || new Date().getFullYear())}
            />
          </div>
          <div>
            <Label>Metro / FMR Area Name</Label>
            <Input
              value={metroArea}
              onChange={e => setMetroArea(e.target.value)}
              placeholder="e.g. Los Angeles-Long Beach, CA HUD Metro FMR Area"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HH Size</TableHead>
                <TableHead>Extremely Low (≤30% AMI)</TableHead>
                <TableHead>Very Low (≤50% AMI)</TableHead>
                <TableHead>Low (≤80% AMI)</TableHead>
                <TableHead>Median Income</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {limits.map(l => (
                <TableRow key={l.household_size}>
                  <TableCell className="font-medium">{l.household_size} person{l.household_size > 1 ? 's' : ''}</TableCell>
                  <TableCell>
                    <Input
                      type="number" min={0} step={100}
                      value={l.extremely_low || ''}
                      onChange={e => updateLimit(l.household_size, 'extremely_low', parseFloat(e.target.value) || 0)}
                      className="max-w-[140px]"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" min={0} step={100}
                      value={l.very_low || ''}
                      onChange={e => updateLimit(l.household_size, 'very_low', parseFloat(e.target.value) || 0)}
                      className="max-w-[140px]"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" min={0} step={100}
                      value={l.low || ''}
                      onChange={e => updateLimit(l.household_size, 'low', parseFloat(e.target.value) || 0)}
                      className="max-w-[140px]"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" min={0} step={100}
                      value={l.median_income || ''}
                      onChange={e => updateLimit(l.household_size, 'median_income', parseFloat(e.target.value) || 0)}
                      className="max-w-[140px]"
                      placeholder="0"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Button onClick={saveLimits} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Income Limits'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AgencyIncomeLimitsEditor;
