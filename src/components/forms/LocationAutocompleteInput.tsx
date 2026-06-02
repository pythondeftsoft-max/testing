import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface LocationResult {
  city: string;
  state: string;
  zipcode: string;
  displayText: string;
}

interface LocationAutocompleteInputProps {
  value: string;
  onLocationSelect: (location: LocationResult) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '';

export const LocationAutocompleteInput = ({
  value,
  onLocationSelect,
  placeholder = "City, State or Zip...",
  disabled = false,
  className = ""
}: LocationAutocompleteInputProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedSearch = useDebounce(inputValue, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync with external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

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

  // Fetch location suggestions from Mapbox
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setSuggestions([]);
        return;
      }

      if (!MAPBOX_TOKEN) {
        console.warn('Mapbox token not configured');
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(debouncedSearch)}.json?` +
          `country=us&types=place,postcode,region&limit=5&access_token=${MAPBOX_TOKEN}`
        );

        if (!response.ok) throw new Error('Geocoding failed');

        const data = await response.json();
        setSuggestions(data.features || []);
        setShowDropdown(data.features && data.features.length > 0);
      } catch (error) {
        console.error('Location autocomplete error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedSearch]);

  const parseMapboxLocation = (feature: any): LocationResult => {
    const context = feature.context || [];
    let city = '';
    let state = '';
    let zipcode = '';

    // Determine primary type
    const featureType = feature.place_type?.[0] || '';

    if (featureType === 'place') {
      // This is a city
      city = feature.text;
    } else if (featureType === 'postcode') {
      // This is a zipcode
      zipcode = feature.text;
    } else if (featureType === 'region') {
      // This is a state
      state = feature.text;
    }

    // Extract additional context
    context.forEach((item: any) => {
      if (item.id.startsWith('postcode') && !zipcode) {
        zipcode = item.text;
      } else if (item.id.startsWith('place') && !city) {
        city = item.text;
      } else if (item.id.startsWith('region') && !state) {
        state = item.short_code?.replace('US-', '') || item.text;
      }
    });

    return {
      city,
      state,
      zipcode,
      displayText: feature.place_name
    };
  };

  const handleSelectSuggestion = (feature: any) => {
    const parsed = parseMapboxLocation(feature);
    setInputValue(parsed.displayText);
    onLocationSelect(parsed);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // If input is cleared, reset location
    if (!newValue) {
      onLocationSelect({ city: '', state: '', zipcode: '', displayText: '' });
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pr-10", className)}
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

      {showDropdown && suggestions.length === 0 && !isLoading && debouncedSearch.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center">
          No locations found
        </div>
      )}
    </div>
  );
};
