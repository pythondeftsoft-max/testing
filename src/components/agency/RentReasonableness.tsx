import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, BarChart3, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useRentComparables } from '@/hooks/useRentComparables';

interface Props {
  agencyId: string;
  rftaId: string;
  proposedRent: number;
  staffId: string;
}

const RentReasonableness: React.FC<Props> = ({ agencyId, rftaId, proposedRent, staffId }) => {
  const { comparables, analysis, loading, addComparable, deleteComparable, runAnalysis } = useRentComparables(agencyId, rftaId);
  const [addOpen, setAddOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(1);
  const [sqft, setSqft] = useState<number | ''>('');
  const [rent, setRent] = useState<number>(0);
  const [amenities, setAmenities] = useState('');
  const [condition, setCondition] = useState('');
  const [notes, setNotes] = useState('');

  const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const handleAdd = async () => {
    if (!address.trim() || rent <= 0) return;
    const ok = await addComparable({
      rfta_id: rftaId,
      address,
      bedrooms,
      bathrooms,
      square_footage: sqft || null,
      monthly_rent: rent,
      amenities: amenities || null,
      unit_condition: condition || null,
      date_surveyed: new Date().toISOString().split('T')[0],
      surveyed_by: staffId,
      notes: notes || null,
    });
    if (ok) {
      setAddOpen(false);
      setAddress(''); setRent(0); setAmenities(''); setCondition(''); setNotes('');
    }
  };

  const determinationIcon = {
    pass: <CheckCircle2 className="h-4 w-4 text-primary" />,
    fail: <XCircle className="h-4 w-4 text-destructive" />,
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Rent Reasonableness
          </CardTitle>
          <div className="flex items-center gap-2">
            {analysis && (
              <Badge variant={analysis.determination === 'pass' ? 'success' : analysis.determination === 'fail' ? 'destructive' : 'secondary'}>
                {determinationIcon[analysis.determination]}
                <span className="ml-1">{analysis.determination.toUpperCase()}</span>
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => runAnalysis(rftaId, proposedRent, staffId)} disabled={comparables.length === 0}>
              Run Analysis
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add Comparable</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Comparable Unit</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Address</Label>
                    <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Bedrooms</Label>
                      <Input type="number" min={0} value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Bathrooms</Label>
                      <Input type="number" min={0} step={0.5} value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Sq Ft</Label>
                      <Input type="number" value={sqft} onChange={e => setSqft(e.target.value ? Number(e.target.value) : '')} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Monthly Rent ($)</Label>
                    <Input type="number" min={0} value={rent} onChange={e => setRent(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Amenities</Label>
                    <Input value={amenities} onChange={e => setAmenities(e.target.value)} placeholder="Central AC, laundry..." />
                  </div>
                  <div className="space-y-1">
                    <Label>Condition</Label>
                    <Input value={condition} onChange={e => setCondition(e.target.value)} placeholder="Good, Fair, Excellent..." />
                  </div>
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
                  </div>
                  <Button onClick={handleAdd} className="w-full">Add Comparable</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Analysis summary */}
        {analysis && (
          <div className="rounded-lg border p-3 mb-4 bg-muted/30 grid grid-cols-4 gap-3 text-center text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Proposed Rent</p>
              <p className="font-mono font-bold">{fmt(analysis.proposed_rent)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Comp. Average</p>
              <p className="font-mono font-bold">{analysis.comparable_avg ? fmt(analysis.comparable_avg) : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Comp. Median</p>
              <p className="font-mono font-bold">{analysis.comparable_median ? fmt(analysis.comparable_median) : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Comparables</p>
              <p className="font-mono font-bold">{analysis.comparable_count}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>BR/BA</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Surveyed</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No comparables added yet. Add at least 3 for a reliable analysis.
                  </TableCell>
                </TableRow>
              ) : comparables.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{c.address}</TableCell>
                  <TableCell className="text-sm">{c.bedrooms}/{c.bathrooms}</TableCell>
                  <TableCell className="font-mono text-sm">{fmt(c.monthly_rent)}</TableCell>
                  <TableCell className="text-sm">{c.unit_condition || '—'}</TableCell>
                  <TableCell className="text-sm">{new Date(c.date_surveyed).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => deleteComparable(c.id)}>
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
  );
};

export default RentReasonableness;
