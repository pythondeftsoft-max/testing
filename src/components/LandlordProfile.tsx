import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { 
  User, Mail, Phone, Building, MapPin, Calendar, FileText, 
  Palette, Shield, CheckCircle, Clock, ArrowLeft, CreditCard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User as SupabaseUser } from '@supabase/supabase-js';
import LandlordDocuments from './LandlordDocuments';
import WhiteLabelSettingsHub from './WhiteLabelSettingsHub';
import WhiteLabelUpgradePrompt from './WhiteLabelUpgradePrompt';
import SubscriptionManager from './SubscriptionManager';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { useWhiteLabelSubscription } from '@/hooks/useWhiteLabelSubscription';
import { useWhiteLabelPlanStatus } from '@/hooks/useWhiteLabelPlanStatus';
import { useHasActivePaidPlans } from '@/hooks/useHasActivePaidPlans';
import { featureFlags } from '@/config/featureFlags';

import PortfolioSelectorDropdown from './PortfolioSelectorDropdown';
import { LanguageSelector } from '@/components/ui/language-selector';
import { CurrencySelector } from '@/components/ui/currency-selector';
import { AccountModeCard } from '@/components/account/AccountModeCard';

interface LandlordProfileProps {
  user: SupabaseUser;
  profile: any;
  onBack: () => void;
  variant?: 'embedded' | 'standalone';
  initialTab?: 'profile' | 'documents' | 'subscriptions' | 'white-label';
  entrySource?: string;
}

