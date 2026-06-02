import React from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WhiteLabelConfig } from '@/hooks/useWhiteLabel';

interface WhiteLabelPreviewProps {
  config: Partial<WhiteLabelConfig>;
  previewType: 'landing' | 'email' | 'portal';
  deviceMode: 'desktop' | 'mobile';
  onDeviceModeChange: (mode: 'desktop' | 'mobile') => void;
}

const WhiteLabelPreview = ({ 
  config, 
  previewType, 
  deviceMode, 
  onDeviceModeChange 
}: WhiteLabelPreviewProps) => {
  const getPreviewStyles = () => ({
    '--primary': config.primary_color || '#2563eb',
    '--secondary': config.secondary_color || '#1e40af', 
    '--accent': config.accent_color || '#3b82f6',
  } as React.CSSProperties);

  const landingPageConfig = config.landing_page_config || {
    hero_title: 'Welcome to Your Portal',
    hero_subtitle: 'Manage your properties with ease',
    cta_text: 'Get Started',
    features: [
      { title: 'Property Management', description: 'Easily manage all your properties' },
      { title: 'Tenant Portal', description: 'Streamlined tenant experience' },
      { title: 'Analytics', description: 'Comprehensive reporting tools' }
    ]
  };

  const renderLandingPreview = () => (
    <div 
      className="min-h-full bg-gradient-to-br from-blue-50 to-indigo-100"
      style={getPreviewStyles()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          {config.company_logo_url ? (
            <img 
              src={config.company_logo_url} 
              alt="Logo" 
              className="h-8 w-auto object-contain"
            />
          ) : (
            <div className="w-8 h-8 bg-primary rounded"></div>
          )}
          <span className="font-semibold text-gray-900">
            {config.company_name || 'Your Company'}
          </span>
        </div>
        <Button 
          size="sm" 
          style={{ backgroundColor: 'var(--primary)', color: 'white' }}
        >
          Sign In
        </Button>
      </div>

      {/* Hero Section */}
      <div className="text-center py-16 px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {landingPageConfig.hero_title}
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          {landingPageConfig.hero_subtitle}
        </p>
        <Button 
          size="lg"
          style={{ backgroundColor: 'var(--primary)', color: 'white' }}
        >
          {landingPageConfig.cta_text}
        </Button>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 pb-16">
        {landingPageConfig.features?.map((feature: any, index: number) => (
          <Card key={index} className="text-center">
            <CardContent className="p-6">
              <div 
                className="w-12 h-12 rounded-full mx-auto mb-4"
                style={{ backgroundColor: 'var(--accent)' }}
              ></div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderEmailPreview = () => {
    const emailConfig = config.email_template_config || {
      header_bg: config.primary_color || '#2563eb',
      footer_text: config.footer_text || '© 2024 Your Company'
    };

    return (
      <div className="bg-gray-100 p-4">
        <div className="max-w-lg mx-auto bg-white shadow-lg">
          {/* Email Header */}
          <div 
            className="p-6 text-white text-center"
            style={{ backgroundColor: emailConfig.header_bg }}
          >
            {config.company_logo_url ? (
              <img 
                src={config.company_logo_url} 
                alt="Logo" 
                className="h-12 mx-auto mb-2 brightness-0 invert"
              />
            ) : (
              <div className="w-12 h-12 bg-white/20 rounded mx-auto mb-2"></div>
            )}
            <h2 className="text-xl font-semibold">
              {config.company_name || 'Your Company'}
            </h2>
          </div>

          {/* Email Body */}
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Welcome!</h3>
            <p className="text-gray-700 mb-4">
              Thank you for joining our platform. We're excited to have you on board.
            </p>
            <Button 
              className="w-full"
              style={{ backgroundColor: config.primary_color || '#2563eb', color: 'white' }}
            >
              Get Started
            </Button>
          </div>

          {/* Email Footer */}
          <div className="p-4 bg-gray-50 text-center text-sm text-gray-600">
            {emailConfig.footer_text}
            {config.contact_email && (
              <p className="mt-1">Contact: {config.contact_email}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPortalPreview = () => (
    <div className="min-h-full bg-gray-50" style={getPreviewStyles()}>
      {/* Portal Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {config.company_logo_url ? (
              <img 
                src={config.company_logo_url} 
                alt="Logo" 
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div className="w-8 h-8 bg-primary rounded"></div>
            )}
            <span className="font-semibold">
              {config.company_name || 'Your Company'} Portal
            </span>
          </div>
          <Badge variant="secondary">Tenant</Badge>
        </div>
      </div>

      {/* Portal Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Property Details</h3>
              <p className="text-gray-600 text-sm">View your current lease information</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Pay Rent</h3>
              <p className="text-gray-600 text-sm">Make secure online payments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Maintenance</h3>
              <p className="text-gray-600 text-sm">Submit service requests</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => {
    switch (previewType) {
      case 'landing': return renderLandingPreview();
      case 'email': return renderEmailPreview();
      case 'portal': return renderPortalPreview();
      default: return renderLandingPreview();
    }
  };

  return (
    <Card className="h-full">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Live Preview</h3>
          <div className="flex items-center gap-2">
            <Button
              variant={deviceMode === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onDeviceModeChange('desktop')}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant={deviceMode === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onDeviceModeChange('mobile')}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4 h-full overflow-auto">
        <div 
          className={`mx-auto border rounded-lg overflow-hidden ${
            deviceMode === 'mobile' 
              ? 'max-w-sm h-96' 
              : 'w-full h-80'
          }`}
        >
          {renderPreview()}
        </div>
      </div>
    </Card>
  );
};

export default WhiteLabelPreview;