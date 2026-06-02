import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical, Plus, X, FileText } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface RequirementItem {
  name: string;
  description?: string;
  is_preset?: boolean;
}

const TENANT_PRESETS: RequirementItem[] = [
  { name: 'Photo ID', description: 'Government-issued photo identification', is_preset: true },
  { name: 'Income Verification', description: 'Pay stubs, tax returns, or employer letter', is_preset: true },
  { name: 'Social Security Card', description: 'For all household members', is_preset: true },
  { name: 'Birth Certificate', description: 'For all household members under 18', is_preset: true },
  { name: 'Proof of Residency', description: 'Current lease, utility bill, or bank statement', is_preset: true },
  { name: 'Bank Statements', description: 'Last 3 months of all accounts', is_preset: true },
];

const PORTING_PRESETS: RequirementItem[] = [
  { name: 'Current Voucher Letter', description: 'Copy of active HCV voucher', is_preset: true },
  { name: 'Photo ID', description: 'Government-issued photo identification', is_preset: true },
  { name: 'Income Verification', description: 'Pay stubs, tax returns, or employer letter', is_preset: true },
  { name: 'Portability Request Form', description: 'Completed HUD portability form', is_preset: true },
  { name: 'Proof of New Address', description: 'Lease or address in receiving jurisdiction', is_preset: true },
  { name: 'Family Composition Update', description: 'Updated household member list', is_preset: true },
];

interface RequirementsBuilderProps {
  items: RequirementItem[];
  onChange: (items: RequirementItem[]) => void;
  presetType: 'tenant' | 'porting';
}

export const RequirementsBuilder = ({ items, onChange, presetType }: RequirementsBuilderProps) => {
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  const presets = presetType === 'tenant' ? TENANT_PRESETS : PORTING_PRESETS;

  const isPresetActive = (preset: RequirementItem) =>
    items.some(i => i.name === preset.name && i.is_preset);

  const togglePreset = (preset: RequirementItem) => {
    if (isPresetActive(preset)) {
      onChange(items.filter(i => !(i.name === preset.name && i.is_preset)));
    } else {
      onChange([...items, { ...preset }]);
    }
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    onChange([...items, { name: customName.trim(), description: customDesc.trim() || undefined, is_preset: false }]);
    setCustomName('');
    setCustomDesc('');
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    onChange(reordered);
  };

  return (
    <div className="space-y-4">
      {/* Preset toggles */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Preset Requirements</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {presets.map(preset => (
            <label key={preset.name} className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 border border-transparent hover:border-border">
              <Checkbox
                checked={isPresetActive(preset)}
                onCheckedChange={() => togglePreset(preset)}
                className="mt-0.5"
              />
              <div>
                <span className="text-sm font-medium">{preset.name}</span>
                {preset.description && (
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Active items with drag-and-drop reordering */}
      {items.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Active Requirements ({items.length})</p>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="requirements">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                  {items.map((item, idx) => (
                    <Draggable key={`${item.name}-${idx}`} draggableId={`${item.name}-${idx}`} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-2 p-2 rounded border ${snapshot.isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}
                        >
                          <div {...provided.dragHandleProps} className="cursor-grab">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                            )}
                          </div>
                          {item.is_preset && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">Preset</span>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeItem(idx)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {/* Add custom */}
      <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
        <p className="text-sm font-medium text-foreground">Add Custom Requirement</p>
        <div className="flex gap-2">
          <Input
            placeholder="Requirement name..."
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
          />
          <Input
            placeholder="Description (optional)"
            value={customDesc}
            onChange={e => setCustomDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            className="hidden sm:block"
          />
          <Button variant="outline" size="sm" onClick={addCustom} disabled={!customName.trim()} className="shrink-0">
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
};
