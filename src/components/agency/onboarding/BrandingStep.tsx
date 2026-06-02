import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Save, Loader2, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
  agency: any;
  onSaved?: () => void;
}

/**
 * Branding step that writes:
 *  - logo / colors / subdomain → white_label_configs (per-user agency config)
 *  - phone / email / website → housing_authorities (agency-level)
 * Live preview shows the resulting header chrome.
 */
export const BrandingStep: React.FC<Props> = ({ agencyId, agency, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [form, setForm] = useState({
    company_name: agency?.name || '',
    company_logo_url: '',
    primary_color: '#0ea5e9',
    secondary_color: '#6366f1',
    accent_color: '#f59e0b',
    custom_subdomain: '',
    phone: agency?.phone || '',
    email: agency?.email || '',
    website: agency?.website || '',
  });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('white_label_configs')
        .select('id, company_name, company_logo_url, primary_color, secondary_color, accent_color, custom_subdomain')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setConfigId(data.id);
        setForm(f => ({
          ...f,
          company_name: data.company_name || agency?.name || '',
          company_logo_url: data.company_logo_url || '',
          primary_color: data.primary_color || '#0ea5e9',
          secondary_color: data.secondary_color || '#6366f1',
          accent_color: data.accent_color || '#f59e0b',
          custom_subdomain: data.custom_subdomain || '',
        }));
      }
      setLoading(false);
    };
    load();
  }, [agencyId, agency]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Update agency contact info on housing_authorities
      const { error: agencyErr } = await supabase
        .from('housing_authorities')
        .update({
          phone: form.phone || null,
          email: form.email || null,
          website: form.website || null,
        })
        .eq('id', agencyId);
      if (agencyErr) throw agencyErr;

      // 2. Upsert white_label_configs for branding
      if (configId) {
        const { error } = await supabase
          .from('white_label_configs')
          .update({
            company_name: form.company_name || null,
            company_logo_url: form.company_logo_url || null,
            primary_color: form.primary_color || null,
            secondary_color: form.secondary_color || null,
            accent_color: form.accent_color || null,
            custom_subdomain: form.custom_subdomain || null,
          })
          .eq('id', configId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from('white_label_configs')
          .insert({
            user_id: user.id,
            company_name: form.company_name || null,
            company_logo_url: form.company_logo_url || null,
            primary_color: form.primary_color,
            secondary_color: form.secondary_color,
            accent_color: form.accent_color,
            custom_subdomain: form.custom_subdomain || null,
            is_active: true,
          })
          .select('id')
          .maybeSingle();
        if (error) throw error;
        if (inserted) setConfigId(inserted.id);
      }

      toast.success('Branding saved');
      onSaved?.();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Public agency name</Label>
          <Input
            value={form.company_name}
            onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
            placeholder={agency?.name || 'Your Housing Authority'}
          />
        </div>
        <div>
          <Label>Logo URL</Label>
          <Input
            value={form.company_logo_url}
            onChange={e => setForm(f => ({ ...f, company_logo_url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Brand colors</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            ['primary_color', 'Primary'],
            ['secondary_color', 'Secondary'],
            ['accent_color', 'Accent'],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <div className="flex-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Phone</Label>
          <Input
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="(555) 123-4567"
          />
        </div>
        <div>
          <Label>Public email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="info@yourpha.gov"
          />
        </div>
        <div>
          <Label>Website</Label>
          <Input
            value={form.website}
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            placeholder="https://yourpha.gov"
          />
        </div>
      </div>

      <div>
        <Label>Custom subdomain (optional)</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            value={form.custom_subdomain}
            onChange={e => setForm(f => ({ ...f, custom_subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
            placeholder="yourpha"
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">.openkeyhousing.com</span>
        </div>
      </div>

      {/* Live preview */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-t-lg p-4 flex items-center gap-3" style={{ backgroundColor: form.primary_color + '15' }}>
            {form.company_logo_url ? (
              <img src={form.company_logo_url} alt="Logo" className="h-9 w-9 rounded object-contain bg-white p-1" />
            ) : (
              <div className="h-9 w-9 rounded flex items-center justify-center" style={{ backgroundColor: form.primary_color }}>
                <Palette className="h-4 w-4 text-white" />
              </div>
            )}
            <div>
              <div className="font-semibold" style={{ color: form.primary_color }}>{form.company_name || 'Your Agency'}</div>
              <div className="text-xs text-muted-foreground">Tenant + landlord portal preview</div>
            </div>
          </div>
          <div className="p-4 flex gap-2">
            <div className="rounded px-3 py-1.5 text-xs text-white font-medium" style={{ backgroundColor: form.primary_color }}>
              Primary action
            </div>
            <div className="rounded px-3 py-1.5 text-xs text-white font-medium" style={{ backgroundColor: form.secondary_color }}>
              Secondary
            </div>
            <div className="rounded px-3 py-1.5 text-xs text-white font-medium" style={{ backgroundColor: form.accent_color }}>
              Accent
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Saving...' : 'Save branding'}
      </Button>
      <p className="text-xs text-muted-foreground">You can fine-tune branding anytime under Admin → Configuration → Settings.</p>
    </div>
  );
};

export default BrandingStep;
