import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Loader2, DollarSign, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

const BEDROOM_LABELS = ['Studio/0BR', '1BR', '2BR', '3BR', '4BR', '5BR', '6BR', '7BR', '8BR'];

interface PaymentStandard {
  id?: string;
  bedroom_count: number;
  amount: number;
  effective_date: string;
  exception_area_name: string | null;
}

const AgencyPaymentStandardsEditor: React.FC<Props> = ({ agencyId }) => {
  const [standards, setStandards] = useState<PaymentStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [exceptionArea, setExceptionArea] = useState('');

  useEffect(() => {
    loadStandards();
  }, [agencyId]);

  const loadStandards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_payment_standards')
      .select('*')
      .eq('agency_id', agencyId)
      .order('effective_date', { ascending: false })
      .order('bedroom_count', { ascending: true });

    if (error) {
      toast.error('Failed to load payment standards');
    } else if (data && data.length > 0) {
      setStandards(data.map(d => ({
        id: d.id,
        bedroom_count: d.bedroom_count,
        amount: Number(d.amount),
        effective_date: d.effective_date,
        exception_area_name: d.exception_area_name,
      })));
      setEffectiveDate(data[0].effective_date);
      setExceptionArea(data[0].exception_area_name || '');
    } else {
      // Initialize with default 0-6BR rows
      setStandards(Array.from({ length: 7 }, (_, i) => ({
        bedroom_count: i,
        amount: 0,
        effective_date: effectiveDate,
        exception_area_name: null,
      })));
    }
    setLoading(false);
  };

  const updateAmount = (bedroomCount: number, amount: number) => {
    setStandards(prev => prev.map(s =>
      s.bedroom_count === bedroomCount ? { ...s, amount } : s
    ));
  };

  const addBedroomSize = () => {
    const maxBr = Math.max(...standards.map(s => s.bedroom_count), -1);
    if (maxBr >= 8) return;
    setStandards(prev => [...prev, {
      bedroom_count: maxBr + 1,
      amount: 0,
      effective_date: effectiveDate,
      exception_area_name: exceptionArea || null,
    }]);
  };

  const removeBedroomSize = (bedroomCount: number) => {
    setStandards(prev => prev.filter(s => s.bedroom_count !== bedroomCount));
  };

  const saveStandards = async () => {
    setSaving(true);
    try {
      // Delete existing standards for this agency/date/area combo
      const areaFilter = exceptionArea || null;
      let query = supabase
        .from('agency_payment_standards')
        .delete()
        .eq('agency_id', agencyId)
        .eq('effective_date', effectiveDate);

      if (areaFilter) {
        query = query.eq('exception_area_name', areaFilter);
      } else {
        query = query.is('exception_area_name', null);
      }

      await query;

      // Insert updated standards
      const rows = standards.map(s => ({
        agency_id: agencyId,
        bedroom_count: s.bedroom_count,
        amount: s.amount,
        effective_date: effectiveDate,
        exception_area_name: exceptionArea || null,
      }));

      const { error } = await supabase
        .from('agency_payment_standards')
        .insert(rows);

      if (error) throw error;
      toast.success('Payment standards saved');
      loadStandards();
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
          <DollarSign className="w-4 h-4" /> Payment Standards Schedule
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Set payment standards by bedroom size. These auto-populate into rent calculations and RFTA reviews.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Effective Date</Label>
            <Input
              type="date"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Exception Area (optional)</Label>
            <Input
              value={exceptionArea}
              onChange={e => setExceptionArea(e.target.value)}
              placeholder="e.g. Downtown, Exception Payment Standard Area"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bedroom Size</TableHead>
              <TableHead>Payment Standard ($)</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standards
              .sort((a, b) => a.bedroom_count - b.bedroom_count)
              .map(s => (
                <TableRow key={s.bedroom_count}>
                  <TableCell className="font-medium">
                    {BEDROOM_LABELS[s.bedroom_count] || `${s.bedroom_count}BR`}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={s.amount || ''}
                      onChange={e => updateAmount(s.bedroom_count, parseFloat(e.target.value) || 0)}
                      className="max-w-[180px]"
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    {s.bedroom_count > 4 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeBedroomSize(s.bedroom_count)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {Math.max(...standards.map(s => s.bedroom_count)) < 8 && (
          <Button variant="outline" size="sm" onClick={addBedroomSize} className="gap-1">
            <Plus className="w-3 h-3" /> Add Larger Unit Size
          </Button>
        )}

        <Button onClick={saveStandards} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Payment Standards'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AgencyPaymentStandardsEditor;
