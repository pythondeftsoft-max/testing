import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '';

export const AddressAutocomplete = ({
  value,
  onChange,
  placeholder = "Start typing an address...",
  disabled = false,
}: AddressAutocompleteProps) => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [countryCode, setCountryCode] = useState('us');
  const debouncedSearch = useDebounce(inputValue, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch tenant's country from profile
  useEffect(() => {
    const fetchCountry = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('tenant_profiles')
        .select('country_code')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.country_code) {
        setCountryCode(data.country_code.toLowerCase());
      }
    };
    fetchCountry();
  }, [user?.id]);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions from Mapbox
  useEffect(() => {
    if (!MAPBOX_TOKEN || !debouncedSearch || debouncedSearch.length < 3) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(debouncedSearch)}.json?` +
          `country=${countryCode}&types=address&limit=5&access_token=${MAPBOX_TOKEN}`
        );
        if (!response.ok) throw new Error('Geocoding failed');
        const data = await response.json();
        setSuggestions(data.features || []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Address autocomplete error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedSearch, countryCode]);

  const handleSelect = (feature: any) => {
    const fullAddress = feature.place_name || '';
    setInputValue(fullAddress);
    onChange(fullAddress);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => handleSelect(feature)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                "flex items-start gap-2 transition-colors"
              )}
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{feature.text}</div>
                <div className="text-xs text-muted-foreground truncate">{feature.place_name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
