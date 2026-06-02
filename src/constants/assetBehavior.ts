
// Asset behavior categorization constants

import { CommercialPropertyType, CommercialSubType } from '@/types/commercial';

// Commercial property types that support tenant management
export const TENANT_MANAGED_TYPES: CommercialPropertyType[] = [
  'office',
  'retail', // Note: Some retail subtypes are owner-operated
  'warehouse',
  'industrial',
  'mixed_use'
];

// Commercial subtypes that are ALWAYS owner-operated (no tenant management)
export const OWNER_OPERATED_SUBTYPES: CommercialSubType[] = [
  'hotel',
  'motel',
  'resort',
  'bed_and_breakfast',
  'casino',
  'event_venue',
  'restaurant',
  'golf_course',
  'prison',
  'medical', // When standalone medical facilities
  'marina', // Marinas work like investment tracking with manual financial input
  'campground',
  'car_wash',
  'sports_facility',
  'vineyard'
];

// Portfolio asset categories for pure investment tracking
export const INVESTMENT_ONLY_ASSET_CATEGORIES = [
  'stocks',
  'crypto',
  'business_holding',
  'vehicle',
  'other'
];

// Asset workflow types
export type AssetWorkflowType = 'tenant-managed' | 'owner-operated' | 'investment-only';

// Commercial types that can be either tenant-managed or owner-operated
export const FLEXIBLE_COMMERCIAL_TYPES: CommercialPropertyType[] = [
  'office',
  'retail',
  'warehouse',
  'industrial'
];

// Commercial types that are typically owner-operated
export const TYPICALLY_OWNER_OPERATED_TYPES: CommercialPropertyType[] = [
  'hospitality',
  'specialty'
];

// Reminder frequencies
export const REMINDER_FREQUENCIES = [
  { value: 'quarterly', label: 'Quarterly (3 months)' },
  { value: 'semi-annual', label: 'Semi-Annual (6 months)' },
  { value: 'annual', label: 'Annual (12 months)' }
] as const;

export type ReminderFrequency = 'quarterly' | 'semi-annual' | 'annual';
