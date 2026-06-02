import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

const INSPECTION_TYPES = [
  { value: 'initial', label: 'Initial Inspection' },
  { value: 'annual', label: 'Annual Inspection' },
  { value: 'reinspection', label: 'Reinspection' },
  { value: 'special', label: 'Special / Complaint' },
  { value: 'quality_control', label: 'Quality Control' },
];

interface InspectionFee {
  id?: string;
  inspection_type: string;
  fee_amount: number;
  paid_by: string;
  is_active: boolean;
  notes: string;
}

const AgencyInspectionFeeSchedule: React.FC<Props> = ({ agencyId }) => {
  const [fees, setFees] = useState<InspectionFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFees();
  }, [agencyId]);

  const loadFees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_inspection_fees')
      .select('*')
      .eq('agency_id', agencyId);

    if (error) {
      toast.error('Failed to load inspection fees');
    } else if (data && data.length > 0) {
      setFees(data.map(d => ({
        id: d.id,
        inspection_type: d.inspection_type,
        fee_amount: Number(d.fee_amount),
        paid_by: d.paid_by,
        is_active: d.is_active,
        notes: d.notes || '',
      })));
    } else {
      // Initialize with all types
      setFees(INSPECTION_TYPES.map(t => ({
        inspection_type: t.value,
        fee_amount: 0,
        paid_by: 'landlord',
        is_active: true,
        notes: '',
      })));
    }
    setLoading(false);
  };

  const updateFee = (type: string, field: keyof InspectionFee, value: any) => {
    setFees(prev => prev.map(f =>
      f.inspection_type === type ? { ...f, [field]: value } : f
    ));
  };

  const saveFees = async () => {
    setSaving(true);
    try {
      await supabase
        .from('agency_inspection_fees')
        .delete()
        .eq('agency_id', agencyId);

      const rows = fees.map(f => ({
        agency_id: agencyId,
        inspection_type: f.inspection_type,
        fee_amount: f.fee_amount,
        paid_by: f.paid_by,
        is_active: f.is_active,
        notes: f.notes || null,
      }));

      const { error } = await supabase
        .from('agency_inspection_fees')
        .insert(rows);

      if (error) throw error;
      toast.success('Inspection fee schedule saved');
      loadFees();
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
          <ClipboardCheck className="w-4 h-4" /> Inspection Fee Schedule
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure fees charged for each inspection type and who is responsible for payment.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inspection Type</TableHead>
                <TableHead>Fee Amount ($)</TableHead>
                <TableHead>Paid By</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map(f => {
                const label = INSPECTION_TYPES.find(t => t.value === f.inspection_type)?.label || f.inspection_type;
                return (
                  <TableRow key={f.inspection_type}>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell>
                      <Input
                        type="number" min={0} step={5}
                        value={f.fee_amount || ''}
                        onChange={e => updateFee(f.inspection_type, 'fee_amount', parseFloat(e.target.value) || 0)}
                        className="max-w-[120px]"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={f.paid_by}
                        onValueChange={v => updateFee(f.inspection_type, 'paid_by', v)}
                      >
                        <SelectTrigger className="max-w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="landlord">Landlord</SelectItem>
                          <SelectItem value="tenant">Tenant</SelectItem>
                          <SelectItem value="agency">Agency</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={f.is_active}
                        onCheckedChange={v => updateFee(f.inspection_type, 'is_active', v)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={f.notes}
                        onChange={e => updateFee(f.inspection_type, 'notes', e.target.value)}
                        className="max-w-[200px]"
                        placeholder="Optional notes"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Button onClick={saveFees} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Fee Schedule'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AgencyInspectionFeeSchedule;
