import { 
  OWNER_OPERATED_SUBTYPES, 
  TENANT_MANAGED_TYPES,
  TYPICALLY_OWNER_OPERATED_TYPES,
  INVESTMENT_ONLY_ASSET_CATEGORIES,
  AssetWorkflowType
} from '@/constants/assetBehavior';
import { CommercialPropertyType, CommercialSubType } from '@/types/commercial';
import { PortfolioAsset } from '@/types/portfolio-assets';
import { debugLog } from '@/utils/debug';

// Property-like object interface for type checking
interface PropertyLike {
  property_type?: string;
  commercial_type?: CommercialPropertyType;
  commercial_subtype?: CommercialSubType;
  is_owner_operated?: boolean;
  asset_category?: string;
}

/**
 * Determines if a commercial property should be owner-operated based on type/subtype
 */
export const isOwnerOperatedAsset = (
  commercialType?: CommercialPropertyType, 
  commercialSubtype?: CommercialSubType
): boolean => {
  // If subtype is explicitly owner-operated, return true
  if (commercialSubtype && OWNER_OPERATED_SUBTYPES.includes(commercialSubtype)) {
    return true;
  }

  // If commercial type is typically owner-operated
  if (commercialType && TYPICALLY_OWNER_OPERATED_TYPES.includes(commercialType)) {
    return true;
  }

  return false;
};

/**
 * Checks if an asset supports tenant management features
 */
export const supportsTenantManagement = (asset: PropertyLike | PortfolioAsset): boolean => {
  const propertyLike = asset as PropertyLike;
  
  debugLog('supportsTenantManagement', 'Evaluating asset', {
    hasAssetCategory: 'asset_category' in asset,
    asset_category: 'asset_category' in asset ? (asset as any).asset_category : undefined,
    property_type: propertyLike.property_type,
    commercial_type: propertyLike.commercial_type,
    commercial_subtype: propertyLike.commercial_subtype,
    is_owner_operated: propertyLike.is_owner_operated
  });

  // Portfolio assets don't support tenant management - check for specific portfolio fields
  const isPortfolioAsset = 'asset_category_id' in asset || 
    ('portfolio_id' in asset && 'asset_name' in asset);
  
  if (isPortfolioAsset) {
    debugLog('supportsTenantManagement', 'Portfolio asset - no tenant management', false);
    return false;
  }

  // If explicitly marked as owner-operated, no tenant management
  if (propertyLike.is_owner_operated === true) {
    debugLog('supportsTenantManagement', 'Explicitly owner-operated - no tenant management', false);
    return false;
  }

  // For non-commercial properties, assume residential which supports tenant management
  if (!propertyLike.property_type || propertyLike.property_type === 'residential') {
    debugLog('supportsTenantManagement', 'Residential property - supports tenant management', true);
    return true;
  }

  // For commercial properties, check if it's an owner-operated type or subtype
  if (propertyLike.commercial_type && propertyLike.commercial_subtype) {
    // Check if the subtype is always owner-operated
    const isOwnerOp = isOwnerOperatedAsset(propertyLike.commercial_type, propertyLike.commercial_subtype);
    if (isOwnerOp) {
      debugLog('supportsTenantManagement', 'Owner-operated commercial subtype - no tenant management', false);
      return false;
    }
  }

  // For commercial types that support tenant management
  if (propertyLike.commercial_type && TENANT_MANAGED_TYPES.includes(propertyLike.commercial_type)) {
    debugLog('supportsTenantManagement', 'Tenant-managed commercial type - supports tenant management', true);
    return true;
  }

  // Default to supporting tenant management for unclear cases
  debugLog('supportsTenantManagement', 'Default case - supports tenant management', true);
  return true;
};

/**
 * Identifies pure investment tracking assets (portfolio assets only)
 */
export const isInvestmentTrackingOnly = (asset: PropertyLike | PortfolioAsset): boolean => {
  // If it's a portfolio asset with investment-only category
  if ('asset_category_id' in asset) {
    return true; // All portfolio assets are investment tracking
  }

  return false;
};

/**
 * Returns the workflow type for an asset
 */
export const getAssetWorkflowType = (asset: PropertyLike | PortfolioAsset): AssetWorkflowType => {
  const propertyLike = asset as PropertyLike;
  
  // Portfolio assets are always investment-only
  if ('asset_category_id' in asset) {
    return 'investment-only';
  }

  // If explicitly owner-operated or auto-determined as such
  if (propertyLike.is_owner_operated === true || 
      isOwnerOperatedAsset(propertyLike.commercial_type, propertyLike.commercial_subtype)) {
    return 'owner-operated';
  }

  // If it supports tenant management
  if (supportsTenantManagement(asset)) {
    return 'tenant-managed';
  }

  // Default to investment-only for edge cases
  return 'investment-only';
};

/**
 * Checks if a commercial subtype should auto-set owner-operated flag
 */
export const shouldAutoSetOwnerOperated = (
  commercialType?: CommercialPropertyType,
  commercialSubtype?: CommercialSubType
): boolean => {
  return isOwnerOperatedAsset(commercialType, commercialSubtype);
};

/**
 * Gets appropriate financial update frequency suggestions based on asset type
 */
export const getSuggestedReminderFrequency = (asset: PropertyLike | PortfolioAsset): 'quarterly' | 'semi-annual' | 'annual' => {
  const workflowType = getAssetWorkflowType(asset);
  
  switch (workflowType) {
    case 'owner-operated':
      return 'quarterly'; // Business operations change frequently
    case 'investment-only':
      return 'semi-annual'; // Less frequent updates needed
    case 'tenant-managed':
      return 'annual'; // Rent rolls are fairly stable
    default:
      return 'annual';
  }
};

/**
 * Checks if an asset should show financial reminder options
 */
export const shouldShowReminderOptions = (asset: PropertyLike | PortfolioAsset): boolean => {
  const workflowType = getAssetWorkflowType(asset);
  
  // Only owner-operated properties and investment-only assets should have reminder options
  return workflowType === 'owner-operated' || workflowType === 'investment-only';
};

/**
 * Gets display labels for asset workflow types
 */
export const getAssetWorkflowLabel = (workflowType: AssetWorkflowType): string => {
  switch (workflowType) {
    case 'tenant-managed':
      return 'Tenant-Managed Property';
    case 'owner-operated':
      return 'Owner-Operated Business Asset';
    case 'investment-only':
      return 'Investment Tracking Only';
    default:
      return 'Unknown Asset Type';
  }
};

/**
 * Gets description for asset workflow types
 */
export const getAssetWorkflowDescription = (workflowType: AssetWorkflowType): string => {
  switch (workflowType) {
    case 'tenant-managed':
      return 'Full property management with tenant features, applications, and rent collection.';
    case 'owner-operated':
      return 'Business asset with financial tracking. No tenant management features.';
    case 'investment-only':
      return 'Pure investment tracking for portfolio analysis and tax reporting.';
    default:
      return '';
  }
};