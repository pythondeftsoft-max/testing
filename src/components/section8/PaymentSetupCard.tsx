import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle, Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentSetupCardProps {
  registrationId: string;
  landlordId: string;
  paymentMethod: string;
  portfolioId?: string;
}

export const PaymentSetupCard = ({ registrationId, landlordId, paymentMethod, portfolioId }: PaymentSetupCardProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    recipient_name: '',
    routing_number: '',
    account_number: '',
    account_type: 'checking',
    email: '',
    address_line1: '',
    address_line2: '',
    address_city: '',
    address_state: '',
    address_zip: '',
  });

  const isACH = paymentMethod === 'ach' || paymentMethod === 'direct_deposit';

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('landlord_payout_profiles')
        .select('*')
        .eq('landlord_id', landlordId)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        setProfileId(data.id);
        const addr = data.address as any;
        setFormData({
          recipient_name: data.recipient_name || '',
          routing_number: (data as any).routing_number || '',
          account_number: (data as any).account_number || '',
          account_type: 'checking',
          email: data.email || '',
          address_line1: addr?.line1 || '',
          address_line2: addr?.line2 || '',
          address_city: addr?.city || '',
          address_state: addr?.state || '',
          address_zip: addr?.postal_code || '',
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [landlordId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        landlord_id: landlordId,
        recipient_name: formData.recipient_name,
        default_payout_method: isACH ? 'ach' : 'check',
        email: formData.email || null,
        is_active: true,
      };

      if (isACH) {
        payload.routing_number = formData.routing_number;
        payload.account_number = formData.account_number;
      }

      if (!isACH) {
        payload.address = {
          line1: formData.address_line1,
          line2: formData.address_line2 || undefined,
          city: formData.address_city,
          state: formData.address_state,
          postal_code: formData.address_zip,
          country: 'US',
        };
      }

      if (portfolioId && portfolioId !== 'everything') {
        payload.portfolio_id = portfolioId;
      }

      if (profileId) {
        const { error } = await supabase
          .from('landlord_payout_profiles')
          .update(payload)
          .eq('id', profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('landlord_payout_profiles')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Payment information saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save payment info');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isComplete = isACH
    ? !!(formData.recipient_name && formData.routing_number && formData.account_number)
    : !!(formData.recipient_name && formData.address_line1 && formData.address_city && formData.address_state && formData.address_zip);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payment Setup — {isACH ? 'ACH / Direct Deposit' : 'Mailed Check'}
          </CardTitle>
          {isComplete && profileId ? (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Complete
            </Badge>
          ) : (
            <Badge variant="secondary">Setup Required</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Recipient Name *</Label>
          <Input
            value={formData.recipient_name}
            onChange={e => setFormData(p => ({ ...p, recipient_name: e.target.value }))}
            placeholder="Name as it should appear on payments"
          />
        </div>

        {isACH ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Routing Number *</Label>
                <Input
                  value={formData.routing_number}
                  onChange={e => setFormData(p => ({ ...p, routing_number: e.target.value }))}
                  placeholder="9-digit routing number"
                  maxLength={9}
                />
              </div>
              <div>
                <Label>Account Number *</Label>
                <Input
                  value={formData.account_number}
                  onChange={e => setFormData(p => ({ ...p, account_number: e.target.value }))}
                  placeholder="Account number"
                  type="password"
                />
              </div>
            </div>
            <div>
              <Label>Account Type</Label>
              <Select value={formData.account_type} onValueChange={v => setFormData(p => ({ ...p, account_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <>
            <div>
              <Label>Mailing Address Line 1 *</Label>
              <Input
                value={formData.address_line1}
                onChange={e => setFormData(p => ({ ...p, address_line1: e.target.value }))}
                placeholder="Street address"
              />
            </div>
            <div>
              <Label>Address Line 2</Label>
              <Input
                value={formData.address_line2}
                onChange={e => setFormData(p => ({ ...p, address_line2: e.target.value }))}
                placeholder="Apt, Suite, etc."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City *</Label>
                <Input
                  value={formData.address_city}
                  onChange={e => setFormData(p => ({ ...p, address_city: e.target.value }))}
                />
              </div>
              <div>
                <Label>State *</Label>
                <Input
                  value={formData.address_state}
                  onChange={e => setFormData(p => ({ ...p, address_state: e.target.value }))}
                  maxLength={2}
                  placeholder="CA"
                />
              </div>
              <div>
                <Label>ZIP *</Label>
                <Input
                  value={formData.address_zip}
                  onChange={e => setFormData(p => ({ ...p, address_zip: e.target.value }))}
                  maxLength={10}
                />
              </div>
            </div>
          </>
        )}

        <div>
          <Label>Email (for payment notifications)</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
            placeholder="your@email.com"
          />
        </div>

        <Button onClick={handleSave} disabled={saving || !isComplete}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Payment Info'}
        </Button>
      </CardContent>
    </Card>
  );
};
