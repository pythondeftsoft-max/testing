
import { useMemo } from 'react';
import { 
  getAssetWorkflowType, 
  supportsTenantManagement, 
  isInvestmentTrackingOnly,
  shouldShowReminderOptions,
  getSuggestedReminderFrequency,
  getAssetWorkflowLabel,
  getAssetWorkflowDescription
} from '@/utils/assetBehaviorUtils';
import { AssetWorkflowType } from '@/constants/assetBehavior';
import { PortfolioAsset } from '@/types/portfolio-assets';
import { CommercialPropertyType, CommercialSubType } from '@/types/commercial';
import { debugLog } from '@/utils/debug';

interface PropertyLike {
  property_type?: string;
  commercial_type?: CommercialPropertyType;
  commercial_subtype?: CommercialSubType;
  is_owner_operated?: boolean;
  asset_category?: string;
}

interface AssetBehavior {
  workflowType: AssetWorkflowType;
  supportsTenantManagement: boolean;
  isInvestmentTrackingOnly: boolean;
  shouldShowReminderOptions: boolean;
  suggestedReminderFrequency: 'quarterly' | 'semi-annual' | 'annual';
  workflowLabel: string;
  workflowDescription: string;
}

/**
 * Custom hook to determine asset behavior and capabilities
 */
export const useAssetBehavior = (asset: PropertyLike | PortfolioAsset | null): AssetBehavior => {
  return useMemo(() => {
    if (!asset) {
      return {
        workflowType: 'investment-only',
        supportsTenantManagement: false,
        isInvestmentTrackingOnly: true,
        shouldShowReminderOptions: false,
        suggestedReminderFrequency: 'annual',
        workflowLabel: 'Unknown Asset Type',
        workflowDescription: ''
      };
    }

    const workflowType = getAssetWorkflowType(asset);
    
    return {
      workflowType,
      supportsTenantManagement: supportsTenantManagement(asset),
      isInvestmentTrackingOnly: isInvestmentTrackingOnly(asset),
      shouldShowReminderOptions: shouldShowReminderOptions(asset),
      suggestedReminderFrequency: getSuggestedReminderFrequency(asset),
      workflowLabel: getAssetWorkflowLabel(workflowType),
      workflowDescription: getAssetWorkflowDescription(workflowType)
    };
  }, [asset]);
};

/**
 * Hook specifically for checking if tenant management should be shown
 */
export const useTenantManagementVisibility = (asset: PropertyLike | PortfolioAsset | null): boolean => {
  return useMemo(() => {
    if (!asset) {
      debugLog('useTenantManagementVisibility', 'No asset provided', null);
      return false;
    }
    
    const result = supportsTenantManagement(asset);
    debugLog('useTenantManagementVisibility', 'Tenant management visibility check', {
      asset: {
        property_type: (asset as PropertyLike).property_type,
        commercial_type: (asset as PropertyLike).commercial_type,
        commercial_subtype: (asset as PropertyLike).commercial_subtype,
        is_owner_operated: (asset as PropertyLike).is_owner_operated,
        asset_category: 'asset_category' in asset ? (asset as any).asset_category : undefined
      },
      result
    });
    
    return result;
  }, [asset]);
};

/**
 * Hook for getting reminder preferences for an asset
 */
export const useAssetReminderInfo = (asset: PropertyLike | PortfolioAsset | null) => {
  return useMemo(() => {
    if (!asset) {
      return {
        shouldShowReminderOptions: false,
        suggestedFrequency: 'annual' as const
      };
    }

    return {
      shouldShowReminderOptions: shouldShowReminderOptions(asset),
      suggestedFrequency: getSuggestedReminderFrequency(asset)
    };
  }, [asset]);
};
