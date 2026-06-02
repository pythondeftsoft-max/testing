// Canonical list of integrations a PHA can opt into during conversion.

export interface PlatformIntegration {
  key: string;
  label: string;
  description: string;
  category: 'HUD' | 'Payments' | 'Comms' | 'Identity' | 'Data Migration';
  setupNote?: string;
}

export const PLATFORM_INTEGRATIONS: PlatformIntegration[] = [
  { key: 'iris', label: 'IRIS / VMS sync', description: 'HUD voucher mgmt sync', category: 'HUD', setupNote: 'Requires PHA IRIS credentials' },
  { key: 'eiv', label: 'EIV income verification', description: 'HUD Enterprise Income Verification', category: 'HUD', setupNote: 'Requires EIV access agreement' },
  { key: 'pic_50058', label: 'PIC 50058 submission', description: 'Direct submission to HUD PIC', category: 'HUD' },

  { key: 'checkbook', label: 'Checkbook.io payouts', description: 'HAP disbursement to landlords', category: 'Payments' },
  { key: 'stripe_billing', label: 'Stripe billing', description: 'Auto-invoicing for SaaS subscription', category: 'Payments' },
  { key: 'nacha_bank', label: 'NACHA bank file delivery', description: 'Direct ACH file SFTP to PHA bank', category: 'Payments' },

  { key: 'quo_sms', label: 'Quo SMS', description: 'Outbound SMS to tenants/landlords', category: 'Comms' },
  { key: 'custom_email_domain', label: 'Custom email domain', description: 'Send from @yourpha.gov instead of default', category: 'Comms', setupNote: 'Requires DNS record changes' },

  { key: 'sso_saml', label: 'SSO / SAML', description: 'Single sign-on for staff', category: 'Identity', setupNote: 'Requires IdP metadata' },
  { key: 'mfa_enforce', label: 'Enforce MFA for staff', description: 'Mandatory TOTP for privileged roles', category: 'Identity' },

  { key: 'import_wintenn2', label: 'Import from WinTen2+', description: 'Legacy data migration', category: 'Data Migration' },
  { key: 'import_emphasys', label: 'Import from Emphasys', description: 'Legacy data migration', category: 'Data Migration' },
  { key: 'import_happy', label: 'Import from HappySoftware', description: 'Legacy data migration', category: 'Data Migration' },
  { key: 'import_yardi', label: 'Import from Yardi Voyager', description: 'Legacy data migration', category: 'Data Migration' },
  { key: 'import_csv', label: 'Custom CSV import', description: 'Tenants / landlords / contracts CSVs', category: 'Data Migration' },
];

export function integrationsByCategory() {
  const map = new Map<string, PlatformIntegration[]>();
  PLATFORM_INTEGRATIONS.forEach((i) => {
    if (!map.has(i.category)) map.set(i.category, []);
    map.get(i.category)!.push(i);
  });
  return Array.from(map.entries());
}
