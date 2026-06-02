import { DataQualityScore, PropertyDataQuality } from '@/components/reporting/DataCompletenessIndicator';
import { DataSource } from '@/components/reporting/DataSourceLabel';

interface PropertyFinancialData {
  id: string;
  address: string;
  monthly_rent?: number | null;
  security_deposit_amount?: number | null;
  current_market_value?: number | null;
  purchase_price?: number | null;
  outstanding_mortgage_balance?: number | null;
  cash_reserves?: number | null;
  accounts_payable?: number | null;
  prepaid_expenses?: number | null;
  accumulated_depreciation?: number | null;
  insurance_cost?: number | null;
  repair_costs?: number | null;
  management_fee?: number | null;
  mortgage_cost?: number | null;
}

export interface FinancialDataAssessment {
  value: number;
  source: DataSource;
  description: string;
}

const CRITICAL_FIELDS = [
  'monthly_rent',
  'current_market_value',
  'purchase_price'
];

const IMPORTANT_FIELDS = [
  'security_deposit_amount',
  'outstanding_mortgage_balance',
  'cash_reserves'
];

const OPTIONAL_FIELDS = [
  'accounts_payable',
  'prepaid_expenses',
  'accumulated_depreciation',
  'insurance_cost',
  'repair_costs',
  'management_fee',
  'mortgage_cost'
];

export const assessPropertyDataQuality = (property: PropertyFinancialData): DataQualityScore => {
  const missingFields: string[] = [];
  const estimatedFields: string[] = [];
  const realFields: string[] = [];

  let score = 0;
  let maxScore = 0;

  // Check critical fields (60% of score)
  CRITICAL_FIELDS.forEach(field => {
    maxScore += 20; // 60 points total
    const value = property[field as keyof PropertyFinancialData] as number;
    
    if (value && value > 0) {
      score += 20;
      realFields.push(getFieldDisplayName(field));
    } else {
      missingFields.push(getFieldDisplayName(field));
      // Add partial score for estimated values
      if (field === 'current_market_value' && property.monthly_rent) {
        score += 10;
        estimatedFields.push(getFieldDisplayName(field));
      }
    }
  });

  // Check important fields (30% of score)
  IMPORTANT_FIELDS.forEach(field => {
    maxScore += 10; // 30 points total
    const value = property[field as keyof PropertyFinancialData] as number;
    
    if (value && value > 0) {
      score += 10;
      realFields.push(getFieldDisplayName(field));
    } else {
      missingFields.push(getFieldDisplayName(field));
    }
  });

  // Check optional fields (10% of score)
  OPTIONAL_FIELDS.forEach(field => {
    maxScore += 1; // 7 points total
    const value = property[field as keyof PropertyFinancialData] as number;
    
    if (value && value > 0) {
      score += 1;
      realFields.push(getFieldDisplayName(field));
    }
  });

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  let completeness: DataQualityScore['completeness'];
  if (percentage >= 90) completeness = 'excellent';
  else if (percentage >= 70) completeness = 'good';
  else if (percentage >= 40) completeness = 'partial';
  else completeness = 'poor';

  return {
    score: percentage,
    completeness,
    missingFields: [...new Set(missingFields)],
    estimatedFields: [...new Set(estimatedFields)],
    realFields: [...new Set(realFields)]
  };
};

export const assessFinancialDataSource = (
  value: number,
  originalValue: number | null | undefined,
  fieldName: string,
  monthlyRent?: number
): FinancialDataAssessment => {
  // Real data - value exists in database
  if (originalValue && originalValue > 0) {
    return {
      value,
      source: 'real',
      description: `Actual ${getFieldDisplayName(fieldName)} from your records`
    };
  }

  // Estimated data - calculated from other available data
  if (fieldName === 'current_market_value' && monthlyRent && monthlyRent > 0) {
    return {
      value,
      source: 'estimated',
      description: `Estimated as ${value / monthlyRent} months of rent (${monthlyRent}/month)`
    };
  }

  // Default/fallback values
  if (value > 0) {
    return {
      value,
      source: 'estimated',
      description: `Default estimate - please update with actual ${getFieldDisplayName(fieldName)}`
    };
  }

  // Missing data
  return {
    value: 0,
    source: 'missing',
    description: `${getFieldDisplayName(fieldName)} not provided`
  };
};

export const calculatePropertiesDataQuality = (properties: PropertyFinancialData[]): PropertyDataQuality[] => {
  return properties.map(property => ({
    propertyId: property.id,
    propertyAddress: property.address,
    quality: assessPropertyDataQuality(property)
  }));
};

const getFieldDisplayName = (field: string): string => {
  const fieldNames: Record<string, string> = {
    'monthly_rent': 'Monthly Rent',
    'security_deposit_amount': 'Security Deposit',
    'current_market_value': 'Current Market Value',
    'purchase_price': 'Purchase Price',
    'outstanding_mortgage_balance': 'Outstanding Mortgage',
    'cash_reserves': 'Cash Reserves',
    'accounts_payable': 'Accounts Payable',
    'prepaid_expenses': 'Prepaid Expenses',
    'accumulated_depreciation': 'Accumulated Depreciation',
    'insurance_cost': 'Insurance Cost',
    'repair_costs': 'Repair Costs',
    'management_fee': 'Management Fee',
    'mortgage_cost': 'Mortgage Cost'
  };
  
  return fieldNames[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};