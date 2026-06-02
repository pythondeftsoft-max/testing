
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, RotateCcw, User } from 'lucide-react';
import { HousingAuthoritySelector } from '@/components/HousingAuthoritySelector';
import type { TenantProfileData } from '@/hooks/useTenantProfile';
import { AdminSubscriptionManager } from './AdminSubscriptionManager';

interface AdminTenantProfileEditorProps {
  tenantData: TenantProfileData;
  onSaved: () => void;
}

export const AdminTenantProfileEditor: React.FC<AdminTenantProfileEditorProps> = ({
  tenantData,
  onSaved,
}) => {
  const [formData, setFormData] = useState({
    // Basic Info
    first_name: tenantData.firstName,
    last_name: tenantData.lastName,
    phone: tenantData.phone,
    phone_type: tenantData.phoneType || 'iphone',
    
    // Location
    city: tenantData.city || '',
    zip_code: tenantData.zipCode || '',
    
    // Voucher & Housing
    voucher_status: tenantData.voucherStatus,
    rent_range_min: tenantData.rentRangeMin || 0,
    rent_range_max: tenantData.rentRangeMax || 0,
    housing_authority: tenantData.housingAuthority || '',
    housing_authority_id: (tenantData as any).housingAuthorityId || '',
    bedrooms_approved: tenantData.bedroomsApproved || [],
    move_in_window: tenantData.moveInWindow,
    
    // Background
    credit_score_range: tenantData.creditScore || '',
    has_eviction: tenantData.hasEviction || false,
    eviction_details: tenantData.evictionDetails || '',
    has_pets: tenantData.hasPets || false,
    pet_type: tenantData.petType || '',
    has_accessibility_needs: tenantData.hasAccessibilityNeeds || false,
    accessibility_details: tenantData.accessibilityDetails || '',
    has_felonies: tenantData.hasFelonies || false,
    felony_details: tenantData.felonyDetails || '',
    
    // Account Controls - use defaults since these might not be in TenantProfileData interface
    message_credits: 2,
    is_plus_subscriber: false,
    free_applications_remaining: 5,
    can_initiate_messaging: true,
  });

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { toast } = useToast();

  // Fetch current account control values from database
  useEffect(() => {
    const fetchAccountControls = async () => {
      const { data } = await supabase
        .from('tenant_profiles')
        .select('message_credits, is_plus_subscriber, free_applications_remaining, can_initiate_messaging')
        .eq('user_id', tenantData.id)
        .single();
      
      if (data) {
        setFormData(prev => ({
          ...prev,
          message_credits: data.message_credits || 2,
          is_plus_subscriber: data.is_plus_subscriber || false,
          free_applications_remaining: data.free_applications_remaining || 5,
          can_initiate_messaging: data.can_initiate_messaging !== false,
        }));
      }
    };

    fetchAccountControls();
  }, [tenantData.id]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        })
        .eq('id', tenantData.id);

      if (profileError) throw profileError;

      // Update tenant_profiles table
      const { error: tenantError } = await supabase
        .from('tenant_profiles')
        .upsert({
          user_id: tenantData.id,
          phone_type: formData.phone_type,
          city: formData.city,
          zip_code: formData.zip_code,
          voucher_status: formData.voucher_status,
          rent_range_min: formData.rent_range_min,
          rent_range_max: formData.rent_range_max,
          housing_authority: formData.housing_authority,
          housing_authority_id: formData.housing_authority_id || null,
          bedrooms_approved: formData.bedrooms_approved,
          move_in_window: formData.move_in_window,
          credit_score_range: formData.credit_score_range,
          has_eviction: formData.has_eviction,
          eviction_details: formData.eviction_details,
          has_pets: formData.has_pets,
          pet_type: formData.pet_type,
          has_accessibility_needs: formData.has_accessibility_needs,
          accessibility_details: formData.accessibility_details,
          has_felonies: formData.has_felonies,
          felony_details: formData.felony_details,
          message_credits: formData.message_credits,
          is_plus_subscriber: formData.is_plus_subscriber,
          free_applications_remaining: formData.free_applications_remaining,
          can_initiate_messaging: formData.can_initiate_messaging,
          updated_at: new Date().toISOString(),
        });

      if (tenantError) throw tenantError;

      toast({
        title: "Success",
        description: "Tenant profile updated successfully.",
      });

      onSaved();
    } catch (error) {
      console.error('Error updating tenant profile:', error);
      toast({
        title: "Error",
        description: "Failed to update tenant profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetApplications = async () => {
    setResetLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_reset_tenant_applications', {
        p_tenant_id: tenantData.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Monthly application counter has been reset to 0.",
      });

      onSaved();
    } catch (error) {
      console.error('Error resetting applications:', error);
      toast({
        title: "Error",
        description: "Failed to reset application counter.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const toggleBedroom = (bedroom: string) => {
    const newBedrooms = formData.bedrooms_approved.includes(bedroom)
      ? formData.bedrooms_approved.filter(b => b !== bedroom)
      : [...formData.bedrooms_approved, bedroom];
    
    setFormData(prev => ({ ...prev, bedrooms_approved: newBedrooms }));
  };

  return (
    <div className="space-y-6">
      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Admin Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleResetApplications}
              disabled={resetLoading}
            >
              {resetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Reset Applications
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Account Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="message_credits">Message Credits</Label>
              <Input
                id="message_credits"
                type="number"
                min="0"
                value={formData.message_credits}
                onChange={(e) => setFormData(prev => ({ ...prev, message_credits: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="free_applications_remaining">Free Applications Remaining</Label>
              <Input
                id="free_applications_remaining"
                type="number"
                min="0"
                value={formData.free_applications_remaining}
                onChange={(e) => setFormData(prev => ({ ...prev, free_applications_remaining: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_plus_subscriber"
                checked={formData.is_plus_subscriber}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_plus_subscriber: checked }))}
              />
              <Label htmlFor="is_plus_subscriber">Plus Subscriber</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="can_initiate_messaging"
                checked={formData.can_initiate_messaging}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_initiate_messaging: checked }))}
              />
              <Label htmlFor="can_initiate_messaging">Can Initiate Messaging</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Management */}
      <AdminSubscriptionManager
        tenantId={tenantData.id}
        onUpdated={onSaved}
      />

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone_type">Phone Type</Label>
              <Select value={formData.phone_type} onValueChange={(value) => setFormData(prev => ({ ...prev, phone_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iphone">iPhone</SelectItem>
                  <SelectItem value="android">Android</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="zip_code">ZIP Code</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Housing Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Housing Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="voucher_status">Voucher Status</Label>
            <Select value={formData.voucher_status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, voucher_status: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rent_range_min">Min Rent</Label>
              <Input
                id="rent_range_min"
                type="number"
                value={formData.rent_range_min}
                onChange={(e) => setFormData(prev => ({ ...prev, rent_range_min: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="rent_range_max">Max Rent</Label>
              <Input
                id="rent_range_max"
                type="number"
                value={formData.rent_range_max}
                onChange={(e) => setFormData(prev => ({ ...prev, rent_range_max: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="housing_authority">Housing Authority</Label>
            <HousingAuthoritySelector
              value={formData.housing_authority_id || ''}
              textValue={formData.housing_authority}
              onSelect={(authority) => {
                if (authority) {
                  setFormData(prev => ({ ...prev, housing_authority: authority.name, housing_authority_id: authority.id }));
                }
              }}
            />
          </div>

          <div>
            <Label>Approved Bedrooms</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {['Studio', '1', '2', '3', '4+'].map((bedroom) => (
                <Badge
                  key={bedroom}
                  variant={formData.bedrooms_approved.includes(bedroom) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleBedroom(bedroom)}
                >
                  {bedroom} {formData.bedrooms_approved.includes(bedroom) ? '✓' : ''}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="move_in_window">Move-in Window</Label>
            <Select value={formData.move_in_window} onValueChange={(value: any) => setFormData(prev => ({ ...prev, move_in_window: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asap">ASAP</SelectItem>
                <SelectItem value="30-days">Within 30 Days</SelectItem>
                <SelectItem value="1-2-months">1-2 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Background Information */}
      <Card>
        <CardHeader>
          <CardTitle>Background Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="credit_score_range">Credit Score Range</Label>
            <Select value={formData.credit_score_range} onValueChange={(value) => setFormData(prev => ({ ...prev, credit_score_range: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent (750+)</SelectItem>
                <SelectItem value="good">Good (700-749)</SelectItem>
                <SelectItem value="fair">Fair (650-699)</SelectItem>
                <SelectItem value="poor">Poor (Below 650)</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="has_eviction"
                checked={formData.has_eviction}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_eviction: checked }))}
              />
              <Label htmlFor="has_eviction">Has Eviction History</Label>
            </div>
            {formData.has_eviction && (
              <Textarea
                placeholder="Eviction details..."
                value={formData.eviction_details}
                onChange={(e) => setFormData(prev => ({ ...prev, eviction_details: e.target.value }))}
              />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="has_pets"
                checked={formData.has_pets}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_pets: checked }))}
              />
              <Label htmlFor="has_pets">Has Pets</Label>
            </div>
            {formData.has_pets && (
              <Input
                placeholder="Pet type and details..."
                value={formData.pet_type}
                onChange={(e) => setFormData(prev => ({ ...prev, pet_type: e.target.value }))}
              />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="has_accessibility_needs"
                checked={formData.has_accessibility_needs}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_accessibility_needs: checked }))}
              />
              <Label htmlFor="has_accessibility_needs">Has Accessibility Needs</Label>
            </div>
            {formData.has_accessibility_needs && (
              <Textarea
                placeholder="Accessibility requirements..."
                value={formData.accessibility_details}
                onChange={(e) => setFormData(prev => ({ ...prev, accessibility_details: e.target.value }))}
              />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="has_felonies"
                checked={formData.has_felonies}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_felonies: checked }))}
              />
              <Label htmlFor="has_felonies">Has Criminal Background</Label>
            </div>
            {formData.has_felonies && (
              <Textarea
                placeholder="Criminal background details..."
                value={formData.felony_details}
                onChange={(e) => setFormData(prev => ({ ...prev, felony_details: e.target.value }))}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
};
