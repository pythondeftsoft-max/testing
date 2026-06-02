import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Globe, CheckCircle2, XCircle, Loader2, Send, DollarSign, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
  agencyName: string;
  isAdmin?: boolean; // true = platform admin view, false = agency self-service
}

interface EmailSettings {
  id: string;
  agency_id: string;
  sender_mode: 'hybrid' | 'custom_domain';
  custom_domain: string | null;
  custom_from_email: string | null;
  domain_verified: boolean;
  domain_verification_records: any[];
  resend_domain_id: string | null;
  monthly_addon_fee: number;
  enabled_at: string | null;
  created_at: string;
  updated_at: string;
}

const AgencyEmailDomainManager: React.FC<Props> = ({ agencyId, agencyName, isAdmin = false }) => {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [customFromEmail, setCustomFromEmail] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('25');
  const [senderMode, setSenderMode] = useState<'hybrid' | 'custom_domain'>('hybrid');

  useEffect(() => {
    fetchSettings();
  }, [agencyId]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_email_settings')
      .select('*')
      .eq('agency_id', agencyId)
      .maybeSingle();

    if (error) console.error('Failed to load email settings:', error);
    if (data) {
      const s = data as unknown as EmailSettings;
      setSettings(s);
      setSenderMode(s.sender_mode as 'hybrid' | 'custom_domain');
      setCustomDomain(s.custom_domain || '');
      setCustomFromEmail(s.custom_from_email || '');
      setMonthlyFee(String(s.monthly_addon_fee || 25));
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    const payload: any = {
      agency_id: agencyId,
      sender_mode: senderMode,
      custom_domain: senderMode === 'custom_domain' ? customDomain || null : null,
      custom_from_email: senderMode === 'custom_domain' ? customFromEmail || null : null,
      monthly_addon_fee: senderMode === 'custom_domain' ? parseFloat(monthlyFee) || 0 : 0,
    };

    if (senderMode === 'custom_domain' && customDomain) {
      payload.domain_verification_records = [
        { type: 'TXT', name: `_dmarc.${customDomain}`, value: `v=DMARC1; p=none; rua=mailto:dmarc@${customDomain}` },
        { type: 'TXT', name: customDomain, value: `v=spf1 include:amazonses.com ~all` },
        { type: 'CNAME', name: `resend._domainkey.${customDomain}`, value: 'Will be provided after domain registration' },
      ];
    }

    let error;
    if (settings?.id) {
      ({ error } = await supabase
        .from('agency_email_settings')
        .update(payload)
        .eq('id', settings.id));
    } else {
      ({ error } = await supabase
        .from('agency_email_settings')
        .insert(payload));
    }

    if (error) {
      toast.error('Failed to save email settings');
      console.error(error);
    } else {
      toast.success('Email settings saved');
      await fetchSettings();
    }
    setSaving(false);
  };

  const markVerified = async () => {
    if (!settings?.id) return;
    const { error } = await supabase
      .from('agency_email_settings')
      .update({ domain_verified: true, enabled_at: new Date().toISOString() })
      .eq('id', settings.id);

    if (error) toast.error('Failed to verify domain');
    else {
      toast.success('Domain marked as verified');
      await fetchSettings();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hybridPreview = `${agencyName} via OpenKey <notices@openkeyhousing.com>`;
  const customPreview = customFromEmail
    ? `${agencyName} <${customFromEmail}>`
    : customDomain
      ? `${agencyName} <notices@${customDomain}>`
      : hybridPreview;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="w-4 h-4" /> Email Branding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current mode display */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Current mode:</span>
          <Badge variant={senderMode === 'custom_domain' && settings?.domain_verified ? 'default' : 'secondary'}>
            {senderMode === 'custom_domain' ? 'Custom Domain' : 'Hybrid (via OpenKey)'}
          </Badge>
          {senderMode === 'custom_domain' && (
            settings?.domain_verified
              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
              : <XCircle className="w-4 h-4 text-orange-500" />
          )}
        </div>

        {/* Preview */}
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">Emails will appear as:</p>
          <p className="text-sm font-mono">
            {senderMode === 'custom_domain' ? customPreview : hybridPreview}
          </p>
        </div>

        {/* Mode selector */}
        <div>
          <Label>Sender Mode</Label>
          <Select value={senderMode} onValueChange={(v: 'hybrid' | 'custom_domain') => setSenderMode(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hybrid">Hybrid — "{agencyName} via OpenKey" (Free)</SelectItem>
              <SelectItem value="custom_domain">Custom Domain — Send from your own domain (Paid add-on)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {senderMode === 'custom_domain' && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Custom Domain</Label>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g. springfieldhousing.org"
                    value={customDomain}
                    onChange={e => setCustomDomain(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>From Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={`e.g. notices@${customDomain || 'yourdomain.org'}`}
                    value={customFromEmail}
                    onChange={e => setCustomFromEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {isAdmin && (
              <div>
                <Label className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Monthly Add-On Fee
                </Label>
                <Input
                  type="number"
                  className="w-32"
                  value={monthlyFee}
                  onChange={e => setMonthlyFee(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">This fee will be added to the agency's monthly invoice</p>
              </div>
            )}

            {/* DNS Records */}
            {settings?.domain_verification_records && (settings.domain_verification_records as any[]).length > 0 && (
              <div className="space-y-2">
                <Label>Required DNS Records</Label>
                <div className="rounded border bg-muted/30 text-xs font-mono p-3 space-y-2 overflow-x-auto">
                  {(settings.domain_verification_records as any[]).map((rec: any, i: number) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-primary font-semibold w-12">{rec.type}</span>
                      <span className="text-muted-foreground">{rec.name}</span>
                      <span className="text-foreground break-all">{rec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verification controls (admin only) */}
            {isAdmin && settings && !settings.domain_verified && (
              <Button variant="outline" size="sm" onClick={markVerified} className="gap-2">
                <CheckCircle2 className="w-4 h-4" /> Mark Domain as Verified
              </Button>
            )}
          </div>
        )}

        {/* Save button */}
        <div className="flex gap-2 pt-2">
          <Button onClick={saveSettings} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Save Email Settings
          </Button>
          <Button variant="outline" size="sm" onClick={fetchSettings} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {!isAdmin && senderMode === 'hybrid' && (
          <p className="text-xs text-muted-foreground border-t pt-3">
            Want to send emails from your own domain? Contact your OpenKey administrator to enable the custom domain add-on.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AgencyEmailDomainManager;
