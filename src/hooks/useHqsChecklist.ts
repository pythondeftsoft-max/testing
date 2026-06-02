import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const HQS_CATEGORIES = [
  { key: 'site', label: 'Site & Neighborhood' },
  { key: 'building_exterior', label: 'Building Exterior' },
  { key: 'building_systems', label: 'Building Systems' },
  { key: 'unit_interior', label: 'Unit Interior' },
  { key: 'bathroom', label: 'Bathroom' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'bedroom', label: 'Bedroom' },
  { key: 'other_rooms', label: 'Other Rooms' },
  { key: 'doors_windows', label: 'Doors & Windows' },
  { key: 'ceiling_walls_floors', label: 'Ceiling, Walls & Floors' },
  { key: 'plumbing', label: 'Plumbing' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'fire_safety', label: 'Fire Safety' },
] as const;

export const DEFAULT_ITEMS: Record<string, string[]> = {
  site: ['Condition of neighboring structures', 'Lead-based paint hazards', 'Drainage', 'Accessible building entry'],
  building_exterior: ['Foundation', 'Stairs/porches', 'Roof/gutters', 'Exterior surfaces', 'Chimney'],
  building_systems: ['HVAC system', 'Water heater', 'Water supply', 'Sewage/septic', 'Fire exits', 'Elevator (if applicable)'],
  unit_interior: ['Living room present', 'Adequate lighting', 'Electrical outlets', 'Evidence of infestation'],
  bathroom: ['Toilet functional', 'Fixed wash basin', 'Tub/shower functional', 'Ventilation', 'Hot/cold water'],
  kitchen: ['Oven/stove functional', 'Refrigerator functional', 'Sink with hot/cold water', 'Adequate space for food prep'],
  bedroom: ['Adequate size', 'Window present', 'Closet or wardrobe', 'Privacy'],
  other_rooms: ['Condition acceptable', 'No hazards'],
  doors_windows: ['Locks on entry doors', 'Windows operable', 'No broken glass', 'Window guards (if required)'],
  ceiling_walls_floors: ['No peeling paint', 'No bulging/holes', 'Floor covering intact', 'No tripping hazards'],
  plumbing: ['No leaks', 'Fixtures functional', 'Adequate water pressure'],
  electrical: ['No exposed wiring', 'Outlets properly covered', 'GFI outlets in wet areas', 'Circuit breaker accessible'],
  fire_safety: ['Smoke detectors present', 'Carbon monoxide detector', 'Fire extinguisher accessible', 'Two means of egress'],
};

export interface HqsItem {
  id: string;
  inspection_id: string;
  category: string;
  item_name: string;
  passed: boolean | null;
  deficiency_notes: string | null;
  photo_required: boolean;
  photo_url: string | null;
  created_at: string;
}

export function useHqsChecklist(inspectionId: string | null) {
  const [items, setItems] = useState<HqsItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!inspectionId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('hqs_inspection_items')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('category', { ascending: true });

    if (error) toast.error('Failed to load checklist');
    setItems((data as unknown as HqsItem[]) || []);
    setLoading(false);
  }, [inspectionId]);

  useEffect(() => { fetch(); }, [fetch]);

  const initializeChecklist = async (inspId: string) => {
    const rows = Object.entries(DEFAULT_ITEMS).flatMap(([cat, names]) =>
      names.map(name => ({
        inspection_id: inspId,
        category: cat as any,
        item_name: name,
        photo_required: ['fire_safety', 'electrical'].includes(cat),
      }))
    );
    const { error } = await supabase.from('hqs_inspection_items').insert(rows as any);
    if (error) { toast.error('Failed to initialize checklist'); return; }
    toast.success('HQS checklist initialized');
    fetch();
  };

  const updateItem = async (itemId: string, updates: Partial<HqsItem>) => {
    const { error } = await supabase.from('hqs_inspection_items').update(updates as any).eq('id', itemId);
    if (error) { toast.error('Failed to update item'); return; }
    fetch();
  };

  return { items, loading, refetch: fetch, initializeChecklist, updateItem };
}
