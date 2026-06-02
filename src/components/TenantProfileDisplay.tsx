
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { 
  User, 
  Phone, 
  Mail, 
  Home, 
  MapPin,
  CreditCard,
  Shield,
  Edit,
  Save,
  X,
  AlertCircle,
  Search
} from 'lucide-react';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LanguageSelector } from '@/components/ui/language-selector';
import { CurrencySelector } from '@/components/ui/currency-selector';
import { HousingAuthoritySelector } from '@/components/HousingAuthoritySelector';

interface TenantProfileDisplayProps {
  tenantId: string;
  canEdit?: boolean;
}

const TenantProfileDisplay = ({ tenantId, canEdit = false }: TenantProfileDisplayProps) => {
  const { tenantData, loading, error, refetch } = useTenantProfile(tenantId);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if tenant is placed (has active lease)
  const isPlaced = tenantData?.lease && tenantData.lease.propertyAddress;

  const handleEdit = () => {
    setEditData({
      firstName: tenantData?.firstName || '',
      lastName: tenantData?.lastName || '',
      email: tenantData?.email || '',
      phone: tenantData?.phone || '',
      phoneType: tenantData?.phoneType || 'mobile',
      city: tenantData?.city || '',
      zipCode: tenantData?.zipCode || '',
      voucherStatus: tenantData?.voucherStatus || 'no',
      rentRangeMin: tenantData?.rentRangeMin || '',
      rentRangeMax: tenantData?.rentRangeMax || '',
      housingAuthority: tenantData?.housingAuthority || '',
      bedroomsApproved: tenantData?.bedroomsApproved || [],
      moveInWindow: tenantData?.moveInWindow || 'asap',
      creditScore: tenantData?.creditScore || 'below-500',
      hasEviction: tenantData?.hasEviction || false,
      evictionDetails: tenantData?.evictionDetails || '',
      hasPets: tenantData?.hasPets || false,
      petType: tenantData?.petType || '',
      hasAccessibilityNeeds: tenantData?.hasAccessibilityNeeds || false,
      accessibilityDetails: tenantData?.accessibilityDetails || '',
      hasFelonies: tenantData?.hasFelonies || false,
      felonyDetails: tenantData?.felonyDetails || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: editData.firstName,
          last_name: editData.lastName,
          phone: editData.phone
        })
        .eq('id', tenantId);

      if (profileError) throw profileError;

      // Update tenant_profiles table with extended data (using upsert)
      const { error: tenantError } = await supabase
        .from('tenant_profiles')
        .upsert({
          user_id: tenantId,
          phone_type: editData.phoneType,
          city: editData.city,
          zip_code: editData.zipCode,
          voucher_status: editData.voucherStatus,
          rent_range_min: parseFloat(editData.rentRangeMin) || null,
          rent_range_max: parseFloat(editData.rentRangeMax) || null,
          housing_authority: editData.housingAuthority,
          housing_authority_id: editData.housingAuthorityId || null,
          bedrooms_approved: editData.bedroomsApproved,
          move_in_window: editData.moveInWindow,
          credit_score_range: editData.creditScore,
          has_eviction: editData.hasEviction,
          eviction_details: editData.evictionDetails,
          has_pets: editData.hasPets,
          pet_type: editData.petType,
          has_accessibility_needs: editData.hasAccessibilityNeeds,
          accessibility_details: editData.accessibilityDetails,
          has_felonies: editData.hasFelonies,
          felony_details: editData.felonyDetails,
          
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (tenantError) throw tenantError;

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });

      setIsEditing(false);
      // Refresh the data to show updates immediately
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading tenant profile...</p>
        </div>
      </div>
    );
  }

  if (error || !tenantData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Unable to Load Profile</h3>
          <p className="text-muted-foreground">{error || 'Profile data not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {tenantData.firstName} {tenantData.lastName}
          </h1>
          <p className="text-muted-foreground mt-1">Comprehensive Tenant Profile</p>
        </div>
        {canEdit && (
          <div className="flex gap-2 items-center">
            <LanguageSelector compact />
            <CurrencySelector compact userId={tenantId} />
            {isEditing ? (
              <>
                <Button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isPlaced ? (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Home className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Current Rent</p>
                    <p className="text-2xl font-bold text-foreground">${tenantData.lease.totalRent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">HAP Assistance</p>
                    <p className="text-2xl font-bold text-foreground">${tenantData.lease.hapPortion}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Tenant Portion</p>
                    <p className="text-2xl font-bold text-foreground">${tenantData.lease.tenantPortion}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : tenantData.userType === 'tenant' ? (
          <Card className="md:col-span-3 border-dashed border-2 border-border">
            <CardContent className="pt-6 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-muted rounded-full">
                  <Home className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">You're not yet placed</h3>
                  <p className="text-muted-foreground mb-4">Complete your profile and start browsing available properties</p>
                  <Button onClick={() => navigate('/dashboard?tab=My Matches')} className="bg-blue-600 hover:bg-blue-700">
                    <Search className="h-4 w-4 mr-2" />
                    Check Matches
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">First Name</label>
                {isEditing ? (
                  <Input
                    value={editData.firstName}
                    onChange={(e) => setEditData({...editData, firstName: e.target.value})}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-foreground mt-1">{tenantData.firstName}</p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                {isEditing ? (
                  <Input
                    value={editData.lastName}
                    onChange={(e) => setEditData({...editData, lastName: e.target.value})}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-foreground mt-1">{tenantData.lastName}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-foreground">{tenantData.email}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                {isEditing ? (
                  <Input
                    value={editData.phone}
                    onChange={(e) => setEditData({...editData, phone: e.target.value})}
                    className="mt-1"
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-foreground">{tenantData.phone}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone Type</label>
                {isEditing ? (
                  <Select value={editData.phoneType} onValueChange={(value) => setEditData({...editData, phoneType: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iphone">iPhone</SelectItem>
                      <SelectItem value="android">Android</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground mt-1 capitalize">{tenantData.phoneType || 'iPhone'}</p>
                )}
              </div>
            </div>

            {/* Location Info */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">City</label>
                {isEditing ? (
                  <Input
                    value={editData.city}
                    onChange={(e) => setEditData({...editData, city: e.target.value})}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-foreground mt-1">{tenantData.city || 'Not specified'}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Zip Code</label>
                {isEditing ? (
                  <Input
                    value={editData.zipCode}
                    onChange={(e) => setEditData({...editData, zipCode: e.target.value})}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-foreground mt-1">{tenantData.zipCode || 'Not specified'}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Section 8 Voucher Status</label>
                {isEditing ? (
                  <Select value={editData.voucherStatus} onValueChange={(value) => setEditData({...editData, voucherStatus: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="mt-1 capitalize">
                    {tenantData.voucherStatus || 'Not specified'}
                  </Badge>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Rent Range</label>
                {isEditing ? (
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Min"
                      value={editData.rentRangeMin}
                      onChange={(e) => setEditData({...editData, rentRangeMin: e.target.value})}
                    />
                    <Input
                      placeholder="Max"
                      value={editData.rentRangeMax}
                      onChange={(e) => setEditData({...editData, rentRangeMax: e.target.value})}
                    />
                  </div>
                ) : (
                  <p className="text-foreground mt-1">
                    ${tenantData.rentRangeMin || '0'} - ${tenantData.rentRangeMax || '0'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Housing Authority</label>
                {isEditing ? (
                  <HousingAuthoritySelector
                    value={editData.housingAuthorityId || ''}
                    textValue={editData.housingAuthority || ''}
                    onSelect={(authority) => {
                      if (authority) {
                        setEditData({...editData, housingAuthorityId: authority.id, housingAuthority: authority.name});
                      } else {
                        setEditData({...editData, housingAuthorityId: '', housingAuthority: ''});
                      }
                    }}
                    stateFilter={editData.state || undefined}
                  />
                ) : (
                  <p className="text-foreground mt-1">{tenantData.housingAuthority || 'Not specified'}</p>
                )}
              </div>
            </div>

            {/* Preferences & Background */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bedrooms Approved</label>
                {isEditing ? (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {['studio', '1', '2', '3', '4', '5+'].map((bedroom) => (
                      <label key={bedroom} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={editData.bedroomsApproved?.includes(bedroom)}
                          onCheckedChange={(checked) => {
                            const current = editData.bedroomsApproved || [];
                            if (checked) {
                              setEditData({...editData, bedroomsApproved: [...current, bedroom]});
                            } else {
                              setEditData({...editData, bedroomsApproved: current.filter((b: string) => b !== bedroom)});
                            }
                          }}
                        />
                        <span className="text-sm">{bedroom === 'studio' ? 'Studio' : `${bedroom} BR`}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-foreground mt-1">
                    {tenantData.bedroomsApproved?.join(', ') || 'Not specified'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Move-In Window</label>
                {isEditing ? (
                  <Select value={editData.moveInWindow} onValueChange={(value) => setEditData({...editData, moveInWindow: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asap">ASAP</SelectItem>
                      <SelectItem value="30-days">Within 30 Days</SelectItem>
                      <SelectItem value="1-2-months">1-2 Months</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground mt-1 capitalize">{tenantData.moveInWindow?.replace('-', ' ') || 'Not specified'}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Credit Score Range</label>
                {isEditing ? (
                  <Select value={editData.creditScore} onValueChange={(value) => setEditData({...editData, creditScore: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="below-500">Below 500</SelectItem>
                      <SelectItem value="500-579">500-579</SelectItem>
                      <SelectItem value="580-639">580-639</SelectItem>
                      <SelectItem value="640-699">640-699</SelectItem>
                      <SelectItem value="700+">700+</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground mt-1">{tenantData.creditScore || 'Not specified'}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Eviction History</label>
                {isEditing ? (
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={editData.hasEviction} 
                        onCheckedChange={(checked) => setEditData({...editData, hasEviction: checked})}
                      />
                      <span className="text-sm">{editData.hasEviction ? 'Yes' : 'No'}</span>
                    </div>
                    {editData.hasEviction && (
                      <Textarea
                        placeholder="Please provide details..."
                        value={editData.evictionDetails}
                        onChange={(e) => setEditData({...editData, evictionDetails: e.target.value})}
                        className="mt-2"
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-foreground mt-1">
                    {tenantData.hasEviction ? `Yes - ${tenantData.evictionDetails}` : 'No'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Pets</label>
                {isEditing ? (
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={editData.hasPets} 
                        onCheckedChange={(checked) => setEditData({...editData, hasPets: checked})}
                      />
                      <span className="text-sm">{editData.hasPets ? 'Yes' : 'No'}</span>
                    </div>
                    {editData.hasPets && (
                      <Input
                        placeholder="What type of pet(s)?"
                        value={editData.petType}
                        onChange={(e) => setEditData({...editData, petType: e.target.value})}
                        className="mt-2"
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-foreground mt-1">
                    {tenantData.hasPets ? `Yes - ${tenantData.petType}` : 'No'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Accessibility Needs</label>
                {isEditing ? (
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={editData.hasAccessibilityNeeds} 
                        onCheckedChange={(checked) => setEditData({...editData, hasAccessibilityNeeds: checked})}
                      />
                      <span className="text-sm">{editData.hasAccessibilityNeeds ? 'Yes' : 'No'}</span>
                    </div>
                    {editData.hasAccessibilityNeeds && (
                      <Textarea
                        placeholder="Please describe your accessibility needs..."
                        value={editData.accessibilityDetails}
                        onChange={(e) => setEditData({...editData, accessibilityDetails: e.target.value})}
                        className="mt-2"
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-foreground mt-1">
                    {tenantData.hasAccessibilityNeeds ? `Yes - ${tenantData.accessibilityDetails}` : 'No'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Criminal History</label>
                {isEditing ? (
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={editData.hasFelonies} 
                        onCheckedChange={(checked) => setEditData({...editData, hasFelonies: checked})}
                      />
                      <span className="text-sm">{editData.hasFelonies ? 'Yes' : 'No'}</span>
                    </div>
                    {editData.hasFelonies && (
                      <Textarea
                        placeholder="Please provide details..."
                        value={editData.felonyDetails}
                        onChange={(e) => setEditData({...editData, felonyDetails: e.target.value})}
                        className="mt-2"
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-foreground mt-1">
                    {tenantData.hasFelonies ? `Yes - ${tenantData.felonyDetails}` : 'No'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Residence - Only show if placed */}
      {isPlaced && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Current Residence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Home className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{tenantData.lease.propertyAddress}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Unit {tenantData.lease.unitNumber} • {tenantData.lease.bedrooms} bed / {tenantData.lease.bathrooms} bath
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {new Date(tenantData.lease.startDate).toLocaleDateString()} - {new Date(tenantData.lease.endDate).toLocaleDateString()}
                  </span>
                  <Badge variant="outline">Active Lease</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TenantProfileDisplay;
