export interface AssetCategory {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon_name?: string;
  color_theme: string;
  is_active: boolean;
  metadata_schema: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Added to align with DB column and UI usage
  subcategories?: Array<{ value: string; label: string }>;
}

export interface PortfolioAsset {
  id: string;
  portfolio_id: string;
  asset_category_id: string;
  asset_name: string;
  asset_description?: string;
  asset_value: number;
  acquisition_date?: string;
  acquisition_cost?: number;
  current_value?: number;
  annual_income: number;
  annual_expenses: number;
  metadata: Record<string, any>;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // International location support
  location_country?: string;
  registration_country?: string;
  location_metadata?: {
    latitude?: number;
    longitude?: number;
    marina_berth?: string;
    hangar_code?: string;
    storage_facility?: string;
    vault_location?: string;
    registration_number?: string;
    current_location?: string;
    home_base?: string;
    insurance_location?: string;
    operational_locations?: string[];
    geocoded_at?: string;
    [key: string]: any;
  };
  // Relations
  asset_category?: AssetCategory;
}

export interface AssetRelationship {
  id: string;
  parent_asset_id: string;
  child_asset_id: string;
  relationship_type: string;
  relationship_data: Record<string, any>;
  created_at: string;
  // Relations
  parent_asset?: PortfolioAsset;
  child_asset?: PortfolioAsset;
}

export interface AssetValuation {
  id: string;
  asset_id: string;
  valuation_date: string;
  market_value: number;
  appraised_value?: number;
  valuation_method: 'market' | 'appraisal' | 'cost' | 'income';
  notes?: string;
  created_by?: string;
  created_at: string;
  // Relations
  asset?: PortfolioAsset;
}

export interface PortfolioAssetSummary {
  total_assets: number;
  total_value: number;
  total_annual_income: number;
  total_annual_expenses: number;
  net_annual_income: number;
  asset_categories: AssetCategoryBreakdown[];
}

export interface AssetCategoryBreakdown {
  category_id: string;
  category_name: string;
  display_name: string;
  count: number;
  total_value: number;
  color_theme: string;
}

export interface CreateAssetParams {
  portfolio_id: string;
  asset_category_id: string;
  asset_name: string;
  asset_description?: string;
  asset_value?: number;
  acquisition_date?: Date | string;
  acquisition_cost?: number;
  current_value?: number;
  annual_income?: number;
  annual_expenses?: number;
  metadata?: Record<string, any>;
  tags?: string[];
  // International location support
  location_country?: string;
  registration_country?: string;
  location_metadata?: Record<string, any>;
}

export interface UpdateAssetParams extends Partial<CreateAssetParams> {
  id: string;
}

export interface CreateAssetRelationshipParams {
  parent_asset_id: string;
  child_asset_id: string;
  relationship_type: string;
  relationship_data?: Record<string, any>;
}

export interface CreateAssetValuationParams {
  asset_id: string;
  valuation_date: string;
  market_value: number;
  appraised_value?: number;
  valuation_method?: 'market' | 'appraisal' | 'cost' | 'income';
  notes?: string;
}
