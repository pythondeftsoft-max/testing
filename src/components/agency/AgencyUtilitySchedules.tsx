import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Zap } from 'lucide-react';
import { useUtilitySchedules, UTILITY_TYPES, type UtilityType } from '@/hooks/useUtilitySchedules';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

const BEDROOM_RANGE = [0, 1, 2, 3, 4, 5, 6];

const AgencyUtilitySchedules: React.FC<Props> = ({ agencyId }) => {
  const { schedules, loading, upsertSchedule, deleteSchedule, getTotalUA } = useUtilitySchedules(agencyId);
  const [addOpen, setAddOpen] = useState(false);
  const [bedrooms, setBedrooms] = useState<number>(1);
  const [utilityType, setUtilityType] = useState<UtilityType>('heating');
  const [amount, setAmount] = useState<number>(0);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAdd = async () => {
    const ok = await upsertSchedule(bedrooms, utilityType, amount, effectiveDate);
    if (ok) {
      setAddOpen(false);
      setAmount(0);
    }
  };

  const fmt = (n: number) => `$${Number(n).toFixed(2)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4" /> Utility Allowance Schedules
        </h3>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add Rate</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Utility Allowance Rate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bedrooms</Label>
                  <Select value={String(bedrooms)} onValueChange={v => setBedrooms(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BEDROOM_RANGE.map(b => (
                        <SelectItem key={b} value={String(b)}>{b === 0 ? 'Studio/0' : `${b} BR`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Utility Type</Label>
                  <Select value={utilityType} onValueChange={v => setUtilityType(v as UtilityType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UTILITY_TYPES.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Monthly Allowance ($)</Label>
                <Input type="number" min={0} step={0.01} value={amount} onChange={e => setAmount(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
              </div>
              <Button onClick={handleAdd} className="w-full">Save Rate</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary grid: bedrooms x total UA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Total UA by Bedroom Count</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {BEDROOM_RANGE.map(b => (
              <div key={b} className="text-center rounded-lg border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground">{b === 0 ? 'Studio' : `${b} BR`}</p>
                <p className="text-lg font-bold font-mono">{fmt(getTotalUA(b))}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detail table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bedrooms</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Monthly $</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No utility allowance rates configured. Click "Add Rate" to start.
                    </TableCell>
                  </TableRow>
                ) : schedules.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{s.bedroom_count === 0 ? 'Studio' : `${s.bedroom_count} BR`}</TableCell>
                    <TableCell className="capitalize">{s.utility_type.replace('_', '/')}</TableCell>
                    <TableCell className="font-mono">{fmt(s.monthly_allowance)}</TableCell>
                    <TableCell>{new Date(s.effective_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => deleteSchedule(s.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgencyUtilitySchedules;
