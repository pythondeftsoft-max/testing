
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Search, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HousingAuthority {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  pha_code: string | null;
}

interface HousingAuthoritySelectorProps {
  value?: string; // housing_authority_id
  textValue?: string; // legacy text fallback for display
  onSelect: (authority: { id: string; name: string } | null) => void;
  stateFilter?: string; // auto-filter by tenant's state
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const HousingAuthoritySelector: React.FC<HousingAuthoritySelectorProps> = ({
  value,
  textValue,
  onSelect,
  stateFilter,
  placeholder = 'Select housing authority...',
  required = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [authorities, setAuthorities] = useState<HousingAuthority[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState<string>('');

  // Fetch authorities
  useEffect(() => {
    const fetchAuthorities = async () => {
      setLoading(true);
      let allData: HousingAuthority[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        let query = supabase
          .from('housing_authorities')
          .select('id, name, city, state, pha_code')
          .order('name')
          .range(from, from + batchSize - 1);
        if (stateFilter) {
          query = query.eq('state', stateFilter);
        }
        const { data, error } = await query;
        if (error || !data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      setAuthorities(allData);
      setLoading(false);
    };
    fetchAuthorities();
  }, [stateFilter]);

  // Resolve selected name from value
  useEffect(() => {
    if (value && authorities.length > 0) {
      const found = authorities.find(a => a.id === value);
      if (found) {
        setSelectedName(found.name);
      }
    } else if (!value) {
      setSelectedName('');
    }
  }, [value, authorities]);

  const filtered = useMemo(() => {
    if (!search.trim()) return authorities;
    const q = search.toLowerCase();
    return authorities.filter(
      a =>
        a.name?.toLowerCase().includes(q) ||
        a.city?.toLowerCase().includes(q) ||
        a.pha_code?.toLowerCase().includes(q)
    );
  }, [search, authorities]);

  const displayValue = selectedName || textValue || '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal h-10',
            !displayValue && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {displayValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search by name, city, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10"
          />
        </div>
        <ScrollArea className="max-h-[250px]">
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Loading agencies...</div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {authorities.length === 0 ? 'No agencies loaded yet' : 'No matching agencies found'}
            </div>
          ) : (
            <div className="p-1">
              {filtered.map((authority) => (
                <button
                  key={authority.id}
                  type="button"
                  className={cn(
                    'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    value === authority.id && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => {
                    onSelect({ id: authority.id, name: authority.name });
                    setSelectedName(authority.name);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === authority.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{authority.name}</span>
                    {authority.city && (
                      <span className="text-xs text-muted-foreground">
                        {authority.city}, {authority.state}
                        {authority.pha_code ? ` · ${authority.pha_code}` : ''}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
