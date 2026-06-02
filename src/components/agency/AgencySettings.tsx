import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, Building2, DollarSign, Bell, Shield, Loader2, Save, ClipboardList, Plus, X, FileText, Users, Clock, MapPin, Sparkles, Mail, ClipboardCheck, Palette, ListOrdered, TrendingUp, Zap } from 'lucide-react';
import AgencyUtilitySchedules from './AgencyUtilitySchedules';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RequirementsBuilder } from './RequirementsBuilder';
import AgencyRolePermissionsMatrix from './AgencyRolePermissionsMatrix';
import ScheduledReportsManager from './ScheduledReportsManager';
import NoticeTemplateEditor from './NoticeTemplateEditor';
import AgencyOfficeManager from './AgencyOfficeManager';
import AgencyDemoSeeder from './AgencyDemoSeeder';
import AgencyEmailDomainManager from '@/components/admin/AgencyEmailDomainManager';
import AgencyNotificationPreferencesPanel from './AgencyNotificationPreferencesPanel';
import AgencyPaymentStandardsEditor from './AgencyPaymentStandardsEditor';
import AgencyIncomeLimitsEditor from './AgencyIncomeLimitsEditor';
import AgencyInspectionFeeSchedule from './AgencyInspectionFeeSchedule';
import AgencyBrandingEditor from './AgencyBrandingEditor';
import AgencyWaitlistConfig from './AgencyWaitlistConfig';
import AutoBatchSettings from './settings/AutoBatchSettings';
import DualApprovalSettings from './settings/DualApprovalSettings';
import NachaSettingsCard from './settings/NachaSettingsCard';

interface Props {
  agencyId: string;
  /** Optional: restrict visible categories. Pass e.g. ['Money'] to scope to one group's setup. */
  categoryFilter?: string[];
  /** Optional heading override (defaults to "Agency Settings"). */
  heading?: string;
  /** Hide the heading entirely (useful when nested inside a group's ⚙ Setup tab). */
  hideHeading?: boolean;
}

const DEFAULT_DOC_OPTIONS = [
  'Insurance Certificate',
  'Lead Paint Disclosure',
  'Ownership Proof',
  'Business License',
  'Property Management Agreement',
];

interface SettingsTabSpec {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
interface SettingsGroupSpec {
  label: string;
  items: SettingsTabSpec[];
}

const SETTINGS_GROUPS: SettingsGroupSpec[] = [
  {
    label: 'Agency',
    items: [
      { value: 'profile',         label: 'Profile',          icon: Building2 },
      { value: 'offices',         label: 'Offices',          icon: MapPin },
      { value: 'branding',        label: 'Branding',         icon: Palette },
      { value: 'email-branding',  label: 'Email Branding',   icon: Mail },
    ],
  },
  {
    label: 'Money',
    items: [
      { value: 'payment',           label: 'Payment Schedule',  icon: DollarSign },
      { value: 'payment-standards', label: 'Payment Standards', icon: DollarSign },
      { value: 'income-limits',     label: 'Income Limits',     icon: TrendingUp },
      { value: 'inspection-fees',   label: 'Inspection Fees',   icon: ClipboardCheck },
      { value: 'utility-allowances', label: 'Utility Allowances', icon: Zap },
    ],
  },
  {
    label: 'Programs',
    items: [
      { value: 'enrollment',          label: 'Landlord Enrollment', icon: ClipboardList },
      { value: 'tenant-requirements', label: 'Tenant & Porting',    icon: Users },
      { value: 'waitlist-policy',     label: 'Waitlist Policy',     icon: ListOrdered },
    ],
  },
  {
    label: 'Access',
    items: [
      { value: 'permissions',   label: 'Permissions',     icon: Shield },
      { value: 'notifications', label: 'Notifications',   icon: Bell },
      { value: 'compliance',    label: 'Data Retention',  icon: Shield },
    ],
  },
  {
    label: 'Automation',
    items: [
      { value: 'templates',         label: 'Notice Templates',  icon: FileText },
      { value: 'scheduled-reports', label: 'Scheduled Reports', icon: Clock },
      { value: 'demo',              label: 'Demo Data',         icon: Sparkles },
    ],
  },
];

const ALL_TAB_VALUES = SETTINGS_GROUPS.flatMap(g => g.items.map(i => i.value));

const SettingsTabsShell: React.FC<{
  children: React.ReactNode;
  categoryFilter?: string[];
}> = ({ children, categoryFilter }) => {
  const baseGroups = categoryFilter?.length
    ? SETTINGS_GROUPS.filter(g => categoryFilter.includes(g.label))
    : SETTINGS_GROUPS;
  const allowedValues = baseGroups.flatMap(g => g.items.map(i => i.value));
  const initialTab = baseGroups[0]?.items[0]?.value ?? 'profile';
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  // Guard: if filter changes and current tab is no longer allowed, snap back.
  useEffect(() => {
    if (!allowedValues.includes(tab) && allowedValues.length) {
      setTab(allowedValues[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedValues.join(',')]);

  const filteredGroups = q
    ? baseGroups
        .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q)) }))
        .filter(g => g.items.length)
    : baseGroups;

  // Single-group mode (used inside group ⚙ Setup): drop the group label & search,
  // render a clean horizontal tab row.
  const singleGroup = baseGroups.length === 1;

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full space-y-4">
      <div className="space-y-3">
        {!singleGroup && (
          <div className="relative max-w-xs">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Find a setting…"
              className="w-full h-8 px-3 text-sm rounded-md border border-input bg-background"
            />
          </div>
        )}
        <div className={singleGroup ? 'border-b pb-2' : 'flex flex-wrap gap-x-6 gap-y-3 border-b pb-3'}>
          {filteredGroups.map(group => (
            <div key={group.label} className="flex flex-col gap-1">
              {!singleGroup && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </span>
              )}
              <TabsList className="h-auto gap-1 flex-wrap bg-transparent p-0 justify-start">
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="h-8 px-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                    >
                      <Icon className="w-3.5 h-3.5 mr-1" />
                      <span className="text-xs">{item.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No settings match "{query}".</p>
          )}
        </div>
      </div>
      {children}
    </Tabs>
  );
};

