import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface RecipientOption {
  id: string;
  name: string;
  email: string | null;
}

interface RecipientPickerProps {
  type?: 'tenant' | 'landlord' | 'staff' | 'all';
  agencyId?: string;
  value: string | null;
  onChange: (recipient: RecipientOption | null) => void;
  placeholder?: string;
  className?: string;
}

const displayName = (p: { first_name: string | null; last_name: string | null; email: string | null }) =>
  [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Unknown';

const RecipientPicker: React.FC<RecipientPickerProps> = ({
  type = 'all',
  agencyId,
  value,
  onChange,
  placeholder = 'Search by name or email...',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<RecipientOption[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name')
        .limit(300);

      if (data) {
        setOptions(data.map((p: any) => ({
          id: p.id,
          name: displayName(p),
          email: p.email,
        })));
        // If value is set, find the label
        if (value) {
          const match = data.find((p: any) => p.id === value);
          if (match) setSelectedLabel(displayName(match));
        }
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.name.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q));
  }, [options, search]);

  const handleSelect = (opt: RecipientOption) => {
    onChange(opt);
    setSelectedLabel(opt.name);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSelectedLabel(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`w-full justify-start text-left font-normal ${className || ''}`}>
          <Search className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
          {selectedLabel ? (
            <span className="flex-1 truncate">{selectedLabel}</span>
          ) : (
            <span className="text-muted-foreground flex-1">{placeholder}</span>
          )}
          {selectedLabel && (
            <X className="w-3.5 h-3.5 ml-1 text-muted-foreground hover:text-foreground" onClick={handleClear} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No results found</CommandEmpty>
            <CommandGroup>
              {filtered.slice(0, 50).map(opt => (
                <CommandItem key={opt.id} onSelect={() => handleSelect(opt)}>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{opt.name}</p>
                    {opt.email && <p className="text-xs text-muted-foreground truncate">{opt.email}</p>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default RecipientPicker;
