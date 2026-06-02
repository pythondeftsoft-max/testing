import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, Search, Users, Star, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useMarketplaceEvents } from '@/hooks/useMarketplaceEvents';

const MarketplaceInfo: React.FC = () => {
  const navigate = useNavigate();
  const { setHousingInterest } = usePreferences();
  const { mutate: logEvent } = useMarketplaceEvents();

  const handleGetStarted = () => {
    logEvent({ eventType: 'cta_clicked', metadata: { source: 'info_page' } });
    setHousingInterest(true);
    navigate('/marketplace');
  };

  const features = [
    {
      icon: <Search className="w-5 h-5" />,
      title: "Smart Property Search",
      description: "Find housing that matches your voucher requirements and preferences"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Verified Landlords",
      description: "All property owners are pre-screened and voucher-friendly"
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Application Support",
      description: "Get help with applications and paperwork throughout the process"
    },
    {
      icon: <Star className="w-5 h-5" />,
      title: "Quality Properties",
      description: "Browse curated listings that meet housing quality standards"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Housing Marketplace
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Find Your Perfect Home
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Access verified, voucher-friendly rental properties with dedicated support 
            throughout your housing search journey.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="border-primary/10">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How It Works */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl text-center">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2">Browse & Search</h3>
                <p className="text-sm text-muted-foreground">
                  Explore verified properties that accept housing vouchers
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2">Apply with Confidence</h3>
                <p className="text-sm text-muted-foreground">
                  Submit applications knowing landlords welcome voucher holders
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2">Move In Successfully</h3>
                <p className="text-sm text-muted-foreground">
                  Get support through inspections and lease signing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Why Choose Our Marketplace?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                "No more rejections due to voucher status",
                "Pre-screened landlords who welcome voucher holders",
                "Properties that meet housing quality standards",
                "Dedicated support throughout your search",
                "Transparent application process"
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-primary text-primary-foreground text-center">
          <CardContent className="pt-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Find Your Home?</h2>
            <p className="mb-6 opacity-90">
              Join thousands of successful tenants who found their perfect rental through our marketplace.
            </p>
            <Button 
              onClick={handleGetStarted}
              size="lg" 
              variant="secondary"
              className="bg-background text-foreground hover:bg-background/90"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketplaceInfo;