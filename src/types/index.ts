
export interface User {
  id: string;
  name?: string;
  email?: string;
  phone?: string | null;
  role: 'tenant' | 'landlord' | 'property_manager' | 'admin';
  tenant_info?: {
    housing_status: 'housed' | 'searching' | 'inactive';
  };
}
