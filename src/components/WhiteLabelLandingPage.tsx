import React from 'react';
import { useTheme } from './DynamicThemeProvider';
import WhiteLabelBranding from './WhiteLabelBranding';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

const WhiteLabelLandingPage = () => {
  const { isWhiteLabeled, whiteLabelConfig } = useTheme();

  if (!isWhiteLabeled || !whiteLabelConfig?.landing_page_config) {
    return null; // Return null if no white label landing page is configured
  }

  const landingConfig = whiteLabelConfig.landing_page_config;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        className="relative py-20 px-4 text-center"
        style={{
          backgroundColor: landingConfig.hero_background_color 
            ? `hsl(var(--hero-bg, ${landingConfig.hero_background_color}))` 
            : undefined
        }}
      >
        <div className="max-w-4xl mx-auto">
          <WhiteLabelBranding className="mb-8 justify-center text-2xl" />
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {landingConfig.hero_title || `Welcome to ${whiteLabelConfig.company_name}`}
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 text-muted-foreground max-w-2xl mx-auto">
            {landingConfig.hero_subtitle || 'Professional Property Management Solutions'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-3"
              style={{
                backgroundColor: landingConfig.cta_button_color 
                  ? `hsl(var(--cta-button, ${landingConfig.cta_button_color}))` 
                  : undefined
              }}
            >
              {landingConfig.cta_button_text || 'Get Started'}
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      {landingConfig.features && landingConfig.features.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              {landingConfig.features_title || 'Our Services'}
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {landingConfig.features.map((feature: any, index: number) => (
                <Card key={index} className="text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-xl">
                        {feature.icon || '●'}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="py-16 px-4 bg-secondary/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            {landingConfig.contact_title || 'Get In Touch'}
          </h2>
          
          <p className="text-xl mb-8 text-muted-foreground">
            {landingConfig.contact_subtitle || 'Ready to streamline your property management?'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            {whiteLabelConfig.contact_email && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Email:</span>
                <a 
                  href={`mailto:${whiteLabelConfig.contact_email}`}
                  className="text-primary hover:underline"
                >
                  {whiteLabelConfig.contact_email}
                </a>
              </div>
            )}
            
            {whiteLabelConfig.contact_phone && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Phone:</span>
                <a 
                  href={`tel:${whiteLabelConfig.contact_phone}`}
                  className="text-primary hover:underline"
                >
                  {whiteLabelConfig.contact_phone}
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default WhiteLabelLandingPage;