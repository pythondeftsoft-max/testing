import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface AddressResult {
  streetAddress: string;
  city: string;
  state: string;
  zipcode: string;
  latitude: number;
  longitude: number;
  fullAddress: string;
  country?: string;
}

interface AddressAutocompleteInputProps {
  value: string;
  onAddressSelect: (address: AddressResult) => void;
  placeholder?: string;
  disabled?: boolean;
  countryCode?: string;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '';

export const AddressAutocompleteInput = ({
  value,
  onAddressSelect,
  placeholder = "Start typing an address...",
  disabled = false,
  countryCode = 'us'
}: AddressAutocompleteInputProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedSearch = useDebounce(inputValue, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
    const fetchSuggestions = async () => {
      if (!debouncedSearch || debouncedSearch.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(debouncedSearch)}.json?` +
          `country=${countryCode.toLowerCase()}&types=address&limit=5&access_token=${MAPBOX_TOKEN}`
        );

        if (!response.ok) throw new Error('Geocoding failed');

        const data = await response.json();
        setSuggestions(data.features || []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Autocomplete error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedSearch]);

  const parseMapboxResult = (feature: any): AddressResult => {
    const [longitude, latitude] = feature.center;
    const context = feature.context || [];
    
    // Extract address components
    let streetAddress = feature.text || '';
    const addressNum = feature.address;
    if (addressNum) {
      streetAddress = `${addressNum} ${streetAddress}`;
    }

    let city = '';
    let state = '';
    let zipcode = '';
    let country = '';

    context.forEach((item: any) => {
      if (item.id.startsWith('postcode')) {
        zipcode = item.text;
      } else if (item.id.startsWith('place')) {
        city = item.text;
      } else if (item.id.startsWith('region')) {
        // Remove country prefix from short_code (e.g., 'US-GA' -> 'GA')
        const shortCode = item.short_code || '';
        state = shortCode.includes('-') ? shortCode.split('-')[1] : (shortCode || item.text);
      } else if (item.id.startsWith('country')) {
        country = item.short_code?.toUpperCase() || item.text;
      }
    });

    return {
      streetAddress,
      city,
      state,
      zipcode,
      latitude,
      longitude,
      fullAddress: feature.place_name,
      country
    };
  };

  const handleSelectSuggestion = (feature: any) => {
    const parsed = parseMapboxResult(feature);
    setInputValue(parsed.fullAddress);
    onAddressSelect(parsed);
    setShowDropdown(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
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
              onClick={() => handleSelectSuggestion(feature)}
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
