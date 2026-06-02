
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { CountrySelector } from '@/components/ui/country-selector';
import { getStatesForCountry, getStateLabelForCountry } from '@/lib/stateUtils';

const TenantForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: 'US',
    state: '',
    hasVoucher: false,
    voucherAmount: '',
    smsConsent: false,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.smsConsent) {
      toast({
        title: "SMS Consent Required",
        description: "Please agree to receive text updates to continue.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('tenant_applications')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            country_code: formData.countryCode,
            state: formData.state,
            has_voucher: formData.hasVoucher,
            voucher_amount: formData.voucherAmount ? parseFloat(formData.voucherAmount) : null,
          }
        ]);

      if (error) throw error;

      // Store that application was submitted
      localStorage.setItem('tenant_application_submitted', 'true');

      toast({
        title: "Application submitted!",
        description: "You can now create your tenant account to access housing opportunities.",
      });

      // Redirect to tenant auth page
      navigate('/tenant-auth');
    } catch (error: any) {
      toast({
        title: "Error submitting application",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">Tenant Application</CardTitle>
            <CardDescription>
              Tell us about yourself so we can help you find the perfect home
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <CountrySelector
                  value={formData.countryCode}
                  onValueChange={(value) => {
                    setFormData({ 
                      ...formData, 
                      countryCode: value,
                      state: '' // Reset state when country changes
                    });
                  }}
                  placeholder="Select country"
                />
              </div>

              {formData.countryCode === 'US' && (
                <div>
                  <Label htmlFor="state">State</Label>
                  <select
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select state</option>
                    {getStatesForCountry('US').map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasVoucher"
                  checked={formData.hasVoucher}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasVoucher: !!checked })}
                />
                <Label htmlFor="hasVoucher">Do you have a Section 8 voucher?</Label>
              </div>

              {formData.hasVoucher && (
                <div>
                  <Label htmlFor="voucherAmount">Voucher Amount ($)</Label>
                  <Input
                    id="voucherAmount"
                    type="number"
                    step="0.01"
                    value={formData.voucherAmount}
                    onChange={(e) => setFormData({ ...formData, voucherAmount: e.target.value })}
                    placeholder="e.g., 1200.00"
                  />
                </div>
              )}

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="smsConsent"
                  checked={formData.smsConsent}
                  onCheckedChange={(checked) => setFormData({ ...formData, smsConsent: !!checked })}
                  className="mt-0.5"
                />
                <Label htmlFor="smsConsent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  <span className="text-destructive">*</span> I agree to receive text updates from OpenKey about my housing search. Message frequency varies. Reply STOP to opt out.
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TenantForm;
