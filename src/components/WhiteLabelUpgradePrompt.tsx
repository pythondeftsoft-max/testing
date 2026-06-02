import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Globe, 
  Sparkles, 
  Shield, 
  Zap,
  CheckCircle,
  Crown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const WhiteLabelUpgradePrompt = () => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { 
          role: 'landlord',
          planType: 'white_label'
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate checkout",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Palette className="h-5 w-5" />,
      title: "Custom Branding",
      description: "Your logo, colors, and fonts throughout the platform"
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: "Custom Domain",
      description: "Use your own domain name (e.g., properties.yourcompany.com)"
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Theme Customization",
      description: "Complete control over colors, layouts, and styling"
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Email Branding",
      description: "Branded email templates for all system notifications"
    },
    {
      icon: <Palette className="h-5 w-5" />,
      title: "Custom Landing Page",
      description: "Create a branded landing page for your tenants"
    },
    {
      icon: <Crown className="h-5 w-5" />,
      title: "Remove OpenKey Branding",
      description: "Complete white-label experience with no OpenKey mentions"
    }
  ];

  return (
    <div className="min-h-[600px] flex items-center justify-center p-6">
      <Card className="max-w-4xl w-full border-primary/20 shadow-xl">
        <CardHeader className="text-center space-y-2 pb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
              <Palette className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Unlock White-Label Features
          </CardTitle>
          <CardDescription className="text-lg">
            Transform this platform into your own branded experience
          </CardDescription>
          <Badge variant="secondary" className="mt-4 text-base px-4 py-2">
            <Crown className="h-4 w-4 mr-2" />
            Premium Feature
          </Badge>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-shrink-0 p-2 rounded-md bg-primary/10 text-primary h-fit">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    {feature.title}
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="border-t pt-6">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 text-center">
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Add to any plan • Billed monthly • Cancel anytime
              </p>
              
              <Button 
                size="lg" 
                className="w-full max-w-md text-lg h-12"
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Subscribe to White Label
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Need a custom plan? <Button variant="link" className="p-0 h-auto">Contact our sales team</Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhiteLabelUpgradePrompt;
