import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Database, Trash2, MapPin, Bed, DollarSign } from 'lucide-react';
import { useRentComparables, type RentComparable } from '@/hooks/useRentComparables';
import { format } from 'date-fns';

interface Props {
  agencyId: string;
  staffId: string;
  canManage: boolean;
}

const ComparablesDatabase: React.FC<Props> = ({ agencyId, staffId, canManage }) => {
  const { comparables, loading, addComparable, deleteComparable } = useRentComparables(agencyId);
  const [search, setSearch] = useState('');
  const [bedroomFilter, setBedroomFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [address, setAddress] = useState('');
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [sqft, setSqft] = useState<number | ''>('');
  const [rent, setRent] = useState<number | ''>('');
  const [amenities, setAmenities] = useState('');
  const [condition, setCondition] = useState('');
  const [dateSurveyed, setDateSurveyed] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Only show agency-wide comps (rfta_id is null)
  const agencyComps = useMemo(() =>
    comparables.filter(c => !c.rfta_id), [comparables]);

  const filtered = useMemo(() => {
    let result = agencyComps;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c => c.address.toLowerCase().includes(s));
    }
    if (bedroomFilter !== 'all') {
      result = result.filter(c => c.bedrooms === Number(bedroomFilter));
    }
    return result;
  }, [agencyComps, search, bedroomFilter]);

  const stats = useMemo(() => {
    if (agencyComps.length === 0) return { count: 0, avgRent: 0 };
    const avg = agencyComps.reduce((s, c) => s + Number(c.monthly_rent), 0) / agencyComps.length;
    return { count: agencyComps.length, avgRent: Math.round(avg) };
  }, [agencyComps]);

  const resetForm = () => {
    setAddress(''); setBedrooms(2); setBathrooms(1); setSqft('');
    setRent(''); setAmenities(''); setCondition(''); setNotes('');
    setDateSurveyed(new Date().toISOString().split('T')[0]);
  };

  const handleAdd = async () => {
    if (!address || !rent) return;
    const ok = await addComparable({
      rfta_id: null,
      address,
      bedrooms,
      bathrooms,
      square_footage: sqft || null,
      monthly_rent: Number(rent),
      amenities: amenities || null,
      unit_condition: condition || null,
      date_surveyed: dateSurveyed,
      surveyed_by: staffId,
      notes: notes || null,
    });
    if (ok) { resetForm(); setDialogOpen(false); }
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.count}</p>
              <p className="text-xs text-muted-foreground">Total Comparables</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">${stats.avgRent.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Average Rent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{new Set(agencyComps.map(c => c.bedrooms)).size}</p>
              <p className="text-xs text-muted-foreground">Bedroom Types</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by address..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={bedroomFilter} onValueChange={setBedroomFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Bedrooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All BRs</SelectItem>
              {[0, 1, 2, 3, 4, 5].map(n => (
                <SelectItem key={n} value={String(n)}>{n} BR</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Comparable</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Market Comparable</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Address *</Label>
                  <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, Apt 4B" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Bedrooms</Label>
                    <Input type="number" min={0} value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Bathrooms</Label>
                    <Input type="number" min={0} step={0.5} value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Sq Ft</Label>
                    <Input type="number" value={sqft} onChange={e => setSqft(e.target.value ? Number(e.target.value) : '')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Monthly Rent *</Label>
                    <Input type="number" min={0} value={rent} onChange={e => setRent(e.target.value ? Number(e.target.value) : '')} />
                  </div>
                  <div>
                    <Label>Date Surveyed</Label>
                    <Input type="date" value={dateSurveyed} onChange={e => setDateSurveyed(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Amenities</Label>
                  <Input value={amenities} onChange={e => setAmenities(e.target.value)} placeholder="Washer/Dryer, Parking, AC" />
                </div>
                <div>
                  <Label>Unit Condition</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
                </div>
                <Button onClick={handleAdd} disabled={!address || !rent}>Add Comparable</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>BR/BA</TableHead>
                <TableHead>Sq Ft</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Surveyed</TableHead>
                {canManage && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No comparables found</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{c.address}</TableCell>
                  <TableCell>{c.bedrooms}/{c.bathrooms}</TableCell>
                  <TableCell>{c.square_footage?.toLocaleString() || '—'}</TableCell>
                  <TableCell className="font-semibold">${Number(c.monthly_rent).toLocaleString()}</TableCell>
                  <TableCell>
                    {c.unit_condition ? (
                      <Badge variant="outline" className="capitalize">{c.unit_condition}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(c.date_surveyed), 'MM/dd/yyyy')}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteComparable(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComparablesDatabase;
