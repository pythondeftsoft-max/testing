import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseUnitRealTimeUpdatesProps {
  unitId: string;
  onUpdate: (updatedData: any) => void;
}

export const useUnitRealTimeUpdates = ({ unitId, onUpdate }: UseUnitRealTimeUpdatesProps) => {
  useEffect(() => {
    if (!unitId) return;

    const channel = supabase
      .channel(`unit-${unitId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'property_units',
          filter: `id=eq.${unitId}`
        },
        (payload) => {
          console.log('Unit updated:', payload.new);
          onUpdate(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitId, onUpdate]);
};