
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const InvestorSignup = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    investmentType: '',
    budget: '',
    preferredAreas: '',
    experience: '',
    smsConsent: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.smsConsent) {
      toast({
        title: "SMS Consent Required",
        description: "Please agree to receive text updates to continue.",
        variant: "destructive",
      });
      return;
    }
    console.log('Investor form submitted:', formData);
    toast({
      title: "Welcome to Our Investor Network!",
      description: "You'll receive wholesale deal notifications within 24 hours.",
    });
    setFormData({
      name: '',
      email: '',
      phone: '',
      investmentType: '',
      budget: '',
      preferredAreas: '',
      experience: '',
      smsConsent: false
    });
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Real Estate Investors
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join our investor network to receive wholesale deals and properties with 
              pre-screened tenants already in place. Turn-key investment opportunities.
            </p>
          </div>

          <Card className="shadow-lg">
            <CardHeader className="bg-foreground text-background">
              <CardTitle className="text-2xl text-center">Join Our Buyer's List</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Full Name *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Your full name"
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number *
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      type="tel"
                      required
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email *
                  </label>
                  <Input
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="your.email@example.com"
                    type="email"
                    required
                    className="w-full"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Investment Budget
                    </label>
                    <Input
                      value={formData.budget}
                      onChange={(e) => handleChange('budget', e.target.value)}
                      placeholder="$50,000 - $150,000"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Preferred Areas
                    </label>
                    <Input
                      value={formData.preferredAreas}
                      onChange={(e) => handleChange('preferredAreas', e.target.value)}
                      placeholder="Cities or neighborhoods"
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Investment Experience
                  </label>
                  <Textarea
                    value={formData.experience}
                    onChange={(e) => handleChange('experience', e.target.value)}
                    placeholder="Tell us about your investment experience and what you're looking for..."
                    rows={4}
                    className="w-full"
                  />
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="smsConsent"
                    checked={formData.smsConsent}
                    onCheckedChange={(checked) => handleChange('smsConsent', !!checked)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="smsConsent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    <span className="text-destructive">*</span> I agree to receive text updates from OpenKey about my housing search. Message frequency varies. Reply STOP to opt out.
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-foreground hover:bg-foreground/90 text-background py-3 text-lg rounded-lg transition-all duration-300"
                >
                  Join Investor Network
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default InvestorSignup;
