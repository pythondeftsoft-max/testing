import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Star, ChevronDown } from 'lucide-react';

const HUD_PREFERENCE_CATEGORIES = [
  { id: 'veteran', label: 'Veteran', points: 3 },
  { id: 'disabled_elderly', label: 'Disabled / Elderly', points: 2 },
  { id: 'homeless', label: 'Homeless', points: 3 },
  { id: 'local_residency', label: 'Local Residency', points: 1 },
  { id: 'domestic_violence', label: 'Domestic Violence', points: 3 },
  { id: 'involuntary_displacement', label: 'Involuntary Displacement', points: 2 },
] as const;

interface WaitlistPreferenceEditorProps {
  applicationId: string;
  currentCategories: string[];
  currentPoints: number;
  onUpdated: () => void;
}

export const WaitlistPreferenceEditor: React.FC<WaitlistPreferenceEditorProps> = ({
  applicationId,
  currentCategories,
  currentPoints,
  onUpdated,
}) => {
  const [categories, setCategories] = useState<string[]>(currentCategories);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const totalPoints = categories.reduce((sum, catId) => {
    const cat = HUD_PREFERENCE_CATEGORIES.find(c => c.id === catId);
    return sum + (cat?.points || 0);
  }, 0);

  const toggleCategory = (catId: string) => {
    setCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('voucher_applications')
      .update({
        preference_categories: categories,
        preference_points: totalPoints,
      } as any)
      .eq('id', applicationId);
    setSaving(false);
    if (error) {
      toast.error('Failed to update preferences');
      return;
    }
    toast.success('Preference points updated');
    setOpen(false);
    onUpdated();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
          <Star className="h-3 w-3" />
          {currentPoints > 0 ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {currentPoints} pts
            </Badge>
          ) : (
            <span className="text-muted-foreground">Prefs</span>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">HUD Preference Categories</h4>
            <Badge variant="outline" className="text-xs">
              {totalPoints} pts
            </Badge>
          </div>
          <div className="space-y-2">
            {HUD_PREFERENCE_CATEGORIES.map(cat => (
              <div key={cat.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`pref-${cat.id}`}
                    checked={categories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <Label htmlFor={`pref-${cat.id}`} className="text-xs cursor-pointer">
                    {cat.label}
                  </Label>
                </div>
                <span className="text-[10px] text-muted-foreground">+{cat.points}</span>
              </div>
            ))}
          </div>
          <Button size="sm" className="w-full h-7 text-xs" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
