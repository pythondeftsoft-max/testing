
import React from 'react';
import { Check, ChevronsUpDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCountries } from '@/hooks/useCountries';

interface CountrySelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  onValueChange,
  placeholder = "Select country...",
  disabled = false,
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const { data: countries = [], isLoading, isError, refetch } = useCountries();

  const selectedCountry = countries.find(country => country.id === value);

  // Show error state with retry option if query failed
  if (isError) {
    return (
      <Button
        variant="outline"
        className={cn("w-full justify-between text-destructive", className)}
        onClick={() => refetch()}
        disabled={disabled}
      >
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span>Error loading - tap to retry</span>
        </div>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled || isLoading}
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>
              {selectedCountry ? selectedCountry.name : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search countries..." />
          <CommandList 
            className="pointer-events-auto"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty>No countries found.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.id}
                  value={`${country.name} ${country.iso_code_2}`}
                  onSelect={() => {
                    onValueChange(country.id === value ? "" : country.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-muted px-1 rounded">
                      {country.iso_code_2}
                    </span>
                    <span>{country.name}</span>
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
