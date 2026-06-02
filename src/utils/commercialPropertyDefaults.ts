import { CommercialPropertyType, CommercialSubType } from '@/types/commercial';
import { shouldAutoSetOwnerOperated } from '@/utils/assetBehaviorUtils';

/**
 * Get default form values for commercial properties based on type/subtype
 */
export const getCommercialPropertyDefaults = (
  commercialType?: CommercialPropertyType,
  commercialSubtype?: CommercialSubType
) => {
  const defaults: any = {};
  
  // Auto-set owner-operated status
  if (commercialType || commercialSubtype) {
    defaults.is_owner_operated = shouldAutoSetOwnerOperated(commercialType, commercialSubtype);
  }
  
  return defaults;
};

/**
 * Check if the owner-operated field should be read-only
 */
export const isOwnerOperatedFieldReadonly = (
  commercialType?: CommercialPropertyType,
  commercialSubtype?: CommercialSubType
): boolean => {
  // Field is read-only when we auto-set it to true for owner-operated asset types
  return shouldAutoSetOwnerOperated(commercialType, commercialSubtype);
};

/**
 * Get help text explaining the owner-operated field behavior
 */
export const getOwnerOperatedHelpText = (
  commercialType?: CommercialPropertyType,
  commercialSubtype?: CommercialSubType
): string => {
  if (shouldAutoSetOwnerOperated(commercialType, commercialSubtype)) {
    return "This property type is automatically set as owner-operated as it typically doesn't support tenant management.";
  }
  
  return "Check this if you operate the business yourself. Leave unchecked if you rent out the space to other businesses.";
};