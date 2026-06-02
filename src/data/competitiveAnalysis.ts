export type FeatureStatus = 'live' | 'partial' | 'planned' | 'missing';

export interface CompetitorFeature {
  feature: string;
  us: FeatureStatus;
  competitors: Record<string, FeatureStatus>;
}

export interface CompetitorCategory {
  label: string;
  description: string;
  competitors: string[];
  features: CompetitorFeature[];
}

export const competitiveData: Record<string, CompetitorCategory> = {
  agencySystems: {
    label: 'Agency Software',
    description: 'Housing authority management systems used by PHAs nationwide',
    competitors: ['Yardi Voyager', 'Emphasys Elite', 'Tenmast WinTen'],
    features: [
      { feature: 'Waitlist Management', us: 'live', competitors: { 'Yardi Voyager': 'live', 'Emphasys Elite': 'live', 'Tenmast WinTen': 'live' } },
      { feature: 'Voucher Issuance & Tracking', us: 'live', competitors: { 'Yardi Voyager': 'live', 'Emphasys Elite': 'live', 'Tenmast WinTen': 'live' } },
      { feature: 'HAP Contract Management', us: 'live', competitors: { 'Yardi Voyager': 'live', 'Emphasys Elite': 'live', 'Tenmast WinTen': 'live' } },
      { feature: 'HAP Batch Payments', us: 'live', competitors: { 'Yardi Voyager': 'live', 'Emphasys Elite': 'live', 'Tenmast WinTen': 'partial' } },
      { feature: 'Recertification Workflow', us: 'live', competitors: { 'Yardi Voyager': 'live', 'Emphasys Elite': 'live', 'Tenmast WinTen': 'live' } },
      { feature: 'SEMAP Auto-Scoring', us: 'live', competitors: { 'Yardi Voyager': 'partial', 'Emphasys Elite': 'partial', 'Tenmast WinTen': 'missing' } },
      { feature: 'FSS Program Manager', us: 'live', competitors: { 'Yardi Voyager': 'partial', 'Emphasys Elite': 'missing', 'Tenmast WinTen': 'missing' } },
      { feature: 'Rent Reasonableness + Comps DB', us: 'live', competitors: { 'Yardi Voyager': 'partial', 'Emphasys Elite': 'missing', 'Tenmast WinTen': 'missing' } },
      { feature: 'Rent Reasonableness PDF Export', us: 'live', competitors: { 'Yardi Voyager': 'missing', 'Emphasys Elite': 'missing', 'Tenmast WinTen': 'missing' } },
      { feature: 'HQS Digital Inspections', us: 'live', competitors: { 'Yardi Voyager': 'live', 'Emphasys Elite': 'partial', 'Tenmast WinTen': 'live' } },
      { feature: 'Informal Hearings Tracker', us: 'live', competitors: { 'Yardi Voyager': 'partial', 'Emphasys Elite': 'missing', 'Tenmast WinTen': 'missing' } },
      { feature: 'Portability (Port-In/Out)', us: 'live', competitors: { 'Yardi Voyager': 'live', 'Emphasys Elite': 'live', 'Tenmast WinTen': 'partial' } },
      { feature: 'Income Limits / Payment Standards', us: 'live', competitors: { 'Yardi Voyager': 'live', 'Emphasys Elite': 'live', 'Tenmast WinTen': 'live' } },
      { feature: 'Utility Allowance Schedules', us: 'live', competitors: { 'Yardi Voyager': 'live', 'Emphasys Elite': 'live', 'Tenmast WinTen': 'live' } },
      { feature: 'Staff Role-Based Access', us: 'live', competitors: { 'Yardi Voyager': 'live', 'Emphasys Elite': 'live', 'Tenmast WinTen': 'partial' } },
      { feature: 'Audit Trail / Activity Log', us: 'live', competitors: { 'Yardi Voyager': 'live', 'Emphasys Elite': 'partial', 'Tenmast WinTen': 'missing' } },
      { feature: 'Multi-Office Support', us: 'live', competitors: { 'Yardi Voyager': 'live', 'Emphasys Elite': 'partial', 'Tenmast WinTen': 'missing' } },
      { feature: 'Automated Reminders & Notices', us: 'live', competitors: { 'Yardi Voyager': 'partial', 'Emphasys Elite': 'partial', 'Tenmast WinTen': 'missing' } },
      { feature: 'Built-in Messaging (Staff↔Tenant)', us: 'live', competitors: { 'Yardi Voyager': 'missing', 'Emphasys Elite': 'missing', 'Tenmast WinTen': 'missing' } },
      { feature: 'Tenant Self-Service Portal', us: 'live', competitors: { 'Yardi Voyager': 'partial', 'Emphasys Elite': 'missing', 'Tenmast WinTen': 'missing' } },
      { feature: 'Cloud-Native / No On-Prem', us: 'live', competitors: { 'Yardi Voyager': 'live', 'Emphasys Elite': 'partial', 'Tenmast WinTen': 'missing' } },
      { feature: 'Modern UI / Mobile Responsive', us: 'live', competitors: { 'Yardi Voyager': 'partial', 'Emphasys Elite': 'missing', 'Tenmast WinTen': 'missing' } },
    ],
  },
  propertyManagement: {
    label: 'Property Management',
    description: 'Property management platforms used by landlords and management companies',
    competitors: ['AppFolio', 'Buildium', 'RentManager', 'Entrata'],
    features: [
      { feature: 'Property & Unit Management', us: 'live', competitors: { 'AppFolio': 'live', 'Buildium': 'live', 'RentManager': 'live', 'Entrata': 'live' } },
      { feature: 'Listing Marketplace', us: 'live', competitors: { 'AppFolio': 'live', 'Buildium': 'partial', 'RentManager': 'partial', 'Entrata': 'live' } },
      { feature: 'Tenant Screening', us: 'live', competitors: { 'AppFolio': 'live', 'Buildium': 'live', 'RentManager': 'live', 'Entrata': 'live' } },
      { feature: 'Lease Management', us: 'live', competitors: { 'AppFolio': 'live', 'Buildium': 'live', 'RentManager': 'live', 'Entrata': 'live' } },
      { feature: 'Online Rent Collection', us: 'live', competitors: { 'AppFolio': 'live', 'Buildium': 'live', 'RentManager': 'live', 'Entrata': 'live' } },
      { feature: 'Maintenance Requests', us: 'live', competitors: { 'AppFolio': 'live', 'Buildium': 'live', 'RentManager': 'live', 'Entrata': 'live' } },
      { feature: 'HAP Payment Tracking', us: 'live', competitors: { 'AppFolio': 'missing', 'Buildium': 'missing', 'RentManager': 'missing', 'Entrata': 'missing' } },
      { feature: '1099 / Tax Summary for Landlords', us: 'live', competitors: { 'AppFolio': 'live', 'Buildium': 'live', 'RentManager': 'live', 'Entrata': 'live' } },
      { feature: 'Section 8 / HCV Integration', us: 'live', competitors: { 'AppFolio': 'missing', 'Buildium': 'missing', 'RentManager': 'missing', 'Entrata': 'missing' } },
      { feature: 'Inspection Coordination', us: 'live', competitors: { 'AppFolio': 'partial', 'Buildium': 'missing', 'RentManager': 'missing', 'Entrata': 'partial' } },
      { feature: 'Landlord Onboarding Portal', us: 'live', competitors: { 'AppFolio': 'partial', 'Buildium': 'partial', 'RentManager': 'partial', 'Entrata': 'partial' } },
      { feature: 'Document Storage', us: 'live', competitors: { 'AppFolio': 'live', 'Buildium': 'live', 'RentManager': 'live', 'Entrata': 'live' } },
      { feature: 'Vacancy Tracking & Analytics', us: 'live', competitors: { 'AppFolio': 'live', 'Buildium': 'live', 'RentManager': 'live', 'Entrata': 'live' } },
      { feature: 'Affordable Housing Compliance', us: 'live', competitors: { 'AppFolio': 'partial', 'Buildium': 'missing', 'RentManager': 'partial', 'Entrata': 'partial' } },
    ],
  },
  affordablePortals: {
    label: 'Affordable Housing Portals',
    description: 'Tenant-facing platforms for finding affordable and subsidized housing',
    competitors: ['GoSection8', 'AffordableHousing.com', 'SocialServe'],
    features: [
      { feature: 'Voucher-Friendly Listing Search', us: 'live', competitors: { 'GoSection8': 'live', 'AffordableHousing.com': 'partial', 'SocialServe': 'live' } },
      { feature: 'Map-Based Property Search', us: 'live', competitors: { 'GoSection8': 'live', 'AffordableHousing.com': 'partial', 'SocialServe': 'live' } },
      { feature: 'Bedroom / Rent Filters', us: 'live', competitors: { 'GoSection8': 'live', 'AffordableHousing.com': 'live', 'SocialServe': 'live' } },
      { feature: 'Direct Landlord Contact', us: 'live', competitors: { 'GoSection8': 'live', 'AffordableHousing.com': 'partial', 'SocialServe': 'partial' } },
      { feature: 'Waitlist Applications', us: 'live', competitors: { 'GoSection8': 'missing', 'AffordableHousing.com': 'partial', 'SocialServe': 'missing' } },
      { feature: 'Saved Searches / Favorites', us: 'live', competitors: { 'GoSection8': 'live', 'AffordableHousing.com': 'missing', 'SocialServe': 'partial' } },
      { feature: 'Tenant Dashboard / Portal', us: 'live', competitors: { 'GoSection8': 'missing', 'AffordableHousing.com': 'missing', 'SocialServe': 'missing' } },
      { feature: 'Voucher Status Tracking', us: 'live', competitors: { 'GoSection8': 'missing', 'AffordableHousing.com': 'missing', 'SocialServe': 'missing' } },
      { feature: 'RFTA Submission', us: 'live', competitors: { 'GoSection8': 'missing', 'AffordableHousing.com': 'missing', 'SocialServe': 'missing' } },
      { feature: 'Inspection Scheduling', us: 'live', competitors: { 'GoSection8': 'missing', 'AffordableHousing.com': 'missing', 'SocialServe': 'missing' } },
      { feature: 'Document Upload', us: 'live', competitors: { 'GoSection8': 'missing', 'AffordableHousing.com': 'missing', 'SocialServe': 'missing' } },
      { feature: 'Recertification Self-Service', us: 'live', competitors: { 'GoSection8': 'missing', 'AffordableHousing.com': 'missing', 'SocialServe': 'missing' } },
      { feature: 'PHA Directory / Finder', us: 'live', competitors: { 'GoSection8': 'partial', 'AffordableHousing.com': 'live', 'SocialServe': 'live' } },
      { feature: 'Mobile Responsive', us: 'live', competitors: { 'GoSection8': 'partial', 'AffordableHousing.com': 'partial', 'SocialServe': 'live' } },
      { feature: 'Free for Tenants', us: 'live', competitors: { 'GoSection8': 'live', 'AffordableHousing.com': 'live', 'SocialServe': 'live' } },
      { feature: 'Integrated with PHA Systems', us: 'live', competitors: { 'GoSection8': 'missing', 'AffordableHousing.com': 'missing', 'SocialServe': 'missing' } },
    ],
  },
};