const LandlordProfile = ({ user, profile, onBack, variant = 'standalone', initialTab, entrySource }: LandlordProfileProps) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
    company_name: profile?.company_name || '',
  });
  const { toast } = useToast();
  const { config: whiteLabelConfig } = useWhiteLabel(user?.id);
  const { hasWhiteLabelAccess, approvalStatus } = useWhiteLabelSubscription(user?.id);
  const { data: whiteLabelPlanStatus } = useWhiteLabelPlanStatus();
  const isWhiteLabelPlanActive = whiteLabelPlanStatus?.isActive ?? false;
  const { data: hasActivePaidPlans } = useHasActivePaidPlans('landlord');
  
  
  


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          company_name: formData.company_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully."
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      company_name: profile?.company_name || '',
    });
    setIsEditing(false);
  };


  const isEmbedded = variant === 'embedded';

  const tabsContent = (
    <div className="space-y-6">
      <CardEnhanced variant="premium" className="mb-6">
        <CardEnhancedHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={onBack}
              variant="outline"
              size="sm"
              className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <CardEnhancedTitle gradient className="text-2xl md:text-3xl">
                Profile Information
              </CardEnhancedTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your account details
              </p>
            </div>
          </div>
        </CardEnhancedHeader>
      </CardEnhanced>
      <Tabs defaultValue={initialTab || 'profile'} className="space-y-6">
      <TabsList className={`grid w-full grid-cols-${2 + (featureFlags.landlordSubscriptionUiEnabled && hasActivePaidPlans ? 1 : 0) + (isWhiteLabelPlanActive ? 1 : 0)} bg-card/60 backdrop-blur-sm border border-border shadow-sm rounded-lg p-1`}>
        <TabsTrigger 
          value="profile" 
          className="flex items-center gap-2 data-[state=active]:bg-openkey-blue data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
        >
          <User className="h-4 w-4" />
          Profile Information
        </TabsTrigger>
        <TabsTrigger 
          value="documents" 
          className="flex items-center gap-2 data-[state=active]:bg-openkey-blue data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
        >
          <FileText className="h-4 w-4" />
          Documents
        </TabsTrigger>
        {featureFlags.landlordSubscriptionUiEnabled && hasActivePaidPlans && (
          <TabsTrigger 
            value="subscriptions" 
            className="flex items-center gap-2 data-[state=active]:bg-openkey-blue data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            <CreditCard className="h-4 w-4" />
            Subscriptions
          </TabsTrigger>
        )}
        {isWhiteLabelPlanActive && (
          <TabsTrigger 
            value="white-label" 
            className="flex items-center gap-2 data-[state=active]:bg-openkey-blue data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Palette className="h-4 w-4" />
            White Labeling
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="profile" className="space-y-6">
        <AccountModeCard />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card className="bg-card/70 backdrop-blur-sm border-openkey-blue/20 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-openkey-blue/10 to-openkey-blue/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <User className="w-10 h-10 text-openkey-blue" />
                </div>
                <CardTitle className="text-xl text-foreground">
                  {profile?.first_name} {profile?.last_name}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {profile?.company_name || 'Property Owner'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center text-sm text-muted-foreground p-2 bg-openkey-blue/5 rounded-lg">
                  <Mail className="w-4 h-4 mr-2 text-openkey-blue" />
                  {user.email}
                </div>
                {profile?.phone && (
                  <div className="flex items-center text-sm text-muted-foreground p-2 bg-openkey-blue/5 rounded-lg">
                    <Phone className="w-4 h-4 mr-2 text-openkey-blue" />
                    {profile.phone}
                  </div>
                )}
                <div className="flex items-center text-sm text-muted-foreground p-2 bg-openkey-blue/5 rounded-lg">
                  <Calendar className="w-4 h-4 mr-2 text-openkey-blue" />
                  Member since {new Date(profile?.created_at || user.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <Card className="bg-card/70 backdrop-blur-sm border-openkey-blue/20 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-foreground">Personal Information</CardTitle>
                  <CardDescription className="text-muted-foreground">Manage your account details</CardDescription>
                </div>
              {!isEditing ? (
                  <div className="flex items-center gap-2">
                    <LanguageSelector compact />
                    <CurrencySelector compact userId={user.id} />
                    <Button 
                      onClick={() => setIsEditing(true)} 
                      className="bg-openkey-blue hover:bg-openkey-blue-dark text-white shadow-sm"
                    >
                      Edit Profile
                    </Button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleCancel} 
                      variant="outline" 
                      disabled={loading}
                      className="border-border hover:bg-muted"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      disabled={loading}
                      className="bg-openkey-blue hover:bg-openkey-blue-dark text-white shadow-sm"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-sm font-medium text-foreground">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      disabled={!isEditing}
                      className={`transition-all duration-200 ${!isEditing ? 'bg-muted/50 border-border' : 'bg-card border-openkey-blue/30 focus:border-openkey-blue'}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-sm font-medium text-foreground">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      disabled={!isEditing}
                      className={`transition-all duration-200 ${!isEditing ? 'bg-muted/50 border-border' : 'bg-card border-openkey-blue/30 focus:border-openkey-blue'}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">Email Address</Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="bg-muted/50 border-border"
                  />
                  <p className="text-sm text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-foreground">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    className={`transition-all duration-200 ${!isEditing ? 'bg-muted/50 border-border' : 'bg-card border-openkey-blue/30 focus:border-openkey-blue'}`}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-sm font-medium text-foreground">Company Name (Optional)</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    disabled={!isEditing}
                    className={`transition-all duration-200 ${!isEditing ? 'bg-muted/50 border-border' : 'bg-card border-openkey-blue/30 focus:border-openkey-blue'}`}
                    placeholder="Your Property Management Company"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card className="bg-card/70 backdrop-blur-sm border-openkey-blue/20 shadow-sm hover:shadow-md transition-all duration-200 mt-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground">Account Information</CardTitle>
                <CardDescription className="text-muted-foreground">Your account details and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-3 bg-openkey-blue/5 rounded-lg">
                    <Label className="text-sm font-medium text-foreground">Account Type</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Building className="w-4 h-4 text-openkey-blue" />
                      <p className="text-sm text-foreground font-medium capitalize">{profile?.user_type || 'Landlord'}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-lg">
                    <Label className="text-sm font-medium text-foreground">Account Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Active</p>
                    </div>
                  </div>
                  <div className="p-3 bg-openkey-blue/5 rounded-lg">
                    <Label className="text-sm font-medium text-foreground">Last Login</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4 text-openkey-blue" />
                      <p className="text-sm text-foreground">
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-openkey-blue/5 rounded-lg">
                    <Label className="text-sm font-medium text-foreground">Email Verified</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Shield className="w-4 h-4 text-openkey-blue" />
                      <p className="text-sm text-foreground">
                        {user.email_confirmed_at ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="documents" className="space-y-6">
        <LandlordDocuments userId={user.id} />
      </TabsContent>

      {featureFlags.landlordSubscriptionUiEnabled && (
        <TabsContent value="subscriptions" className="space-y-6">
          <SubscriptionManager 
            userId={user.id}
            userType="landlord"
          />
        </TabsContent>
      )}

      {isWhiteLabelPlanActive && (
        <TabsContent value="white-label" className="space-y-6">
          {hasWhiteLabelAccess ? (
            <>
              {approvalStatus === 'pending' && (
                <Card className="border-yellow-500/30 bg-yellow-500/10">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <div>
                        <h3 className="font-semibold text-yellow-600 dark:text-yellow-400">White-Label Configuration Pending Approval</h3>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">
                          Your white-label setup is under review by our team. You can continue configuring, but activation is pending approval.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <WhiteLabelSettingsHub 
                configId={whiteLabelConfig?.id || 'new'} 
                hasActiveSubscription={hasWhiteLabelAccess}
              />
            </>
          ) : (
            <WhiteLabelUpgradePrompt />
          )}
        </TabsContent>
      )}
    </Tabs>
    </div>
  );

  return isEmbedded ? (
    tabsContent
  ) : (
    <div className="min-h-screen bg-gradient-to-br from-openkey-blue/5 to-openkey-gold/5">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tabsContent}
      </main>
    </div>
  );
};

export default LandlordProfile;
