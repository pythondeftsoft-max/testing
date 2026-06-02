import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

async function callHudEngine(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke('hud-intelligence-engine', {
    body,
  });
  // With 200-always responses, supabase SDK won't throw on status codes
  // but may still error on network issues
  if (error) {
    // Try to parse error body for our structured response
    if (typeof error === 'object' && 'context' in error) {
      try {
        const parsed = JSON.parse((error as any).context?.body || '{}');
        if (parsed?.error) throw new Error(parsed.error);
      } catch (_) { /* fall through */ }
    }
    throw new Error(error.message || 'Failed to fetch HUD data');
  }
  if (!data?.success) throw new Error(data?.error || 'HUD API returned an error');
  return data.data;
}

export function useHudFmr(zip: string, bedrooms: number, enabled = false) {
  return useQuery({
    queryKey: ['hud-fmr', zip, bedrooms],
    queryFn: () => callHudEngine({ mode: 'fmr', zip, bedrooms }),
    enabled: enabled && !!zip,
    staleTime: 24 * 60 * 60 * 1000, // 24h cache
    retry: 1,
  });
}

export function useHudEligibility(zip: string, householdSize: number, annualIncome: number, enabled = false) {
  return useQuery({
    queryKey: ['hud-eligibility', zip, householdSize, annualIncome],
    queryFn: () => callHudEngine({ mode: 'eligibility', zip, householdSize, annualIncome }),
    enabled: enabled && !!zip,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

export function useHudDemand(zip: string, enabled = false) {
  return useQuery({
    queryKey: ['hud-demand', zip],
    queryFn: () => callHudEngine({ mode: 'demand', zip }),
    enabled: enabled && !!zip,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