const AgencySettings: React.FC<Props> = ({ agencyId, categoryFilter, heading, hideHeading }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '', address: '', city: '', state: '', zipcode: '',
    phone: '', email: '', website: '', pha_code: '',
  });
  const [settings, setSettings] = useState({
    hap_payment_day: '1',
    fiscal_year_start: 'october',
    email_digest: 'daily',
    auto_reminders: true,
    data_retention_years: '7',
  });
  const [hapBlockUnready, setHapBlockUnready] = useState(false);
  const [savingPayReady, setSavingPayReady] = useState(false);

  // Enrollment defaults state (landlord)
  const [enrollmentDefaults, setEnrollmentDefaults] = useState({
    w9_required: true,
    default_required_docs: [] as string[],
    accepted_payment_methods: ['ach', 'digital_check'] as string[],
    default_requirements_notes: '',
  });
  const [customDocInput, setCustomDocInput] = useState('');

  // Tenant & porting requirements
  const [tenantRequirements, setTenantRequirements] = useState<Array<{ name: string; description?: string; is_preset?: boolean }>>([]);
  const [portingRequirements, setPortingRequirements] = useState<Array<{ name: string; description?: string; is_preset?: boolean }>>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('housing_authorities')
        .select('name, address, city, state, zipcode, website, pha_code, metadata, default_required_docs, accepted_payment_methods, default_requirements_notes, tenant_enrollment_requirements, porting_requirements, hap_block_unready_landlords')
        .eq('id', agencyId)
        .single();
      // Fetch contact PII via privileged RPC (admin or that-agency staff only)
      const { data: contact } = await (supabase as any).rpc(
        'get_housing_authority_contact',
        { _id: agencyId }
      );
      const c = Array.isArray(contact) ? contact[0] : contact;
      if (data) {
        setProfile({
          name: data.name || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipcode: data.zipcode || '',
          phone: c?.phone || '',
          email: c?.email || '',
          website: data.website || '',
          pha_code: data.pha_code || '',
        });
        const meta = (data.metadata as any) || {};
        setSettings(prev => ({
          ...prev,
          hap_payment_day: meta.hap_payment_day || '1',
          fiscal_year_start: meta.fiscal_year_start || 'october',
          email_digest: meta.email_digest || 'daily',
          auto_reminders: meta.auto_reminders !== false,
          data_retention_years: meta.data_retention_years || '7',
        }));

        const w9Default = meta.w9_required_default !== false;
        setEnrollmentDefaults({
          w9_required: w9Default,
          default_required_docs: (data as any).default_required_docs || [],
          accepted_payment_methods: (data as any).accepted_payment_methods || ['ach', 'digital_check'],
          default_requirements_notes: (data as any).default_requirements_notes || '',
        });

        // Load tenant & porting requirements
        setTenantRequirements(((data as any).tenant_enrollment_requirements as any[]) || []);
        setPortingRequirements(((data as any).porting_requirements as any[]) || []);
        setHapBlockUnready(Boolean((data as any).hap_block_unready_landlords));
      }
      setLoading(false);
    };
    load();
  }, [agencyId]);

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from('housing_authorities').update({
      name: profile.name,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      zipcode: profile.zipcode,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      pha_code: profile.pha_code,
    }).eq('id', agencyId);
    if (error) toast.error('Failed to save profile');
    else toast.success('Profile updated');
    setSaving(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    const { data: existing } = await supabase.from('housing_authorities').select('metadata').eq('id', agencyId).single();
    const merged = { ...((existing?.metadata as any) || {}), ...settings };
    const { error } = await supabase.from('housing_authorities').update({ metadata: merged }).eq('id', agencyId);
    if (error) toast.error('Failed to save settings');
    else toast.success('Settings updated');
    setSaving(false);
  };

  const saveEnrollmentDefaults = async () => {
    setSaving(true);
    const { data: existing } = await supabase.from('housing_authorities').select('metadata').eq('id', agencyId).single();
    const mergedMeta = { ...((existing?.metadata as any) || {}), w9_required_default: enrollmentDefaults.w9_required };

    const { error } = await supabase.from('housing_authorities').update({
      metadata: mergedMeta,
      default_required_docs: enrollmentDefaults.default_required_docs.length > 0 ? enrollmentDefaults.default_required_docs : null,
      accepted_payment_methods: enrollmentDefaults.accepted_payment_methods,
      default_requirements_notes: enrollmentDefaults.default_requirements_notes || null,
    } as any).eq('id', agencyId);

    if (error) { toast.error('Failed to save enrollment defaults'); setSaving(false); return; }
    toast.success('Enrollment defaults saved — applies to all future enrollments');

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('agency_activity_log').insert({
      agency_id: agencyId,
      actor_id: user?.id || null,
      action: 'enrollment_defaults_updated',
      entity_type: 'agency_settings',
      entity_id: agencyId,
      metadata: {
        w9_required: enrollmentDefaults.w9_required,
        docs_count: enrollmentDefaults.default_required_docs.length,
        payment_methods: enrollmentDefaults.accepted_payment_methods.join(', '),
      },
    });
    setSaving(false);
  };

  const saveTenantPortingRequirements = async () => {
    setSaving(true);
    const { error } = await supabase.from('housing_authorities').update({
      tenant_enrollment_requirements: tenantRequirements.length > 0 ? tenantRequirements : null,
      porting_requirements: portingRequirements.length > 0 ? portingRequirements : null,
    } as any).eq('id', agencyId);

    if (error) { toast.error('Failed to save requirements'); setSaving(false); return; }
    toast.success('Tenant & porting requirements saved');

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('agency_activity_log').insert({
      agency_id: agencyId,
      actor_id: user?.id || null,
      action: 'tenant_requirements_updated',
      entity_type: 'agency_settings',
      entity_id: agencyId,
      metadata: {
        tenant_requirements_count: tenantRequirements.length,
        porting_requirements_count: portingRequirements.length,
      },
    });
    setSaving(false);
  };

  const toggleDocOption = (doc: string) => {
    setEnrollmentDefaults(prev => ({
      ...prev,
      default_required_docs: prev.default_required_docs.includes(doc)
        ? prev.default_required_docs.filter(d => d !== doc)
        : [...prev.default_required_docs, doc],
    }));
  };

  const addCustomDoc = () => {
    if (!customDocInput.trim()) return;
    setEnrollmentDefaults(prev => ({
      ...prev,
      default_required_docs: [...prev.default_required_docs, customDocInput.trim()],
    }));
    setCustomDocInput('');
  };

  const removeDoc = (doc: string) => {
    setEnrollmentDefaults(prev => ({
      ...prev,
      default_required_docs: prev.default_required_docs.filter(d => d !== doc),
    }));
  };

  const togglePaymentMethod = (method: string) => {
    setEnrollmentDefaults(prev => {
      const methods = prev.accepted_payment_methods.includes(method)
        ? prev.accepted_payment_methods.filter(m => m !== method)
        : [...prev.accepted_payment_methods, method];
      if (methods.length === 0) return prev;
      return { ...prev, accepted_payment_methods: methods };
    });
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {!hideHeading && (
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{heading ?? 'Agency Settings'}</h2>
        </div>
      )}

      <SettingsTabsShell categoryFilter={categoryFilter}>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base">Agency Profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Agency Name</Label><Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label>PHA Code</Label><Input value={profile.pha_code} onChange={e => setProfile(p => ({ ...p, pha_code: e.target.value }))} placeholder="e.g. CA001" /></div>
                <div className="md:col-span-2"><Label>Address</Label><Input value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} /></div>
                <div><Label>City</Label><Input value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} /></div>
                <div><Label>State</Label><Input value={profile.state} onChange={e => setProfile(p => ({ ...p, state: e.target.value }))} /></div>
                <div><Label>ZIP Code</Label><Input value={profile.zipcode} onChange={e => setProfile(p => ({ ...p, zipcode: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
                <div><Label>Email</Label><Input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></div>
                <div><Label>Website</Label><Input value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} /></div>
              </div>
              <Button onClick={saveProfile} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader><CardTitle className="text-base">Payment Schedule</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>HAP Payment Day</Label>
                  <Select value={settings.hap_payment_day} onValueChange={v => setSettings(s => ({ ...s, hap_payment_day: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fiscal Year Start</Label>
                  <Select value={settings.fiscal_year_start} onValueChange={v => setSettings(s => ({ ...s, fiscal_year_start: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['january','february','march','april','may','june','july','august','september','october','november','december'].map(m => (
                        <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={saveSettings} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Payment Settings'}
              </Button>
            </CardContent>
          </Card>
          <div className="mt-6">
            <AutoBatchSettings agencyId={agencyId} />
          </div>
          <div className="mt-6">
            <DualApprovalSettings agencyId={agencyId} />
          </div>
          <div className="mt-6">
            <NachaSettingsCard agencyId={agencyId} />
          </div>
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Pay-Ready Enforcement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3 p-3 bg-muted rounded-lg">
                  <div>
                    <Label className="font-medium">Block HAP batch approval when any landlord is not pay-ready</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When on, batches containing landlords missing W-9, bank verification, or an executed HAP contract cannot be advanced to Approved or Disbursed. When off, you'll see a warning but can still proceed.
                    </p>
                  </div>
                  <Switch
                    checked={hapBlockUnready}
                    onCheckedChange={setHapBlockUnready}
                  />
                </div>
                <Button
                  onClick={async () => {
                    setSavingPayReady(true);
                    const { error } = await supabase
                      .from('housing_authorities')
                      .update({ hap_block_unready_landlords: hapBlockUnready } as any)
                      .eq('id', agencyId);
                    setSavingPayReady(false);
                    if (error) toast.error('Failed to save pay-ready setting');
                    else toast.success(hapBlockUnready ? 'Hard-block enabled' : 'Hard-block disabled');
                  }}
                  disabled={savingPayReady}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> {savingPayReady ? 'Saving...' : 'Save Pay-Ready Setting'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="enrollment">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Landlord Enrollment Defaults
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure default requirements for all new landlord enrollments. These are applied automatically when a landlord registers.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* W-9 Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <Label className="font-medium">W-9 Required by Default</Label>
                  <p className="text-xs text-muted-foreground">All new enrollees must submit a W-9 form</p>
                </div>
                <Switch
                  checked={enrollmentDefaults.w9_required}
                  onCheckedChange={v => setEnrollmentDefaults(p => ({ ...p, w9_required: v }))}
                />
              </div>

              {/* Required Documents */}
              <div>
                <Label className="font-medium">Default Required Documents</Label>
                <p className="text-xs text-muted-foreground mb-3">Select standard documents or add custom ones</p>
                <div className="space-y-2">
                  {DEFAULT_DOC_OPTIONS.map(doc => (
                    <label key={doc} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50">
                      <Checkbox
                        checked={enrollmentDefaults.default_required_docs.includes(doc)}
                        onCheckedChange={() => toggleDocOption(doc)}
                      />
                      <span className="text-sm">{doc}</span>
                    </label>
                  ))}
                  {enrollmentDefaults.default_required_docs
                    .filter(d => !DEFAULT_DOC_OPTIONS.includes(d))
                    .map(doc => (
                      <div key={doc} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm flex-1">{doc}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDoc(doc)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom document type..."
                      value={customDocInput}
                      onChange={e => setCustomDocInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustomDoc()}
                    />
                    <Button variant="outline" size="sm" onClick={addCustomDoc} disabled={!customDocInput.trim()}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Accepted Payment Methods */}
              <div>
                <Label className="font-medium">Accepted Payment Methods</Label>
                <p className="text-xs text-muted-foreground mb-3">Landlords will only see these options during enrollment</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      checked={enrollmentDefaults.accepted_payment_methods.includes('ach')}
                      onCheckedChange={() => togglePaymentMethod('ach')}
                    />
                    <span className="text-sm">ACH / Direct Deposit</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      checked={enrollmentDefaults.accepted_payment_methods.includes('check') || enrollmentDefaults.accepted_payment_methods.includes('digital_check')}
                      onCheckedChange={() => {
                        const hasCheck = enrollmentDefaults.accepted_payment_methods.includes('check') || enrollmentDefaults.accepted_payment_methods.includes('digital_check');
                        if (hasCheck) {
                          setEnrollmentDefaults(p => ({
                            ...p,
                            accepted_payment_methods: p.accepted_payment_methods.filter(m => m !== 'check' && m !== 'digital_check'),
                          }));
                        } else {
                          setEnrollmentDefaults(p => ({
                            ...p,
                            accepted_payment_methods: [...p.accepted_payment_methods, 'check'],
                          }));
                        }
                      }}
                    />
                    <span className="text-sm">Mailed Check</span>
                  </label>
                </div>
              </div>

              {/* Default Instructions */}
              <div>
                <Label className="font-medium">Default Instructions for Landlords</Label>
                <p className="text-xs text-muted-foreground mb-2">Shown to landlords when they enroll with your agency</p>
                <Textarea
                  value={enrollmentDefaults.default_requirements_notes}
                  onChange={e => setEnrollmentDefaults(p => ({ ...p, default_requirements_notes: e.target.value }))}
                  placeholder="e.g., Please submit all documents within 30 days of enrollment. W-9 must be signed and dated..."
                  rows={3}
                />
              </div>

              <Button onClick={saveEnrollmentDefaults} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Enrollment Defaults'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NEW: Tenant & Porting Requirements Tab */}
        <TabsContent value="tenant-requirements">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" /> Tenant Enrollment Requirements
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Define what tenants must provide when applying to your waitlist. Toggle presets or add custom items. Drag to reorder.
                </p>
              </CardHeader>
              <CardContent>
                <RequirementsBuilder
                  items={tenantRequirements}
                  onChange={setTenantRequirements}
                  presetType="tenant"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> Porting Requirements
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Define what tenants must provide when porting a voucher to your agency. Toggle presets or add custom items. Drag to reorder.
                </p>
              </CardHeader>
              <CardContent>
                <RequirementsBuilder
                  items={portingRequirements}
                  onChange={setPortingRequirements}
                  presetType="porting"
                />
              </CardContent>
            </Card>

            <Button onClick={saveTenantPortingRequirements} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Tenant & Porting Requirements'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <AgencyNotificationPreferencesPanel agencyId={agencyId} />
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader><CardTitle className="text-base">Data Retention & Compliance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <Label>Data Retention Period</Label>
                <Select value={settings.data_retention_years} onValueChange={v => setSettings(s => ({ ...s, data_retention_years: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 years</SelectItem>
                    <SelectItem value="5">5 years</SelectItem>
                    <SelectItem value="7">7 years (HUD recommended)</SelectItem>
                    <SelectItem value="10">10 years</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">HUD requires minimum 3 years for program records</p>
              </div>
              <Button onClick={saveSettings} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Compliance Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <AgencyRolePermissionsMatrix agencyId={agencyId} />
        </TabsContent>

        <TabsContent value="templates">
          <NoticeTemplateEditor agencyId={agencyId} canManage={true} />
        </TabsContent>

        <TabsContent value="scheduled-reports">
          <ScheduledReportsManager agencyId={agencyId} canManage={true} />
        </TabsContent>

        <TabsContent value="offices">
          <AgencyOfficeManager agencyId={agencyId} />
        </TabsContent>


        <TabsContent value="email-branding">
          <AgencyEmailDomainManager agencyId={agencyId} agencyName={profile.name || 'Your Agency'} isAdmin={false} />
        </TabsContent>

        <TabsContent value="payment-standards">
          <AgencyPaymentStandardsEditor agencyId={agencyId} />
        </TabsContent>

        <TabsContent value="income-limits">
          <AgencyIncomeLimitsEditor agencyId={agencyId} />
        </TabsContent>

        <TabsContent value="inspection-fees">
          <AgencyInspectionFeeSchedule agencyId={agencyId} />
        </TabsContent>

        <TabsContent value="utility-allowances">
          <AgencyUtilitySchedules agencyId={agencyId} />
        </TabsContent>


        <TabsContent value="branding">
          <AgencyBrandingEditor agencyId={agencyId} />
        </TabsContent>

        <TabsContent value="waitlist-policy">
          <AgencyWaitlistConfig agencyId={agencyId} />
        </TabsContent>

        <TabsContent value="demo">
          <AgencyDemoSeeder agencyId={agencyId} />
        </TabsContent>
      </SettingsTabsShell>
    </div>
  );
};

export default AgencySettings;
