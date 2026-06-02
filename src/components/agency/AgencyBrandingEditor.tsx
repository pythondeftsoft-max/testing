import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Loader2, Palette, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

const AgencyBrandingEditor: React.FC<Props> = ({ agencyId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [branding, setBranding] = useState({
    company_name: '',
    company_logo_url: '',
    primary_color: '#3b82f6',
    secondary_color: '#6366f1',
    accent_color: '#f59e0b',
    favicon_url: '',
    footer_text: '',
  });

  useEffect(() => {
    loadBranding();
  }, [agencyId]);

  const loadBranding = async () => {
    setLoading(true);
    // Look up the agency staff member's user_id, then find their white_label_config
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: config } = await supabase
        .from('white_label_configs')
        .select('id, company_name, company_logo_url, primary_color, secondary_color, accent_color, favicon_url, footer_text')
        .eq('user_id', user.id)
        .maybeSingle();

      if (config) {
        setConfigId(config.id);
        setBranding({
          company_name: config.company_name || '',
          company_logo_url: config.company_logo_url || '',
          primary_color: config.primary_color || '#3b82f6',
          secondary_color: config.secondary_color || '#6366f1',
          accent_color: config.accent_color || '#f59e0b',
          favicon_url: config.favicon_url || '',
          footer_text: config.footer_text || '',
        });
      }
    }
    setLoading(false);
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      if (configId) {
        const { error } = await supabase
          .from('white_label_configs')
          .update({
            company_name: branding.company_name || null,
            company_logo_url: branding.company_logo_url || null,
            primary_color: branding.primary_color || null,
            secondary_color: branding.secondary_color || null,
            accent_color: branding.accent_color || null,
            favicon_url: branding.favicon_url || null,
            footer_text: branding.footer_text || null,
          })
          .eq('id', configId);

        if (error) throw error;
      }
      toast.success('Branding saved. Changes may take a moment to reflect.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!configId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No white-label configuration found for this agency.</p>
          <p className="text-xs mt-1">Contact your platform administrator to enable branding.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="w-4 h-4" /> Agency Branding
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Customize your agency's visual identity. These settings affect your portal appearance and branded communications.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Identity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Company / Agency Name</Label>
            <Input
              value={branding.company_name}
              onChange={e => setBranding(p => ({ ...p, company_name: e.target.value }))}
              placeholder="Your Housing Authority"
            />
          </div>
          <div>
            <Label>Logo URL</Label>
            <Input
              value={branding.company_logo_url}
              onChange={e => setBranding(p => ({ ...p, company_logo_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Colors */}
        <div>
          <Label className="font-medium mb-2 block">Brand Colors</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={branding.primary_color}
                onChange={e => setBranding(p => ({ ...p, primary_color: e.target.value }))}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <div>
                <Label className="text-sm">Primary</Label>
                <Input
                  value={branding.primary_color}
                  onChange={e => setBranding(p => ({ ...p, primary_color: e.target.value }))}
                  className="max-w-[110px] h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={branding.secondary_color}
                onChange={e => setBranding(p => ({ ...p, secondary_color: e.target.value }))}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <div>
                <Label className="text-sm">Secondary</Label>
                <Input
                  value={branding.secondary_color}
                  onChange={e => setBranding(p => ({ ...p, secondary_color: e.target.value }))}
                  className="max-w-[110px] h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={branding.accent_color}
                onChange={e => setBranding(p => ({ ...p, accent_color: e.target.value }))}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <div>
                <Label className="text-sm">Accent</Label>
                <Input
                  value={branding.accent_color}
                  onChange={e => setBranding(p => ({ ...p, accent_color: e.target.value }))}
                  className="max-w-[110px] h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <Label className="font-medium mb-2 block">Preview</Label>
          <div
            className="rounded-lg p-4 border"
            style={{ backgroundColor: branding.primary_color + '15' }}
          >
            <div className="flex items-center gap-3 mb-3">
              {branding.company_logo_url && (
                <img src={branding.company_logo_url} alt="Logo" className="h-8 w-auto object-contain" />
              )}
              <span className="font-semibold" style={{ color: branding.primary_color }}>
                {branding.company_name || 'Your Agency'}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="rounded px-3 py-1 text-xs text-white" style={{ backgroundColor: branding.primary_color }}>
                Primary Button
              </div>
              <div className="rounded px-3 py-1 text-xs text-white" style={{ backgroundColor: branding.secondary_color }}>
                Secondary
              </div>
              <div className="rounded px-3 py-1 text-xs text-white" style={{ backgroundColor: branding.accent_color }}>
                Accent
              </div>
            </div>
          </div>
        </div>

        {/* Footer & Favicon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Favicon URL</Label>
            <Input
              value={branding.favicon_url}
              onChange={e => setBranding(p => ({ ...p, favicon_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Footer Text</Label>
            <Input
              value={branding.footer_text}
              onChange={e => setBranding(p => ({ ...p, footer_text: e.target.value }))}
              placeholder="© 2026 Your Housing Authority"
            />
          </div>
        </div>

        <Button onClick={saveBranding} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Branding'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AgencyBrandingEditor;
