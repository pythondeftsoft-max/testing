export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  role: 'tenant' | 'landlord' | 'both';
  targetAudience: string;
  features: string[];
  limits: {
    properties?: number | 'unlimited';
    applications?: number | 'unlimited';
    managementUnits?: number | 'unlimited';
  };
  isActive?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free_landlord',
    name: 'Free Landlord',
    price: 0,
    role: 'landlord',
    targetAudience: 'Small landlords getting started',
    features: [
      '🎁 10 FREE management units - try before you buy!',
      'Unlimited property listings',
      'View tenant applications',
      'Rent payment processing (up to 10 units)',
      'Maintenance management (up to 10 units)',
      'Vendor management (up to 10 units)',
      'Lease management (up to 10 units)',
      'Basic support',
      'Email notifications'
    ],
    limits: {
      properties: 'unlimited',
      managementUnits: 10
    }
  },
  {
    id: 'free_tenant',
    name: 'Free Tenant',
    price: 0,
    role: 'tenant',
    targetAudience: 'Tenants searching for rentals',
    features: [
      '5 applications per week',
      'Basic support',
      'Email notifications',
      'Application tracking'
    ],
    limits: {
      applications: 5
    }
  },
  {
    id: 'tenant_pro',
    name: 'Tenant Pro',
    price: 9.99,
    role: 'tenant',
    targetAudience: 'Tenants',
    features: [
      '20 applications per week',
      'Application tracking',
      'Priority support',
      'Document storage',
      'Credit monitoring'
    ],
    limits: {
      applications: 20
    }
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 1.16,
    role: 'landlord',
    targetAudience: 'Small Landlords',
    features: [
      'Property management tools',
      'Rent payment processing',
      'Maintenance request tracking',
      '$1.16 per unit/month',
      'Basic support'
    ],
    limits: {
      properties: 'unlimited',
      applications: 'unlimited'
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 2.00,
    role: 'landlord',
    targetAudience: 'Professional Landlords',
    features: [
      'Everything in Basic',
      'Advanced analytics & reporting',
      'Tenant screening',
      'Custom branding',
      'API access',
      '$2.00 per unit/month'
    ],
    limits: {
      properties: 'unlimited',
      applications: 'unlimited'
    }
  },
  {
    id: 'analytics_tracking',
    name: 'Analytics & Tracking',
    price: 9.99,
    role: 'landlord',
    targetAudience: 'Investors and portfolio viewers',
    features: [
      'Property analytics & insights',
      'Financial tracking',
      'Occupancy monitoring',
      'Investment portfolio tracking',
      'View-only access for invited users',
      'No management features',
      '$9.99/month flat rate'
    ],
    limits: {
      properties: 'unlimited',
      applications: 0
    }
  },
  {
    id: 'white_label',
    name: 'White Label',
    price: 99,
    role: 'landlord',
    targetAudience: 'Landlords who want custom branding',
    features: [
      'Custom branding & logo',
      'Custom domain mapping',
      'Full theme customization',
      'Custom email templates',
      'Remove OpenKey branding',
      'Custom landing page'
    ],
    limits: {}
  }
];
