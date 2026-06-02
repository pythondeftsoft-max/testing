import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NoticeTemplate {
  id: string;
  agency_id: string | null;
  name: string;
  category: string;
  subject_line: string;
  body_template: string;
  is_default: boolean;
  created_at: string;
}

export interface NoticeSent {
  id: string;
  agency_id: string;
  tenant_id: string;
  template_id: string | null;
  notice_type: string;
  generated_pdf_path: string | null;
  sent_by: string | null;
  delivery_method: string;
  sent_at: string;
  created_at: string;
}

const DEFAULT_TEMPLATES: Omit<NoticeTemplate, 'id' | 'created_at' | 'agency_id'>[] = [
  {
    name: 'Annual Recertification Notice (90-day)',
    category: 'recertification',
    subject_line: 'Annual Recertification Required - Action Needed Within 90 Days',
    body_template: `Dear {{tenant_name}},

This letter is to inform you that your annual recertification for the Housing Choice Voucher Program is due on {{due_date}}.

You must provide the following documents within 90 days:
• Proof of income for all household members (pay stubs, SSI letters, etc.)
• Current bank statements (last 3 months)
• Proof of assets
• Any changes in household composition

Please contact our office at {{agency_phone}} to schedule your recertification appointment.

Failure to complete the recertification process may result in termination of your housing assistance.

Sincerely,
{{agency_name}}
{{agency_address}}`,
    is_default: true,
  },
  {
    name: 'Inspection Scheduling Letter',
    category: 'inspection',
    subject_line: 'Housing Quality Standards Inspection Scheduled',
    body_template: `Dear {{tenant_name}},

An inspection of your unit has been scheduled:

Date: {{inspection_date}}
Time: {{inspection_time}}
Address: {{unit_address}}

Please ensure that someone 18 years or older is present and that all areas of the unit are accessible.

If you need to reschedule, please contact us at {{agency_phone}} at least 48 hours in advance.

Sincerely,
{{agency_name}}`,
    is_default: true,
  },
  {
    name: 'Voucher Issuance Letter',
    category: 'voucher',
    subject_line: 'Housing Choice Voucher Issued',
    body_template: `Dear {{tenant_name}},

Congratulations! Your Housing Choice Voucher has been issued.

Voucher Number: {{voucher_number}}
Bedroom Size: {{bedroom_size}}
Payment Standard: \${{payment_standard}}
Expiration Date: {{voucher_expiry}}

You have 60 days to locate a suitable unit. Please submit a Request for Tenancy Approval (RFTA) once you have found a unit.

Sincerely,
{{agency_name}}`,
    is_default: true,
  },
  {
    name: 'Lease Termination Warning',
    category: 'termination',
    subject_line: 'Notice of Non-Compliance - Action Required',
    body_template: `Dear {{tenant_name}},

This letter serves as formal notice that you are in violation of the terms of your Housing Choice Voucher Program participation.

Violation: {{violation_description}}

You have 30 days from the date of this letter to correct this violation. Failure to do so may result in termination of your housing assistance.

You have the right to request an informal hearing within 10 business days of receiving this notice.

Sincerely,
{{agency_name}}`,
    is_default: true,
  },
  {
    name: 'Rent Change Notice',
    category: 'general',
    subject_line: 'Notice of Rent Adjustment',
    body_template: `Dear {{tenant_name}},

Based on your recent income review, your rent has been adjusted effective {{effective_date}}:

Previous Tenant Portion: \${{old_tenant_portion}}
New Tenant Portion: \${{new_tenant_portion}}
New HAP Amount: \${{new_hap_amount}}

If you believe this determination is incorrect, you may request an informal hearing within 10 business days.

Sincerely,
{{agency_name}}`,
    is_default: true,
  },
  {
    name: 'HAP Contract Expiration Notice',
    category: 'general',
    subject_line: 'HAP Contract Expiration Notice',
    body_template: `Dear {{landlord_name}},

This letter is to inform you that the Housing Assistance Payment (HAP) contract for the following unit is expiring:

Address: {{unit_address}}
Tenant: {{tenant_name}}
Expiration Date: {{contract_expiry}}

Please contact our office at {{agency_phone}} to discuss renewal options.

Sincerely,
{{agency_name}}`,
    is_default: true,
  },
];

export function useAgencyNotices(agencyId: string) {
  const [templates, setTemplates] = useState<NoticeTemplate[]>([]);
  const [sentNotices, setSentNotices] = useState<NoticeSent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!agencyId) return;
    const { data, error } = await supabase
      .from('agency_notice_templates')
      .select('*')
      .or(`agency_id.eq.${agencyId},agency_id.is.null`)
      .order('category');

    if (error) toast.error('Failed to load notice templates');
    setTemplates((data as unknown as NoticeTemplate[]) || []);
  }, [agencyId]);

  const fetchSentNotices = useCallback(async () => {
    if (!agencyId) return;
    const { data, error } = await supabase
      .from('agency_notices_sent')
      .select('*')
      .eq('agency_id', agencyId)
      .order('sent_at', { ascending: false })
      .limit(100);

    if (error) toast.error('Failed to load sent notices');
    setSentNotices((data as unknown as NoticeSent[]) || []);
  }, [agencyId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTemplates(), fetchSentNotices()]);
    setLoading(false);
  }, [fetchTemplates, fetchSentNotices]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const seedDefaults = async () => {
    const records = DEFAULT_TEMPLATES.map(t => ({
      ...t,
      agency_id: agencyId,
      category: t.category as any,
    }));
    const { error } = await supabase.from('agency_notice_templates').insert(records as any);
    if (error) { toast.error('Failed to seed templates'); return; }
    toast.success('Default templates created');
    fetchTemplates();
  };

  const saveTemplate = async (template: Partial<NoticeTemplate>) => {
    const record = { ...template, agency_id: agencyId } as any;
    if (template.id) {
      const { error } = await supabase.from('agency_notice_templates')
        .update(record).eq('id', template.id);
      if (error) { toast.error('Failed to update template'); return; }
    } else {
      const { error } = await supabase.from('agency_notice_templates')
        .insert(record);
      if (error) { toast.error('Failed to create template'); return; }
    }
    toast.success('Template saved');
    fetchTemplates();
  };

  const recordSentNotice = async (tenantId: string, templateId: string | null, noticeType: string, staffId: string) => {
    const { error } = await supabase.from('agency_notices_sent').insert({
      agency_id: agencyId,
      tenant_id: tenantId,
      template_id: templateId,
      notice_type: noticeType as any,
      sent_by: staffId,
      delivery_method: 'download' as any,
    } as any);
    if (error) toast.error('Failed to record notice');
    fetchSentNotices();
  };

  return { templates, sentNotices, loading, seedDefaults, saveTemplate, recordSentNotice, refetch: fetchAll };
}
