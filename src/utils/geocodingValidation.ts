/**
 * Geocoding validation utilities
 * Validates property coordinates and provides quality checks
 */

export interface GeocodingStatus {
  isValid: boolean;
  hasCoordinates: boolean;
  reason?: string;
  statusText: string;
  statusColor: 'green' | 'yellow' | 'red';
}

export interface CoordinateBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// US coordinate bounds (continental US + Alaska + Hawaii)
const US_BOUNDS: CoordinateBounds = {
  minLat: 18.9, // Hawaii
  maxLat: 71.5, // Alaska
  minLng: -179.0, // Alaska (Aleutian Islands)
  maxLng: -66.9, // Maine
};

// Continental US bounds (more strict)
const CONTINENTAL_US_BOUNDS: CoordinateBounds = {
  minLat: 24.0, // Florida Keys
  maxLat: 49.5, // Northern border
  minLng: -125.0, // West coast
  maxLng: -66.9, // East coast
};

/**
 * Validate if coordinates exist and are within reasonable bounds
 */
export function validatePropertyCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  state?: string | null,
  country: string = 'US'
): GeocodingStatus {
  // Check if coordinates exist
  if (!latitude || !longitude) {
    return {
      isValid: false,
      hasCoordinates: false,
      reason: 'Missing coordinates',
      statusText: 'Needs Location',
      statusColor: 'yellow',
    };
  }

  // Basic sanity check: valid lat/lng ranges
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return {
      isValid: false,
      hasCoordinates: true,
      reason: 'Invalid coordinate range',
      statusText: 'Invalid Location',
      statusColor: 'red',
    };
  }

  // Country-specific validation
  if (country === 'US') {
    // Check if coordinates are within US bounds
    if (
      latitude < US_BOUNDS.minLat ||
      latitude > US_BOUNDS.maxLat ||
      longitude < US_BOUNDS.minLng ||
      longitude > US_BOUNDS.maxLng
    ) {
      return {
        isValid: false,
        hasCoordinates: true,
        reason: 'Coordinates outside US',
        statusText: 'Wrong Location',
        statusColor: 'red',
      };
    }

    // Additional check for continental US if state is provided
    if (state && !['AK', 'HI'].includes(state.toUpperCase())) {
      if (
        latitude < CONTINENTAL_US_BOUNDS.minLat ||
        latitude > CONTINENTAL_US_BOUNDS.maxLat ||
        longitude < CONTINENTAL_US_BOUNDS.minLng ||
        longitude > CONTINENTAL_US_BOUNDS.maxLng
      ) {
        return {
          isValid: false,
          hasCoordinates: true,
          reason: `Coordinates don't match ${state} location`,
          statusText: 'Check Location',
          statusColor: 'red',
        };
      }
    }
  }

  // Coordinates are valid
  return {
    isValid: true,
    hasCoordinates: true,
    statusText: 'Mapped',
    statusColor: 'green',
  };
}

/**
 * Check if a property needs geocoding update
 */
export function needsGeocoding(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  const status = validatePropertyCoordinates(latitude, longitude);
  return !status.isValid || !status.hasCoordinates;
}

/**
 * Get user-friendly message for geocoding status
 */
export function getGeocodingMessage(status: GeocodingStatus): string {
  if (!status.hasCoordinates) {
    return 'This property needs map coordinates. Update the property to add its location.';
  }
  
  if (!status.isValid) {
    return `${status.reason}. Please verify the property address and update the map location.`;
  }
  
  return 'Property location is mapped and validated.';
}
