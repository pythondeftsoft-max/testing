import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import WhiteLabelPreview from '@/components/WhiteLabelPreview';
import ThemePresetSelector from '@/components/ThemePresetSelector';
import { ErrorBoundaryWhiteLabel } from '@/components/ErrorBoundaryWhiteLabel';
import { WhiteLabelAnalytics } from '@/components/WhiteLabelAnalytics';
import { WhiteLabelTesting } from '@/components/WhiteLabelTesting';
import { WhiteLabelRefinements } from '@/components/WhiteLabelRefinements';
import WhiteLabelIntegrationTester from '@/components/WhiteLabelIntegrationTester';
import WhiteLabelSecurityValidator from '@/components/WhiteLabelSecurityValidator';
import { DomainVerificationManager } from '@/components/DomainVerificationManager';
import {
  User,
  Building,
  Copy,
  ExternalLink,
  Save,
  Settings,
  Globe,
  Shield,
  CheckCircle,
  AlertCircle,
  Palette,
  Layout,
  Mail,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { buildSubdomainUrl, getSubdomainPlaceholder, getSubdomainSuffix } from '@/utils/baseDomain';
import { useDomainVerification } from '@/hooks/useDomainVerification';

interface WhiteLabelSettingsProps {
  userId: string;
  hasActiveSubscription: boolean;
}

const WhiteLabelSettings = ({ userId, hasActiveSubscription }: WhiteLabelSettingsProps) => {
  const { toast } = useToast();
  const { config, isLoading, error, saveConfig, uploadFile, isSaving } = useWhiteLabel(userId);
  const queryClient = useQueryClient();
  
  // Domain verification functions
  const {
    verifyCustomDomain,
    isVerifyingCustomDomain,
    testConfiguration,
    isTestingConfiguration
  } = useDomainVerification(config?.id);

  const [formData, setFormData] = useState({
    company_name: config?.company_name || '',
    company_logo_url: config?.company_logo_url || '',
    primary_color: config?.primary_color || '#2563eb',
    secondary_color: config?.secondary_color || '#1e40af',
    accent_color: config?.accent_color || '#3b82f6',
    custom_subdomain: config?.custom_subdomain || '',
    custom_domain: config?.custom_domain || '',
    favicon_url: config?.favicon_url || '',
    footer_text: config?.footer_text || '',
    contact_email: config?.contact_email || '',
    contact_phone: config?.contact_phone || '',
    address: config?.address || '',
    is_active: config?.is_active || false,
    subscription_tier: config?.subscription_tier || '',
    theme_preset: config?.theme_preset || 'custom',
    landing_page_config: config?.landing_page_config || {
      hero_title: 'Welcome to Your Portal',
      hero_subtitle: 'Manage your properties with ease',
      cta_text: 'Get Started',
      features: [
        { title: 'Property Management', description: 'Easily manage all your properties' },
        { title: 'Tenant Portal', description: 'Streamlined tenant experience' },
        { title: 'Analytics', description: 'Comprehensive reporting tools' }
      ]
    },
    email_template_config: config?.email_template_config || {
      header_bg: config?.primary_color || '#2563eb',
      footer_text: config?.footer_text || '© 2024 Your Company'
    },
  });

  const [previewType, setPreviewType] = useState<'landing' | 'email' | 'portal'>('landing');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');

  React.useEffect(() => {
    if (config) {
      setFormData({
        company_name: config.company_name || '',
        company_logo_url: config.company_logo_url || '',
        primary_color: config.primary_color || '#2563eb',
        secondary_color: config.secondary_color || '#1e40af',
        accent_color: config.accent_color || '#3b82f6',
        custom_subdomain: config.custom_subdomain || '',
        custom_domain: config.custom_domain || '',
        favicon_url: config.favicon_url || '',
        footer_text: config.footer_text || '',
        contact_email: config.contact_email || '',
        contact_phone: config.contact_phone || '',
        address: config.address || '',
        is_active: config.is_active || false,
        subscription_tier: config.subscription_tier || '',
        theme_preset: config.theme_preset || 'custom',
        landing_page_config: config.landing_page_config || {
          hero_title: 'Welcome to Your Portal',
          hero_subtitle: 'Manage your properties with ease',
          cta_text: 'Get Started',
          features: [
            { title: 'Property Management', description: 'Easily manage all your properties' },
            { title: 'Tenant Portal', description: 'Streamlined tenant experience' },
            { title: 'Analytics', description: 'Comprehensive reporting tools' }
          ]
        },
        email_template_config: config.email_template_config || {
          header_bg: config.primary_color || '#2563eb',
          footer_text: config.footer_text || '© 2024 Your Company'
        },
      });
    }
  }, [config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  const onDropLogo = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    try {
      const url = await uploadFile(file, 'logos');
      setFormData(prev => ({ ...prev, company_logo_url: url }));
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload company logo. Please try again.",
        variant: "destructive",
      });
    }
  }, [uploadFile, toast]);

  const onDropFavicon = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    try {
      const url = await uploadFile(file, 'favicons');
      setFormData(prev => ({ ...prev, favicon_url: url }));
    } catch (error: any) {
      console.error('Error uploading favicon:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload favicon. Please try again.",
        variant: "destructive",
      });
    }
  }, [uploadFile, toast]);

  const { getRootProps: getLogoRootProps, getInputProps: getLogoInputProps } = useDropzone({
    onDrop: onDropLogo,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
    },
    maxFiles: 1,
  });

  const { getRootProps: getFaviconRootProps, getInputProps: getFaviconInputProps } = useDropzone({
    onDrop: onDropFavicon,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/x-icon': ['.ico'],
    },
    maxFiles: 1,
  });

  const save = async (data: any) => {
    saveConfig(data);
  };

  const getPortalUrl = () => {
    if (typeof window === 'undefined') return '';

    const { custom_domain, custom_subdomain } = formData;

    if (custom_domain) {
      return `https://${custom_domain}`;
    }

    if (custom_subdomain) {
      return buildSubdomainUrl(custom_subdomain);
    }

    return window.location.origin;
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Portal URL copied to clipboard.",
    });
  };

  // Domain verification hook
  const { 
    getSubdomainStatus, 
    getCustomDomainStatus, 
    getDisplayStatus, 
    verifySubdomain,
    isVerifying 
  } = useDomainVerification(config?.id || '');

  const handleThemePresetSelect = (preset: any) => {
    setFormData(prev => ({
      ...prev,
      theme_preset: preset.id,
      primary_color: preset.colors.primary,
      secondary_color: preset.colors.secondary,
      accent_color: preset.colors.accent,
    }));
  };

  const updateLandingPageConfig = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      landing_page_config: {
        ...(typeof prev.landing_page_config === 'object' ? prev.landing_page_config : {}),
        [field]: value
      }
    }));
  };

  const updateEmailTemplateConfig = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      email_template_config: {
        ...(typeof prev.email_template_config === 'object' ? prev.email_template_config : {}),
        [field]: value
      }
    }));
  };

  const addFeature = () => {
    const newFeature = { title: 'New Feature', description: 'Feature description' };
    const config = formData.landing_page_config as any;
    updateLandingPageConfig('features', [...(config?.features || []), newFeature]);
  };

  const removeFeature = (index: number) => {
    const config = formData.landing_page_config as any;
    const features = config?.features || [];
    updateLandingPageConfig('features', features.filter((_: any, i: number) => i !== index));
  };

  const updateFeature = (index: number, field: string, value: string) => {
    const config = formData.landing_page_config as any;
    const features = [...(config?.features || [])];
    features[index] = { ...features[index], [field]: value };
    updateLandingPageConfig('features', features);
  };

  return (
    <ErrorBoundaryWhiteLabel>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-yellow-500 bg-clip-text text-transparent">
          White Label Settings
        </h1>
        <p className="text-gray-600 mt-2">Customize your brand appearance and portal settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="branding" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-12 bg-gray-100 rounded-xl p-1">
              <TabsTrigger 
                value="branding" 
                className="h-10 rounded-lg font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <Palette className="w-4 h-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger 
                value="landing" 
                className="h-10 rounded-lg font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <Layout className="w-4 h-4" />
                Landing
              </TabsTrigger>
              <TabsTrigger 
                value="email" 
                className="h-10 rounded-lg font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email
              </TabsTrigger>
              <TabsTrigger 
                value="domains" 
                className="h-10 rounded-lg font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                Domains
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branding" className="space-y-6">
              <Card className="border-0 shadow-lg bg-card">
                <CardHeader className="bg-primary/5 border-b border-border">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-yellow-500 rounded-lg">
                      <Palette className="h-5 w-5 text-white" />
                    </div>
                    Branding Configuration
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">Customize the look and feel of your application</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  {/* Theme Preset Selector */}
                  <ThemePresetSelector 
                    selectedPreset={formData.theme_preset}
                    onPresetSelect={handleThemePresetSelect}
                  />

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Custom Colors</h3>
                    <div className="grid gap-6">
                      <div>
                        <Label htmlFor="company_name" className="text-sm font-semibold text-gray-700">Company Name</Label>
                        <Input
                          type="text"
                          id="company_name"
                          name="company_name"
                          value={formData.company_name}
                          onChange={handleChange}
                          className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 h-11"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-gray-700">Company Logo</Label>
                        <div {...getLogoRootProps()} className="mt-2 dropzone w-full border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50 text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors">
                          <input {...getLogoInputProps()} />
                          {formData.company_logo_url ? (
                            <img src={formData.company_logo_url} alt="Company Logo" className="max-h-20 max-w-full object-contain" />
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.884-8.414l1.732 1.732a3 3 0 002.828 2.828l-1.732 1.732a4.5 4.5 0 013.182 0" />
                              </svg>
                              <p className="text-center font-medium">Drop your logo here, or click to browse</p>
                              <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, GIF files</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <Label htmlFor="primary_color" className="text-sm font-semibold text-gray-700">Primary Color</Label>
                          <div className="mt-2 flex items-center gap-3">
                            <Input
                              type="color"
                              id="primary_color"
                              name="primary_color"
                              value={formData.primary_color}
                              onChange={handleChange}
                              className="w-16 h-11 p-1 border-gray-200"
                            />
                            <Input
                              type="text"
                              value={formData.primary_color}
                              onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                              className="flex-1 border-gray-200 h-11"
                              placeholder="#0066CC"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="secondary_color" className="text-sm font-semibold text-gray-700">Secondary Color</Label>
                          <div className="mt-2 flex items-center gap-3">
                            <Input
                              type="color"
                              id="secondary_color"
                              name="secondary_color"
                              value={formData.secondary_color}
                              onChange={handleChange}
                              className="w-16 h-11 p-1 border-gray-200"
                            />
                            <Input
                              type="text"
                              value={formData.secondary_color}
                              onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                              className="flex-1 border-gray-200 h-11"
                              placeholder="#F59E0B"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="accent_color" className="text-sm font-semibold text-gray-700">Accent Color</Label>
                          <div className="mt-2 flex items-center gap-3">
                            <Input
                              type="color"
                              id="accent_color"
                              name="accent_color"
                              value={formData.accent_color}
                              onChange={handleChange}
                              className="w-16 h-11 p-1 border-gray-200"
                            />
                            <Input
                              type="text"
                              value={formData.accent_color}
                              onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                              className="flex-1 border-gray-200 h-11"
                              placeholder="#10B981"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="custom_subdomain" className="text-sm font-semibold text-gray-700">Custom Subdomain</Label>
                          <Input
                            type="text"
                            id="custom_subdomain"
                            name="custom_subdomain"
                            value={formData.custom_subdomain}
                            onChange={handleChange}
                            className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 h-11"
                            placeholder="yourcompany"
                          />
                          <p className="text-xs text-gray-500 mt-1">{getSubdomainPlaceholder()}</p>
                        </div>

                        <div>
                          <Label htmlFor="custom_domain" className="text-sm font-semibold text-gray-700">Custom Domain</Label>
                          <Input
                            type="text"
                            id="custom_domain"
                            name="custom_domain"
                            value={formData.custom_domain}
                            onChange={handleChange}
                            className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 h-11"
                            placeholder="portal.yourcompany.com"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-gray-700">Favicon</Label>
                        <div {...getFaviconRootProps()} className="mt-2 dropzone w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors">
                          <input {...getFaviconInputProps()} />
                          {formData.favicon_url ? (
                            <img src={formData.favicon_url} alt="Favicon" className="max-h-8 max-w-full object-contain" />
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mb-2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.884-8.414l1.732 1.732a3 3 0 002.828 2.828l-1.732 1.732a4.5 4.5 0 013.182 0" />
                              </svg>
                              <p className="text-center font-medium">Drop your .ico file here, or click to browse</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="footer_text" className="text-sm font-semibold text-gray-700">Footer Text</Label>
                          <Input
                            type="text"
                            id="footer_text"
                            name="footer_text"
                            value={formData.footer_text}
                            onChange={handleChange}
                            className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 h-11"
                            placeholder="© 2024 Your Company Name"
                          />
                        </div>

                        <div>
                          <Label htmlFor="contact_email" className="text-sm font-semibold text-gray-700">Contact Email</Label>
                          <Input
                            type="email"
                            id="contact_email"
                            name="contact_email"
                            value={formData.contact_email}
                            onChange={handleChange}
                            className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 h-11"
                            placeholder="support@yourcompany.com"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="contact_phone" className="text-sm font-semibold text-gray-700">Contact Phone</Label>
                          <Input
                            type="tel"
                            id="contact_phone"
                            name="contact_phone"
                            value={formData.contact_phone}
                            onChange={handleChange}
                            className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 h-11"
                            placeholder="(555) 123-4567"
                          />
                        </div>

                        <div>
                          <Label htmlFor="address" className="text-sm font-semibold text-gray-700">Business Address</Label>
                          <Input
                            type="text"
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 h-11"
                            placeholder="123 Main St, City, State 12345"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <Label htmlFor="is_active" className="text-sm font-semibold text-gray-700">Enable White Label</Label>
                          <p className="text-xs text-gray-500 mt-1">Activate your custom branding across all portals</p>
                        </div>
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="subscription_tier" className="text-sm font-semibold text-gray-700">Subscription Tier</Label>
                        <Input
                          type="text"
                          id="subscription_tier"
                          name="subscription_tier"
                          value={formData.subscription_tier}
                          onChange={handleChange}
                          className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 h-11"
                          placeholder="Pro"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50 border-t border-gray-100 px-8 py-6">
                  <Button 
                    onClick={() => save(formData)} 
                    disabled={isSaving}
                    className="bg-gradient-to-r from-blue-600 to-yellow-500 hover:from-blue-700 hover:to-yellow-600 text-white px-8 py-3 h-12 font-semibold"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Branding Settings
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>


            <TabsContent value="landing" className="space-y-6">
              <Card className="border-0 shadow-lg bg-card">
                <CardHeader className="bg-primary/5 border-b border-border">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-yellow-500 rounded-lg">
                      <Layout className="h-5 w-5 text-white" />
                    </div>
                    Landing Page Configuration
                  </CardTitle>
                  <CardDescription className="text-gray-700">Customize your landing page content and features</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  {/* Hero Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Hero Section</h3>
                    <div className="grid gap-6">
                      <div>
                        <Label htmlFor="hero_title" className="text-sm font-semibold text-gray-700">Hero Title</Label>
                        <Input
                          type="text"
                          id="hero_title"
                          value={(formData.landing_page_config as any)?.hero?.title || ''}
                          onChange={(e) => updateLandingPageConfig('hero', {
                            ...(formData.landing_page_config as any)?.hero,
                            title: e.target.value
                          })}
                          className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 h-11"
                          placeholder="Welcome to Your Portal"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="hero_subtitle" className="text-sm font-semibold text-gray-700">Hero Subtitle</Label>
                        <Textarea
                          id="hero_subtitle"
                          value={(formData.landing_page_config as any)?.hero?.subtitle || ''}
                          onChange={(e) => updateLandingPageConfig('hero', {
                            ...(formData.landing_page_config as any)?.hero,
                            subtitle: e.target.value
                          })}
                          className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                          placeholder="Manage your properties with ease"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="cta_text" className="text-sm font-semibold text-gray-700">Call-to-Action Button Text</Label>
                        <Input
                          type="text"
                          id="cta_text"
                          value={(formData.landing_page_config as any)?.hero?.ctaText || ''}
                          onChange={(e) => updateLandingPageConfig('hero', {
                            ...(formData.landing_page_config as any)?.hero,
                            ctaText: e.target.value
                          })}
                          className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 h-11"
                          placeholder="Get Started Today"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-gray-700">Background Type</Label>
                        <div className="mt-2 flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="backgroundType"
                              value="gradient"
                              checked={(formData.landing_page_config as any)?.hero?.backgroundType === 'gradient'}
                              onChange={(e) => updateLandingPageConfig('hero', {
                                ...(formData.landing_page_config as any)?.hero,
                                backgroundType: e.target.value
                              })}
                              className="text-blue-500"
                            />
                            <span className="text-sm">Gradient</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="backgroundType"
                              value="image"
                              checked={(formData.landing_page_config as any)?.hero?.backgroundType === 'image'}
                              onChange={(e) => updateLandingPageConfig('hero', {
                                ...(formData.landing_page_config as any)?.hero,
                                backgroundType: e.target.value
                              })}
                              className="text-blue-500"
                            />
                            <span className="text-sm">Image</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Features Section */}
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Features</h3>
                      <Button 
                        type="button" 
                        onClick={addFeature}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Feature
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {((formData.landing_page_config as any)?.features || []).map((feature: any, index: number) => (
                        <Card key={index} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-1 space-y-3">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700">Feature Title</Label>
                                  <Input
                                    value={feature.title || ''}
                                    onChange={(e) => updateFeature(index, 'title', e.target.value)}
                                    className="mt-1 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                                    placeholder="Feature title"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                                  <Textarea
                                    value={feature.description || ''}
                                    onChange={(e) => updateFeature(index, 'description', e.target.value)}
                                    className="mt-1 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                                    placeholder="Feature description"
                                    rows={2}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700">Icon</Label>
                                  <Input
                                    value={feature.icon || ''}
                                    onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                                    className="mt-1 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                                    placeholder="Icon name (e.g., Building, Users, TrendingUp)"
                                  />
                                </div>
                              </div>
                              <Button
                                type="button"
                                onClick={() => removeFeature(index)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 hover:border-red-200"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email" className="space-y-6">
              <Card className="border-0 shadow-lg bg-card">
                <CardHeader className="bg-primary/5 border-b border-border">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-yellow-500 rounded-lg">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    Email Template Configuration
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">Customize your email templates and branding</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid gap-6">
                    <div>
                      <Label htmlFor="email_header_bg" className="text-sm font-semibold text-gray-700">Header Background Color</Label>
                      <div className="mt-2 flex items-center gap-3">
                        <Input
                          type="color"
                          id="email_header_bg"
                          value={(formData.email_template_config as any)?.headerBackground || formData.primary_color}
                          onChange={(e) => updateEmailTemplateConfig('headerBackground', e.target.value)}
                          className="w-16 h-11 p-1 border-gray-200"
                        />
                        <Input
                          type="text"
                          value={(formData.email_template_config as any)?.headerBackground || formData.primary_color}
                          onChange={(e) => updateEmailTemplateConfig('headerBackground', e.target.value)}
                          className="flex-1 border-gray-200 h-11"
                          placeholder="#2563eb"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email_footer_text" className="text-sm font-semibold text-gray-700">Footer Text</Label>
                      <Input
                        type="text"
                        id="email_footer_text"
                        value={(formData.email_template_config as any)?.footerText || ''}
                        onChange={(e) => updateEmailTemplateConfig('footerText', e.target.value)}
                        className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 h-11"
                        placeholder="© 2024 Your Company Name"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Show Company Logo</span>
                        <p className="text-xs text-gray-500 mt-1">Display your company logo in email headers</p>
                      </div>
                      <Switch 
                        checked={(formData.email_template_config as any)?.showCompanyLogo || false}
                        onCheckedChange={(checked) => updateEmailTemplateConfig('showCompanyLogo', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Show Contact Information</span>
                        <p className="text-xs text-gray-500 mt-1">Include contact details in email footers</p>
                      </div>
                      <Switch 
                        checked={(formData.email_template_config as any)?.showContactInfo || false}
                        onCheckedChange={(checked) => updateEmailTemplateConfig('showContactInfo', checked)}
                      />
                    </div>
                  </div>

                  {/* Email Preview Section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Email Preview</h3>
                    <div className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div 
                        className="h-16 rounded-t-lg flex items-center px-4"
                        style={{ backgroundColor: (formData.email_template_config as any)?.headerBackground || formData.primary_color }}
                      >
                        {(formData.email_template_config as any)?.showCompanyLogo && formData.company_logo_url && (
                          <img 
                            src={formData.company_logo_url} 
                            alt="Company Logo" 
                            className="h-8 object-contain"
                          />
                        )}
                        <span className="text-white font-semibold ml-3">
                          {formData.company_name || 'Your Company'}
                        </span>
                      </div>
                      <div className="p-6 min-h-[200px] bg-gray-50">
                        <p className="text-gray-600">Email content will appear here...</p>
                      </div>
                      <div className="bg-gray-100 p-4 rounded-b-lg text-center">
                        <p className="text-sm text-gray-600">
                          {(formData.email_template_config as any)?.footerText || '© 2024 Your Company'}
                        </p>
                        {(formData.email_template_config as any)?.showContactInfo && (
                          <div className="mt-2 text-xs text-gray-500">
                            {formData.contact_email && <span>{formData.contact_email}</span>}
                            {formData.contact_phone && formData.contact_email && <span> | </span>}
                            {formData.contact_phone && <span>{formData.contact_phone}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="domains" className="space-y-8">
              <div className="bg-gradient-to-r from-blue-600 to-yellow-500 rounded-2xl p-8 text-white shadow-2xl">
                <h2 className="text-3xl font-bold mb-3">Domain Management</h2>
                <p className="text-blue-100 text-lg">Configure your custom domains and subdomains for white label access</p>
              </div>

              <div className="grid gap-8">
                {/* Subdomain Configuration */}
                <Card className="border-2 border-primary/20 hover:border-primary/30 transition-all duration-200 shadow-lg hover:shadow-xl">
                  <CardHeader className="bg-primary/10 border-b border-primary/20 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                          <Globe className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-blue-900">Custom Subdomain</CardTitle>
                          <CardDescription className="text-blue-700 font-medium">{getSubdomainPlaceholder()}</CardDescription>
                        </div>
                      </div>
                       {formData.custom_subdomain && (
                         <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-blue-200">
                           {getDisplayStatus(getSubdomainStatus(formData.custom_subdomain)).text === 'Active' ? (
                             <>
                               <CheckCircle className="h-4 w-4 text-emerald-500" />
                               <span className="text-sm text-emerald-600 font-semibold">
                                 {getDisplayStatus(getSubdomainStatus(formData.custom_subdomain)).text}
                               </span>
                             </>
                           ) : (
                             <>
                               <AlertCircle className="h-4 w-4 text-amber-500" />
                               <span className="text-sm text-amber-600 font-semibold">
                                 {getDisplayStatus(getSubdomainStatus(formData.custom_subdomain)).text}
                               </span>
                             </>
                           )}
                         </div>
                       )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div>
                      <Label htmlFor="custom_subdomain" className="text-sm font-semibold text-gray-700 mb-2 block">
                        Subdomain Name
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="text"
                          id="custom_subdomain"
                          name="custom_subdomain"
                          value={formData.custom_subdomain}
                          onChange={handleChange}
                          className="flex-1 border-blue-200 focus:border-blue-500 focus:ring-blue-500 h-12"
                          placeholder="yourcompany"
                        />
                        <span className="text-gray-500 font-medium">{getSubdomainSuffix()}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Choose a unique subdomain for your white label portal</p>
                    </div>

                    {formData.custom_subdomain && (
                      <div className="bg-primary/10 border-2 border-primary/20 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-semibold text-blue-800">Your Subdomain URL</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Input
                            value={buildSubdomainUrl(formData.custom_subdomain)}
                            readOnly
                            className="text-sm text-blue-800 bg-white border-blue-300 font-mono"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(buildSubdomainUrl(formData.custom_subdomain))}
                            className="border-blue-300 text-blue-800 hover:bg-blue-100 px-4"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => verifySubdomain({ subdomain: formData.custom_subdomain })}
                             disabled={isVerifying}
                             className="border-blue-300 text-blue-800 hover:bg-blue-100 px-4"
                           >
                             <RefreshCw className={`h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
                           </Button>
                           <Button
                             size="sm"
                             onClick={() => window.open(buildSubdomainUrl(formData.custom_subdomain), '_blank')}
                             className="bg-blue-500 hover:bg-blue-600 text-white px-4"
                           >
                             <ExternalLink className="h-4 w-4" />
                           </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Custom Domain Configuration */}
                <Card className="border-2 border-yellow-100 hover:border-yellow-200 transition-all duration-200 shadow-lg hover:shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl shadow-lg">
                          <Shield className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-yellow-900">Custom Domain</CardTitle>
                          <CardDescription className="text-yellow-700 font-medium">Use your own domain name</CardDescription>
                        </div>
                      </div>
                       {formData.custom_domain && (
                         <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-yellow-200">
                           {getDisplayStatus(getCustomDomainStatus(formData.custom_domain)).text === 'Active' || 
                            getDisplayStatus(getCustomDomainStatus(formData.custom_domain)).text === 'Verified' ? (
                             <>
                               <CheckCircle className="h-4 w-4 text-emerald-500" />
                               <span className="text-sm text-emerald-600 font-semibold">
                                 {getDisplayStatus(getCustomDomainStatus(formData.custom_domain)).text}
                               </span>
                             </>
                           ) : (
                             <>
                               <AlertCircle className="h-4 w-4 text-amber-500" />
                               <span className="text-sm text-amber-600 font-semibold">
                                 {getDisplayStatus(getCustomDomainStatus(formData.custom_domain)).text}
                               </span>
                             </>
                           )}
                         </div>
                       )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div>
                      <Label htmlFor="custom_domain" className="text-sm font-semibold text-gray-700 mb-2 block">
                        Domain Name
                      </Label>
                      <Input
                        type="text"
                        id="custom_domain"
                        name="custom_domain"
                        value={formData.custom_domain}
                        onChange={handleChange}
                        className="border-yellow-200 focus:border-yellow-500 focus:ring-yellow-500 h-12"
                        placeholder="portal.yourcompany.com"
                      />
                      <p className="text-sm text-gray-500 mt-2">Enter your custom domain (requires DNS configuration)</p>
                    </div>

                    {formData.custom_domain && (
                      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm font-semibold text-yellow-800">DNS Configuration Required</span>
                        </div>
                        <div className="space-y-4">
                          <div className="bg-white rounded-lg p-4 border border-yellow-300">
                            <p className="text-sm font-medium text-yellow-800 mb-2">Add this A record to your DNS:</p>
                            <div className="font-mono text-sm text-gray-700 bg-gray-50 p-3 rounded border">
                              <div>Type: A</div>
                              <div>Name: @ (or your subdomain)</div>
                              <div>Value: 185.199.108.153</div>
                              <div>TTL: 300</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Input
                              value={`https://${formData.custom_domain}`}
                              readOnly
                              className="text-sm text-yellow-800 bg-white border-yellow-300 font-mono"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`https://${formData.custom_domain}`)}
                              className="border-yellow-300 text-yellow-800 hover:bg-yellow-100 px-4"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => window.open(`https://${formData.custom_domain}`, '_blank')}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Domain Verification Manager */}
                {config?.id && (
                  <DomainVerificationManager whiteLabelConfigId={config.id} />
                )}

                {/* Domain Status & Actions */}
                <Card className="border-0 shadow-xl bg-card">
                  <CardHeader className="bg-muted border-b border-border">
                    <CardTitle className="text-xl text-foreground flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-yellow-500 rounded-lg">
                        <Settings className="h-5 w-5 text-white" />
                      </div>
                      Domain Management Actions
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">Manage your domain settings and SSL certificates</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Button 
                        variant="outline" 
                        className="h-14 border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                        onClick={() => {
                          if (!formData.custom_domain) {
                            toast({
                              variant: "destructive",
                              title: "Domain Required",
                              description: "Please enter a custom domain first."
                            });
                            return;
                          }
                          if (!config?.domain_verification_token) {
                            toast({
                              variant: "destructive", 
                              title: "Verification Token Missing",
                              description: "Please save domain settings first to generate a verification token."
                            });
                            return;
                          }
                          verifyCustomDomain({
                            domain: formData.custom_domain,
                            verificationToken: config.domain_verification_token
                          });
                        }}
                        disabled={isVerifyingCustomDomain || !formData.custom_domain}
                      >
                        {isVerifyingCustomDomain ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Shield className="h-5 w-5 mr-2" />
                            Verify Domain
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-14 border-2 border-yellow-200 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-300 transition-all duration-200"
                        onClick={() => {
                          if (!formData.custom_domain) {
                            toast({
                              variant: "destructive",
                              title: "Domain Required", 
                              description: "Please enter a custom domain first."
                            });
                            return;
                          }
                          testConfiguration({
                            domain: formData.custom_domain
                          });
                        }}
                        disabled={isTestingConfiguration || !formData.custom_domain}
                      >
                        {isTestingConfiguration ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-700 mr-2"></div>
                            Testing...
                          </>
                        ) : (
                          <>
                            <Globe className="h-5 w-5 mr-2" />
                            Test Configuration
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={() => save(formData)}
                        disabled={isSaving}
                        className="h-14 bg-gradient-to-r from-blue-600 to-yellow-500 hover:from-blue-700 hover:to-yellow-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-5 w-5 mr-2" />
                            Save Domain Settings
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <WhiteLabelAnalytics 
                configId={config?.id} 
                timeRange="30d" 
              />
            </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <WhiteLabelIntegrationTester />
          <WhiteLabelSecurityValidator />
          <WhiteLabelTesting />
        </TabsContent>

            <TabsContent value="system" className="space-y-6">
              <WhiteLabelRefinements />
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="mb-4">
              <Label className="text-sm font-semibold">Preview Mode</Label>
              <div className="mt-2 flex gap-2">
                <Button
                  variant={previewType === 'landing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewType('landing')}
                >
                  Landing
                </Button>
                <Button
                  variant={previewType === 'email' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewType('email')}
                >
                  Email
                </Button>
                <Button
                  variant={previewType === 'portal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewType('portal')}
                >
                  Portal
                </Button>
              </div>
            </div>
            <WhiteLabelPreview 
              config={formData}
              previewType={previewType}
              deviceMode={deviceMode}
              onDeviceModeChange={setDeviceMode}
            />
          </div>
        </div>
      </div>
      </div>
    </ErrorBoundaryWhiteLabel>
  );
};

export default WhiteLabelSettings;
