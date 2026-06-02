import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressAutocomplete } from './AddressAutocomplete';
import { TenantRental } from '@/hooks/useTenantRentals';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN'];
const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => String(currentYear - i));

interface AddRentalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rental: {
    address_text: string;
    landlord_name: string;
    monthly_rent: number;
    currency_code: string;
    start_month?: number;
    start_year?: number;
    end_month?: number;
    end_year?: number;
  }) => void;
  onEdit?: (id: string, rental: {
    address_text: string;
    landlord_name: string;
    monthly_rent: number;
    currency_code: string;
    start_month?: number;
    start_year?: number;
    end_month?: number;
    end_year?: number;
  }) => void;
  initialData?: TenantRental | null;
}

const AddRentalDialog = ({ open, onOpenChange, onSave, onEdit, initialData }: AddRentalDialogProps) => {
  const [address, setAddress] = useState('');
  const [landlord, setLandlord] = useState('');
  const [rent, setRent] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [startMonth, setStartMonth] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData && open) {
      setAddress(initialData.address_text);
      setLandlord(initialData.landlord_name || '');
      setRent(String(initialData.monthly_rent));
      setCurrency(initialData.currency_code);
      setStartMonth(initialData.start_month ? String(initialData.start_month) : '');
      setStartYear(initialData.start_year ? String(initialData.start_year) : '');
      setEndMonth(initialData.end_month ? String(initialData.end_month) : '');
      setEndYear(initialData.end_year ? String(initialData.end_year) : '');
    }
  }, [initialData, open]);

  const resetForm = () => {
    setAddress('');
    setLandlord('');
    setRent('');
    setCurrency('USD');
    setStartMonth('');
    setStartYear('');
    setEndMonth('');
    setEndYear('');
  };

  const buildPayload = () => ({
    address_text: address.trim(),
    landlord_name: landlord.trim(),
    monthly_rent: parseFloat(rent),
    currency_code: currency,
    ...(startMonth ? { start_month: parseInt(startMonth) } : {}),
    ...(startYear ? { start_year: parseInt(startYear) } : {}),
    ...(endMonth ? { end_month: parseInt(endMonth) } : {}),
    ...(endYear ? { end_year: parseInt(endYear) } : {}),
  });

  const handleSaveAndClose = () => {
    if (!address.trim() || !rent) return;
    if (isEditing && onEdit) {
      onEdit(initialData.id, buildPayload());
    } else {
      onSave(buildPayload());
    }
    resetForm();
    onOpenChange(false);
  };

  const handleSaveAndAddAnother = () => {
    if (!address.trim() || !rent) return;
    onSave(buildPayload());
    resetForm();
  };

  const isValid = address.trim().length > 0 && rent;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Rental' : 'Add Rental'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Address with autocomplete */}
          <div>
            <Label htmlFor="address">Address</Label>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              placeholder="Start typing your address..."
            />
          </div>

          {/* Landlord */}
          <div>
            <Label htmlFor="landlord">Landlord Name (optional)</Label>
            <Input id="landlord" placeholder="John Doe" value={landlord} onChange={e => setLandlord(e.target.value)} />
          </div>

          {/* Rent + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rent">Monthly Rent</Label>
              <Input id="rent" type="number" min="0" step="0.01" placeholder="1200" value={rent} onChange={e => setRent(e.target.value)} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lease Start (optional) */}
          <div>
            <Label className="text-muted-foreground text-xs">Lease Start (optional)</Label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <Select value={startMonth} onValueChange={setStartMonth}>
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={startYear} onValueChange={setStartYear}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lease End (optional) */}
          <div>
            <Label className="text-muted-foreground text-xs">Lease End (optional)</Label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <Select value={endMonth} onValueChange={setEndMonth}>
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={endYear} onValueChange={setEndYear}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!endMonth && !endYear && !isEditing && (
              <p className="text-xs text-muted-foreground mt-1.5">
                No end date = current rental. Any previous current rental will be automatically closed.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {!isEditing && (
            <Button variant="secondary" onClick={handleSaveAndAddAnother} disabled={!isValid}>
              Save &amp; Add Another
            </Button>
          )}
          <Button onClick={handleSaveAndClose} disabled={!isValid}>
            {isEditing ? 'Save Changes' : 'Save Rental'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddRentalDialog;
