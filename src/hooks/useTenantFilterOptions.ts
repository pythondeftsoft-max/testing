import { useMemo } from 'react';
import { FinderTenant } from './usePropertyFinder';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export const useTenantFilterOptions = (tenants: FinderTenant[]) => {
  return useMemo(() => {
    const stateMap = new Map<string, number>();
    const cityMap = new Map<string, number>();
    const phaMap = new Map<string, { name: string; count: number }>();

    tenants.forEach(t => {
      if (t.state && t.state !== 'N/A') {
        stateMap.set(t.state, (stateMap.get(t.state) || 0) + 1);
      }
      if (t.city && t.city !== 'N/A') {
        const key = `${t.city}|${t.state || ''}`;
        cityMap.set(key, (cityMap.get(key) || 0) + 1);
      }
      if (t.housing_authority_id && t.housing_authority_name) {
        const existing = phaMap.get(t.housing_authority_id);
        phaMap.set(t.housing_authority_id, {
          name: t.housing_authority_name,
          count: (existing?.count || 0) + 1,
        });
      }
    });

    const states: FilterOption[] = Array.from(stateMap.entries())
      .map(([s, c]) => ({ value: s, label: s, count: c }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const cities: FilterOption[] = Array.from(cityMap.entries())
      .map(([key, count]) => {
        const [city, state] = key.split('|');
        return { value: key, label: state ? `${city}, ${state}` : city, count };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    const housingAuthorities: FilterOption[] = Array.from(phaMap.entries())
      .map(([id, { name, count }]) => ({ value: id, label: name, count }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return { states, cities, housingAuthorities };
  }, [tenants]);
};
