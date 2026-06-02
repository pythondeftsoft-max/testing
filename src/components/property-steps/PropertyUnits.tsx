
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Copy } from 'lucide-react';

interface Unit {
  id: string;
  name: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  monthlyRent?: string;
}

interface PropertyUnitsProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
}

export const PropertyUnits = ({ formData, updateFormData }: PropertyUnitsProps) => {
  const units = formData.units || [];

  // Quick Add state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTemplate, setQuickTemplate] = useState('');
  const [quickCount, setQuickCount] = useState('');
  const [quickBeds, setQuickBeds] = useState('');
  const [quickBaths, setQuickBaths] = useState('');
  const [quickSqft, setQuickSqft] = useState('');

  const addUnit = () => {
    const newUnitNumber = units.length + 1;
    const newUnit = {
      id: Date.now().toString(),
      name: `Unit ${newUnitNumber}`,
      bedrooms: '',
      bathrooms: '',
      squareFeet: '',
      monthlyRent: ''
    };
    const updatedUnits = [...units, newUnit];
    updateFormData('units', updatedUnits);
    updateFormData('unitCount', updatedUnits.length);
  };

  const removeUnit = (unitId: string) => {
    const updatedUnits = units.filter((unit: Unit) => unit.id !== unitId);
    updateFormData('units', updatedUnits);
    updateFormData('unitCount', updatedUnits.length);
  };

  const updateUnit = (unitId: string, field: string, value: string) => {
    const updatedUnits = units.map((unit: Unit) =>
      unit.id === unitId ? { ...unit, [field]: value } : unit
    );
    updateFormData('units', updatedUnits);
  };

  const handleQuickAdd = () => {
    const count = parseInt(quickCount) || 0;
    const template = quickTemplate.trim() || 'Unit';
    if (count < 1 || count > 500) return;

    const newUnits: Unit[] = [];
    for (let n = 1; n <= count; n++) {
      newUnits.push({
        id: `${Date.now()}-${n}`,
        name: `${template}-${n}`,
        bedrooms: quickBeds,
        bathrooms: quickBaths,
        squareFeet: quickSqft,
        monthlyRent: '',
      });
    }

    const updatedUnits = [...units, ...newUnits];
    updateFormData('units', updatedUnits);
    updateFormData('unitCount', updatedUnits.length);
    setShowQuickAdd(false);
    setQuickTemplate('');
    setQuickCount('');
    setQuickBeds('');
    setQuickBaths('');
    setQuickSqft('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Property Units</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowQuickAdd(true)}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Quick Add
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addUnit}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Unit
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Add Form */}
          {showQuickAdd && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <p className="text-sm font-medium">Bulk Add Units</p>
              <p className="text-xs text-muted-foreground">Create multiple units with the same attributes. Names will be "{'{template}'}-1", "{'{template}'}-2", etc.</p>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <Label className="text-xs">Template Name</Label>
                  <Input placeholder="e.g. 1A" value={quickTemplate} onChange={e => setQuickTemplate(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Count</Label>
                  <Input type="number" min="1" max="500" placeholder="12" value={quickCount} onChange={e => setQuickCount(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Beds</Label>
                  <Input type="number" min="0" placeholder="0" value={quickBeds} onChange={e => setQuickBeds(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Baths</Label>
                  <Input type="number" min="0" step="0.5" placeholder="0" value={quickBaths} onChange={e => setQuickBaths(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Sqft</Label>
                  <Input type="number" min="0" placeholder="0" value={quickSqft} onChange={e => setQuickSqft(e.target.value)} className="h-8" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleQuickAdd} disabled={!quickCount || parseInt(quickCount) < 1}>
                  Add {quickCount ? `${quickCount} Units` : 'Units'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {units.map((unit: Unit, index: number) => (
            <div key={unit.id} className="border rounded-lg p-4 relative">
              {units.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUnit(unit.id)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}

              <div className="space-y-4">
                {/* Unit Name */}
                <div>
                  <Label htmlFor={`unitName-${unit.id}`} className="text-sm font-medium">Unit Name</Label>
                  <Input
                    id={`unitName-${unit.id}`}
                    value={unit.name}
                    onChange={(e) => updateUnit(unit.id, 'name', e.target.value)}
                    placeholder="e.g., Unit 1, Ground Floor, etc."
                    className="h-9"
                  />
                </div>

                {/* Unit Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`bedrooms-${unit.id}`} className="text-sm">Bedrooms</Label>
                    <Input
                      id={`bedrooms-${unit.id}`}
                      type="number"
                      min="0"
                      value={unit.bedrooms}
                      onChange={(e) => updateUnit(unit.id, 'bedrooms', e.target.value)}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`bathrooms-${unit.id}`} className="text-sm">Bathrooms</Label>
                    <Input
                      id={`bathrooms-${unit.id}`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={unit.bathrooms}
                      onChange={(e) => updateUnit(unit.id, 'bathrooms', e.target.value)}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`squareFeet-${unit.id}`} className="text-sm">Square Feet</Label>
                    <Input
                      id={`squareFeet-${unit.id}`}
                      type="number"
                      min="0"
                      value={unit.squareFeet}
                      onChange={(e) => updateUnit(unit.id, 'squareFeet', e.target.value)}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {units.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No units added yet. Click "Add Unit" or "Quick Add" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
              <span className="text-blue-600 text-sm font-medium">i</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900">Unit Configuration Tips</h3>
            <div className="mt-1 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Use "Quick Add" to create many units of the same type at once (e.g., 12 units of "1A")</li>
                <li>Add multiple units for properties with separate rentable spaces</li>
                <li>Use descriptive names like "Ground Floor Unit" or "Unit A" for clarity</li>
                <li>Individual unit rental rates can be set in the Finances & Status section</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
