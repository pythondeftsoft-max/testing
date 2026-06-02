import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Check, Loader2, Zap, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CreateRftaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  onCreated: () => void;
}

interface TenantOption { id: string; first_name: string | null; last_name: string | null; email: string | null; }
interface PropertyOption { id: string; address: string; city: string | null; owner_id: string | null; }
interface UnitOption { id: string; unit_number: string | null; bedrooms: number | null; monthly_rent: number | null; }

const displayName = (t: TenantOption) => [t.first_name, t.last_name].filter(Boolean).join(' ') || t.email || 'Unknown';

const CreateRftaDialog: React.FC<CreateRftaDialogProps> = ({ open, onOpenChange, agencyId, onCreated }) => {
  const [creating, setCreating] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantOption | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyOption | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitOption | null>(null);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');
  const [propertySearch, setPropertySearch] = useState('');
  const [prefilledData, setPrefilledData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!open || !agencyId) return;
    supabase.from('profiles').select('id, first_name, last_name, email').order('first_name').limit(200)
      .then(({ data }) => setTenants((data as unknown as TenantOption[]) || []));
    supabase.from('properties').select('id, address, city, owner_id').is('deleted_at', null).order('address').limit(200)
      .then(({ data }) => setProperties((data as unknown as PropertyOption[]) || []));
  }, [open, agencyId]);

  useEffect(() => {
    if (!selectedProperty) { setUnits([]); setSelectedUnit(null); return; }
    supabase.from('property_units').select('id, unit_number, bedrooms, monthly_rent').eq('property_id', selectedProperty.id).order('unit_number')
      .then(({ data }) => setUnits((data as unknown as UnitOption[]) || []));
  }, [selectedProperty]);

  useEffect(() => {
    if (!selectedTenant) { setPrefilledData(null); return; }
    const fill = async () => {
      const { data: tp } = await supabase.from('tenant_profiles')
        .select('household_size, annual_income, voucher_number').eq('user_id', selectedTenant.id).maybeSingle();
      setPrefilledData({
        tenant_name: displayName(selectedTenant),
        tenant_email: selectedTenant.email,
        household_size: (tp as any)?.household_size,
        annual_income: (tp as any)?.annual_income,
        voucher_number: (tp as any)?.voucher_number,
      });
    };
    fill();
  }, [selectedTenant]);

  const filteredTenants = useMemo(() => {
    if (!tenantSearch) return tenants;
    const q = tenantSearch.toLowerCase();
    return tenants.filter(t => displayName(t).toLowerCase().includes(q) || t.email?.toLowerCase().includes(q));
  }, [tenants, tenantSearch]);

  const filteredProperties = useMemo(() => {
    if (!propertySearch) return properties;
    const q = propertySearch.toLowerCase();
    return properties.filter(p => p.address?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q));
  }, [properties, propertySearch]);

  const handleCreate = async () => {
    if (!selectedTenant) { toast.error('Please select a tenant'); return; }
    setCreating(true);
    const shareToken = crypto.randomUUID();
    const { error } = await supabase.from('rfta_packets').insert({
      tenant_id: selectedTenant.id,
      agency_id: agencyId,
      property_id: selectedProperty?.id || null,
      unit_id: selectedUnit?.id || null,
      share_token: shareToken,
      status: 'draft' as any,
      packet_data: prefilledData ? { tenant_data: prefilledData, property_data: selectedProperty ? { address: selectedProperty.address, city: selectedProperty.city } : null } : null,
      prefilled_from: prefilledData ? { tenant_profile: Object.keys(prefilledData).filter(k => (prefilledData as any)[k]) } : {},
    } as any);

    if (error) { toast.error('Failed to create RFTA packet'); setCreating(false); return; }

    await supabase.from('agency_activity_log').insert({
      entity_type: 'rfta_packet', entity_id: shareToken, action: 'created',
      actor_id: (await supabase.auth.getUser()).data.user?.id, agency_id: agencyId,
      metadata: { tenant_name: displayName(selectedTenant), auto_filled: !!prefilledData },
    } as any);

    setShareLink(`${window.location.origin}/rfta/submit/${shareToken}`);
    toast.success('RFTA packet created with auto-filled data!');
    onCreated();
    setCreating(false);
  };

  const copyLink = () => { navigator.clipboard.writeText(shareLink); setCopied(true); toast.success('Link copied!'); setTimeout(() => setCopied(false), 2000); };

  const handleClose = (val: boolean) => {
    if (!val) { setSelectedTenant(null); setSelectedProperty(null); setSelectedUnit(null); setShareLink(''); setCopied(false); setPrefilledData(null); setTenantSearch(''); setPropertySearch(''); }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create New RFTA Packet
            {prefilledData && <Badge variant="secondary" className="text-xs"><Zap className="w-3 h-3 mr-1" />Auto-Fill</Badge>}
          </DialogTitle>
        </DialogHeader>

        {shareLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Share this link with the tenant and landlord:</p>
            <div className="flex gap-2">
              <Input value={shareLink} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tenant *</Label>
              <Popover open={tenantOpen} onOpenChange={setTenantOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Search className="w-4 h-4 mr-2 text-muted-foreground" />
                    {selectedTenant ? displayName(selectedTenant) : <span className="text-muted-foreground">Search tenants...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or email..." value={tenantSearch} onValueChange={setTenantSearch} />
                    <CommandList><CommandEmpty>No tenants found</CommandEmpty><CommandGroup>
                      {filteredTenants.slice(0, 50).map(t => (
                        <CommandItem key={t.id} onSelect={() => { setSelectedTenant(t); setTenantOpen(false); }}>
                          <div><p className="font-medium">{displayName(t)}</p><p className="text-xs text-muted-foreground">{t.email}</p></div>
                        </CommandItem>
                      ))}
                    </CommandGroup></CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label>Property (optional)</Label>
              <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Search className="w-4 h-4 mr-2 text-muted-foreground" />
                    {selectedProperty ? selectedProperty.address : <span className="text-muted-foreground">Search properties...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by address..." value={propertySearch} onValueChange={setPropertySearch} />
                    <CommandList><CommandEmpty>No properties found</CommandEmpty><CommandGroup>
                      {filteredProperties.slice(0, 50).map(p => (
                        <CommandItem key={p.id} onSelect={() => { setSelectedProperty(p); setPropertyOpen(false); }}>
                          <div><p className="font-medium">{p.address}</p>{p.city && <p className="text-xs text-muted-foreground">{p.city}</p>}</div>
                        </CommandItem>
                      ))}
                    </CommandGroup></CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {units.length > 0 && (
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Popover open={unitOpen} onOpenChange={setUnitOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {selectedUnit ? `Unit ${selectedUnit.unit_number}` : <span className="text-muted-foreground">Select unit...</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command><CommandList><CommandGroup>
                      {units.map(u => (
                        <CommandItem key={u.id} onSelect={() => { setSelectedUnit(u); setUnitOpen(false); }}>
                          Unit {u.unit_number} — {u.bedrooms}BR {u.monthly_rent ? `$${u.monthly_rent}/mo` : ''}
                        </CommandItem>
                      ))}
                    </CommandGroup></CommandList></Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {prefilledData && (
              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-1">
                <p className="text-xs font-medium text-primary flex items-center gap-1"><Zap className="w-3 h-3" /> Auto-filled from platform data</p>
                {Object.entries(prefilledData).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{k.replace(/_/g, ' ')}</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {shareLink ? (
            <Button onClick={() => handleClose(false)}>Done</Button>
          ) : (
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : 'Create Packet'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRftaDialog;
