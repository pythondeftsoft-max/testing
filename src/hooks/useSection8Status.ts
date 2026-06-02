import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSection8Status() {
  const [isLinked, setIsLinked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Check by landlord_id first
        const { data: byId } = await supabase
          .from('agency_landlords')
          .select('id')
          .eq('landlord_id', user.id)
          .limit(1);

        if (byId && byId.length > 0) {
          setIsLinked(true);
          setLoading(false);
          return;
        }

        // Fallback: check by email
        if (user.email) {
          const { data: byEmail } = await supabase
            .from('agency_landlords')
            .select('id')
            .eq('landlord_email', user.email)
            .limit(1);

          setIsLinked(!!(byEmail && byEmail.length > 0));
        }
      } catch (err) {
        console.error('useSection8Status error:', err);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, []);

  return { isLinked, loading };
}
