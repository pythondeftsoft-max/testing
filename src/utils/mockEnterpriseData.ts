
// Mock data utility for enterprise features until database tables are created
export interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  rate_limit: number;
  created_at: string;
  last_used: string;
  is_active: boolean;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  last_triggered: string;
}

export interface Integration {
  id: string;
  name: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, any>;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'suspended' | 'trial';
  plan: 'starter' | 'professional' | 'enterprise';
  user_count: number;
  portfolio_count: number;
  created_at: string;
  custom_branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    company_name?: string;
  };
}

// Mock functions that return empty arrays - these can be replaced with real queries later
export const getMockAPIKeys = (): APIKey[] => [];
export const getMockWebhooks = (): WebhookEndpoint[] => [];
export const getMockIntegrations = (): Integration[] => [];
export const getMockTenants = (): Tenant[] => [];

// Mock mutation functions that return promises
export const createMockAPIKey = async (data: any): Promise<any> => {
  return Promise.resolve({ success: true });
};

export const createMockWebhook = async (data: any): Promise<any> => {
  return Promise.resolve({ success: true });
};

export const createMockTenant = async (data: any): Promise<any> => {
  return Promise.resolve({ success: true });
};

export const updateMockTenantStatus = async (data: any): Promise<any> => {
  return Promise.resolve({ success: true });
};

export const toggleMockAPIKey = async (data: any): Promise<any> => {
  return Promise.resolve({ success: true });
};
