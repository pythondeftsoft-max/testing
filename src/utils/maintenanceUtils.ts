
export const MAINTENANCE_SPECIALTIES = [
  'plumbing',
  'electrical',
  'hvac',
  'carpentry',
  'painting',
  'landscaping',
  'appliance_repair',
  'general_handyman',
  'flooring',
  'roofing',
  'cleaning',
  'pest_control'
];

export const MAINTENANCE_CATEGORIES = [
  'heat',
  'electrical',
  'appliances',
  'water',
  'other'
];

// Display names for categories (what users see in UI)
export const CATEGORY_DISPLAY_NAMES = {
  heat: 'Heat',
  electrical: 'Electrical',
  appliances: 'Appliances',
  water: 'Water',
  other: 'Other',
  // Legacy categories for backward compatibility
  plumbing: 'Water',
  hvac: 'Heat',
  appliance_repair: 'Appliances',
  flooring: 'Other',
  painting: 'Other',
  roofing: 'Other',
  landscaping: 'Other',
  cleaning: 'Other',
  pest_control: 'Other',
  security_systems: 'Other'
} as const;

export const MAINTENANCE_PRIORITIES = [
  'low',
  'medium', 
  'high'
];

export const formatSpecialty = (specialty: string): string => {
  return specialty
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const getSpecialtyColor = (specialty: string): string => {
  const colors = {
    heat: 'text-orange-600 bg-orange-50',
    electrical: 'text-yellow-600 bg-yellow-50',
    appliances: 'text-red-600 bg-red-50',
    water: 'text-blue-600 bg-blue-50',
    other: 'text-gray-600 bg-gray-50',
    // Legacy categories for backward compatibility
    plumbing: 'text-blue-600 bg-blue-50',
    hvac: 'text-orange-600 bg-orange-50',
    appliance_repair: 'text-red-600 bg-red-50',
    carpentry: 'text-gray-600 bg-gray-50',
    painting: 'text-purple-600 bg-purple-50',
    landscaping: 'text-emerald-600 bg-emerald-50',
    general_handyman: 'text-gray-600 bg-gray-50',
    flooring: 'text-indigo-600 bg-indigo-50',
    roofing: 'text-slate-600 bg-slate-50',
    cleaning: 'text-teal-600 bg-teal-50',
    pest_control: 'text-rose-600 bg-rose-50'
  };
  return colors[specialty as keyof typeof colors] || 'text-gray-600 bg-gray-50';
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};
