import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the address (or `[VAWA PROTECTED]` placeholder) for a given user,
 * applying VAWA address masking server-side via `mask_vawa_location`.
 *
 * Pass the viewer's user_id so the helper can decide whether to unmask
 * (assigned caseworker / agency admin / the user themselves).
 */
export const useVawaMask = (
  subjectUserId: string | null | undefined,
  rawAddress: string | null | undefined,
  viewerUserId: string | null | undefined,
) => {
  return useQuery({
    queryKey: ['vawa-mask', subjectUserId, rawAddress, viewerUserId],
    enabled: !!subjectUserId && !!viewerUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('mask_vawa_location', {
        _user_id: subjectUserId,
        _address: rawAddress ?? '',
        _viewer_id: viewerUserId,
      });
      if (error) throw error;
      return (data as string) ?? '';
    },
    staleTime: 5 * 60_000,
  });
};
