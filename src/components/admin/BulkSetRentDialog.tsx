import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UnitLike {
  id: string;
  monthly_rent?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
}

interface NewPlanRow {
  id: string;
  bedrooms: number; // 0 = studio
  bathrooms: number;
  count: number;
  rent: string;
}

interface BulkSetRentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyAddress: string;
  units: UnitLike[];
  onApplied: (
    updates: Record<string, number>,
    propertyRent?: number,
    createdUnits?: any[],
  ) => void;
}

const bedLabel = (bd: number | null | undefined) =>
  bd === 0 ? 'Studio' : `${bd ?? '?'} Bed`;

export const BulkSetRentDialog: React.FC<BulkSetRentDialogProps> = ({
  open,
  onOpenChange,
  propertyId,
  propertyAddress,
  units,
  onApplied,
}) => {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [newPlans, setNewPlans] = useState<NewPlanRow[]>([]);
  const [updateProperty, setUpdateProperty] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, { bd: number | null; ba: number | null; rent: number | null; units: UnitLike[] }>();
    for (const u of units) {
      const key = `${u.bedrooms ?? 'x'}_${u.bathrooms ?? 'x'}`;
      if (!map.has(key)) {
        map.set(key, { bd: u.bedrooms ?? null, ba: u.bathrooms ?? null, rent: u.monthly_rent ?? null, units: [] });
      }
      const g = map.get(key)!;
      g.units.push(u);
      if ((u.monthly_rent ?? 0) > (g.rent ?? 0)) g.rent = u.monthly_rent ?? g.rent;
    }
    return Array.from(map.entries())
      .map(([key, g]) => ({ key, ...g }))
      .sort((a, b) => (a.bd ?? 0) - (b.bd ?? 0) || (a.ba ?? 0) - (b.ba ?? 0));
  }, [units]);

  const totalAffected = useMemo(() => {
    const existing = groups.reduce((sum, g) => {
      const v = parseFloat(values[g.key] || '');
      return sum + (Number.isFinite(v) && v > 0 ? g.units.length : 0);
    }, 0);
    const created = newPlans.reduce((sum, p) => {
      const r = parseFloat(p.rent || '');
      return sum + (Number.isFinite(r) && r > 0 && p.count > 0 ? p.count : 0);
    }, 0);
    return existing + created;
  }, [groups, values, newPlans]);

  const addNewPlan = () => {
    setNewPlans((prev) => [
      ...prev,
      { id: `new-${Date.now()}-${Math.random()}`, bedrooms: 0, bathrooms: 1, count: 1, rent: '' },
    ]);
  };

  const updateNewPlan = (id: string, patch: Partial<NewPlanRow>) => {
    setNewPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removeNewPlan = (id: string) => {
    setNewPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const handleApply = async () => {
    const updates: Record<string, number> = {};
    let maxRent = 0;
    for (const g of groups) {
      const v = parseFloat(values[g.key] || '');
      if (!Number.isFinite(v) || v <= 0) continue;
      if (v > maxRent) maxRent = v;
      for (const u of g.units) updates[u.id] = v;
    }

    const validNewPlans = newPlans.filter((p) => {
      const r = parseFloat(p.rent || '');
      return Number.isFinite(r) && r > 0 && p.count > 0;
    });

    for (const p of validNewPlans) {
      const r = parseFloat(p.rent);
      if (r > maxRent) maxRent = r;
    }

    if (Object.keys(updates).length === 0 && validNewPlans.length === 0) {
      toast({ title: 'Nothing to apply', description: 'Enter a new rent or add a floor plan.' });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Partial UPDATEs for existing groups
      const byRent = new Map<number, string[]>();
      for (const [unitId, rent] of Object.entries(updates)) {
        if (!byRent.has(rent)) byRent.set(rent, []);
        byRent.get(rent)!.push(unitId);
      }
      for (const [rent, unitIds] of byRent.entries()) {
        const { error } = await supabase
          .from('property_units')
          .update({ monthly_rent: rent })
          .in('id', unitIds);
        if (error) throw error;
      }

      // 2. INSERT new floor plan units
      let createdUnits: any[] = [];
      if (validNewPlans.length > 0) {
        const inserts: any[] = [];
        for (const p of validNewPlans) {
          const r = parseFloat(p.rent);
          const label = p.bedrooms === 0 ? 'Studio' : `${p.bedrooms}BR`;
          for (let n = 1; n <= p.count; n++) {
            inserts.push({
              property_id: propertyId,
              unit_number: p.count > 1 ? `${label}-${n}` : label,
              unit_name: label,
              bedrooms: p.bedrooms,
              bathrooms: p.bathrooms,
              monthly_rent: r,
              status: 'vacant',
              on_market: true,
              listing_status: 'active',
            });
          }
        }
        const { data: inserted, error: insErr } = await supabase
          .from('property_units')
          .insert(inserts)
          .select('id, unit_number, unit_name, bedrooms, bathrooms, monthly_rent, status, on_market, photos, unit_amenities, created_at');
        if (insErr) throw insErr;
        createdUnits = inserted || [];
      }

      // 3. Optional property-level rent
      let propertyRentApplied: number | undefined;
      if (updateProperty && maxRent > 0) {
        const { error: propErr } = await supabase
          .from('properties')
          .update({ monthly_rent: maxRent, desired_rent: maxRent })
          .eq('id', propertyId);
        if (propErr) throw propErr;
        propertyRentApplied = maxRent;
      }

      const updatedCount = Object.keys(updates).length;
      const createdCount = createdUnits.length;
      toast({
        title: 'Rent updated',
        description: [
          updatedCount > 0 ? `Updated ${updatedCount} unit${updatedCount === 1 ? '' : 's'}` : null,
          createdCount > 0 ? `Added ${createdCount} new unit${createdCount === 1 ? '' : 's'}` : null,
        ].filter(Boolean).join(' • '),
      });
      onApplied(updates, propertyRentApplied, createdUnits);
      onOpenChange(false);
      setValues({});
      setNewPlans([]);
    } catch (err: any) {
      console.error('Bulk set rent error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to update rents', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Asking Rent</DialogTitle>
          <DialogDescription className="truncate">{propertyAddress}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground px-1">
            <div className="col-span-6">Floor plan</div>
            <div className="col-span-3 text-right">Current</div>
            <div className="col-span-3 text-right">New rent</div>
          </div>

          {groups.map((g) => (
            <div key={g.key} className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-6 text-sm">
                <span className="font-medium">
                  {bedLabel(g.bd)}{g.bd !== 0 ? ` / ${g.ba ?? '?'} Bath` : ''}
                </span>
                <span className="text-muted-foreground"> ({g.units.length} unit{g.units.length === 1 ? '' : 's'})</span>
              </div>
              <div className="col-span-3 text-right text-sm text-muted-foreground">
                {g.rent != null ? `$${Number(g.rent).toLocaleString()}` : '—'}
              </div>
              <div className="col-span-3">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="—"
                    value={values[g.key] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [g.key]: e.target.value }))}
                    className="pl-6 h-9 text-right"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* New floor plans */}
          {newPlans.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="text-xs font-medium text-muted-foreground px-1">New floor plans</div>
              {newPlans.map((p) => (
                <div key={p.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <Select
                      value={String(p.bedrooms)}
                      onValueChange={(v) => updateNewPlan(p.id, { bedrooms: parseInt(v) })}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Studio</SelectItem>
                        <SelectItem value="1">1 Bed</SelectItem>
                        <SelectItem value="2">2 Bed</SelectItem>
                        <SelectItem value="3">3 Bed</SelectItem>
                        <SelectItem value="4">4 Bed</SelectItem>
                        <SelectItem value="5">5+ Bed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="Bath"
                      value={p.bathrooms}
                      onChange={(e) => updateNewPlan(p.id, { bathrooms: parseFloat(e.target.value) || 0 })}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="# units"
                      value={p.count}
                      onChange={(e) => updateNewPlan(p.id, { count: parseInt(e.target.value) || 0 })}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-4">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Rent"
                        value={p.rent}
                        onChange={(e) => updateNewPlan(p.id, { rent: e.target.value })}
                        className="pl-6 h-9 text-right"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeNewPlan(p.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-1">
            <Button variant="outline" size="sm" onClick={addNewPlan} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add floor plan (e.g. studio)
            </Button>
            <p className="text-xs text-muted-foreground mt-1 px-1">
              Adds new units that weren't part of the original import.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="update-property-rent"
              checked={updateProperty}
              onCheckedChange={(v) => setUpdateProperty(v === true)}
            />
            <Label htmlFor="update-property-rent" className="text-sm font-normal cursor-pointer">
              Also update property-level rent (uses highest entered value)
            </Label>
          </div>

          <p className="text-xs text-muted-foreground pt-1">
            Empty rows are skipped. Units stay on market — Days Listed and applications are preserved.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isSaving || totalAffected === 0}>
            {isSaving ? 'Applying…' : `Apply to ${totalAffected} unit${totalAffected === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
