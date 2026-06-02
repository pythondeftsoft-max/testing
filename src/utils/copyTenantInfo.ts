import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface TenantCopyData {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  bedrooms_approved?: (number | string)[] | null;
  rent_range_min?: number | null;
  rent_range_max?: number | null;
  max_rent?: number | null;
  voucher_status?: string | null;
  voucher_holder?: boolean | null;
  voucher_amount?: number | null;
  monthly_income?: number | string | null;
  employment_status?: string | null;
  credit_score_range?: string | null;
  has_eviction?: boolean | null;
  eviction_details?: string | null;
  has_felonies?: boolean | null;
  felony_details?: string | null;
  move_in_window?: string | null;
  has_pets?: boolean | null;
  pet_type?: string | null;
}

export const formatTenantInfoForCopy = (tenant: TenantCopyData): string => {
  const tenantName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'N/A';
  const location = tenant.city && tenant.state
    ? `${tenant.city}, ${tenant.state}`
    : tenant.city || tenant.state || 'N/A';

  const bedroomsText = tenant.bedrooms_approved?.length
    ? tenant.bedrooms_approved.map((b) => {
        const s = String(b).trim();
        return /br/i.test(s) ? s.toUpperCase() : `${s}BR`;
      }).join(', ')
    : 'N/A';

  const rentRange = tenant.rent_range_min != null && tenant.rent_range_max != null
    ? `$${tenant.rent_range_min.toLocaleString()} - $${tenant.rent_range_max.toLocaleString()}`
    : tenant.rent_range_max != null
      ? `Up to $${tenant.rent_range_max.toLocaleString()}`
      : tenant.rent_range_min != null
        ? `From $${tenant.rent_range_min.toLocaleString()}`
        : tenant.max_rent
          ? `Up to $${tenant.max_rent.toLocaleString()}`
          : 'N/A';

  const voucherText = (tenant.voucher_status === 'yes' || tenant.voucher_holder)
    ? `Yes${tenant.voucher_amount ? ` ($${tenant.voucher_amount.toLocaleString()})` : ''}`
    : tenant.voucher_status === 'in-progress' ? 'In Progress'
    : 'No';

  const incomeText = tenant.monthly_income == null || tenant.monthly_income === ''
    ? 'N/A'
    : typeof tenant.monthly_income === 'number'
      ? `$${tenant.monthly_income.toLocaleString()}`
      : String(tenant.monthly_income);
  const employmentText = tenant.employment_status || 'N/A';
  const creditText = tenant.credit_score_range || 'N/A';

  const evictionText = tenant.has_eviction
    ? `Yes${tenant.eviction_details ? ` - ${tenant.eviction_details}` : ''}`
    : 'No';
  const felonyText = tenant.has_felonies
    ? `Yes${tenant.felony_details ? ` - ${tenant.felony_details}` : ''}`
    : 'No';

  return `TENANT INFORMATION
==================
Name: ${tenantName}
Email: ${tenant.email || 'N/A'}
Phone: ${tenant.phone || 'N/A'}
Location: ${location}

HOUSING REQUIREMENTS
==================
Bedrooms Approved: ${bedroomsText}
Rent Range: ${rentRange}
Voucher: ${voucherText}
Move-in Timeline: ${tenant.move_in_window || 'N/A'}
Pets: ${tenant.has_pets ? `Yes${tenant.pet_type ? ` (${tenant.pet_type})` : ''}` : 'No'}

FINANCIAL INFORMATION
==================
Yearly Income: ${incomeText}
Employment Status: ${employmentText}
Credit Score Range: ${creditText}

BACKGROUND
==================
Eviction History: ${evictionText}
Felony History: ${felonyText}

[Generated from OpenKey]`;
};

export const copyTenantInfoToClipboard = (tenant: TenantCopyData) => {
  const text = formatTenantInfoForCopy(tenant);
  const tenantName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Tenant';
  navigator.clipboard.writeText(text);
  toast.success(`${tenantName}'s info copied to clipboard`);
};

/**
 * Fetches the full tenant profile (profiles + tenant_profiles) and copies
 * the formatted info block to the clipboard.
 */
export const fetchAndCopyTenantInfo = async (tenantId: string): Promise<void> => {
  const [profileRes, tenantProfileRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, email, phone, city, state')
      .eq('id', tenantId)
      .maybeSingle(),
    supabase
      .from('tenant_profiles')
      .select('*')
      .eq('user_id', tenantId)
      .maybeSingle(),
  ]);

  if (profileRes.error) throw profileRes.error;

  const profile = (profileRes.data || {}) as any;
  const tp = (tenantProfileRes.data || {}) as any;

  const merged: TenantCopyData = {
    ...tp,
    first_name: profile.first_name ?? tp.first_name,
    last_name: profile.last_name ?? tp.last_name,
    email: profile.email ?? tp.email,
    phone: profile.phone ?? tp.phone,
    city: tp.city ?? profile.city,
    state: tp.state ?? profile.state,
  };

  copyTenantInfoToClipboard(merged);
};
