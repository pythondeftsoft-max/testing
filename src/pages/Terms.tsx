
import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle, Scale, Shield, Users, CreditCard, MessageSquare } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
          <p className="text-xl text-muted-foreground">
            Terms and conditions for using OpenKey
          </p>
          <p className="text-sm text-muted-foreground mt-2">Last updated: January 2024</p>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Agreement to Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Welcome to OpenKey. These Terms of Service ("Terms") govern your use of our platform and services. 
                By accessing or using OpenKey, you agree to be bound by these Terms.
              </p>
              <p className="text-muted-foreground">
                If you disagree with any part of these terms, then you may not access or use our service.
              </p>
            </CardContent>
          </Card>

          {/* Service Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-emerald-600" />
                Our Service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">OpenKey provides:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">For Tenants:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Housing search platform</li>
                    <li>• Property browsing and filtering</li>
                    <li>• Direct communication with landlords</li>
                    <li>• Application tracking and management</li>
                    <li>• Section 8 housing assistance</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">For Landlords:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Property listing services</li>
                    <li>• Tenant screening tools</li>
                    <li>• Application management</li>
                    <li>• Portfolio management features</li>
                    <li>• Communication platform</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-600" />
                User Accounts and Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Account Creation</h3>
                  <ul className="space-y-2 text-muted-foreground ml-4">
                    <li>• You must provide accurate, current, and complete information</li>
                    <li>• You are responsible for maintaining account security</li>
                    <li>• You must be at least 18 years old to create an account</li>
                    <li>• One person may not maintain multiple accounts</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">User Conduct</h3>
                  <p className="text-muted-foreground mb-2">You agree not to:</p>
                  <ul className="space-y-2 text-muted-foreground ml-4">
                    <li>• Provide false or misleading information</li>
                    <li>• Violate any applicable laws or regulations</li>
                    <li>• Harass, abuse, or harm other users</li>
                    <li>• Spam or send unsolicited communications</li>
                    <li>• Attempt to gain unauthorized access to our systems</li>
                    <li>• Use the platform for illegal activities</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Listings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-6 h-6 text-orange-600" />
                Property Listings and Applications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">For Landlords</h3>
                  <ul className="space-y-2 text-muted-foreground ml-4">
                    <li>• Property information must be accurate and up-to-date</li>
                    <li>• You must comply with fair housing laws</li>
                    <li>• You are responsible for property condition and legal compliance</li>
                    <li>• You must respond to tenant inquiries in good faith</li>
                    <li>• Listing fees are non-refundable once services are provided</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">For Tenants</h3>
                  <ul className="space-y-2 text-muted-foreground ml-4">
                    <li>• Application information must be truthful and complete</li>
                    <li>• You are responsible for verifying property details</li>
                    <li>• Priority placement fees are non-refundable</li>
                    <li>• You must follow property viewing guidelines</li>
                    <li>• Respect landlord communication preferences</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments and Fees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-destructive" />
                Payments and Fees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <h4 className="font-medium text-primary mb-2">Tenant Services</h4>
                  <ul className="text-primary/80 text-sm space-y-1">
                    <li>• Basic platform access: Free</li>
                    <li>• Priority placement: $15 (non-refundable)</li>
                    <li>• OpenKey Plus subscription: Monthly fee applies</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <h4 className="font-medium text-emerald-600 mb-2">Landlord Services</h4>
                  <ul className="text-emerald-600/80 text-sm space-y-1">
                    <li>• Basic property listings: Free tier available</li>
                    <li>• Premium listing features: Fees apply</li>
                    <li>• Portfolio management tools: Subscription-based</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <h4 className="font-medium text-warning mb-2">Payment Terms</h4>
                  <ul className="text-warning/80 text-sm space-y-1">
                    <li>• All fees are charged in US Dollars</li>
                    <li>• Payments are processed securely through our payment partners</li>
                    <li>• Refunds are subject to our refund policy</li>
                    <li>• Late payments may result in service suspension</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMS Communications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-primary" />
                SMS Communications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">By creating an account and opting in, you agree to the following SMS terms:</p>
              <ul className="space-y-2 text-muted-foreground ml-4">
                <li>• You consent to receive text messages from OpenKey regarding your housing search, account updates, and property alerts</li>
                <li>• Standard messaging rates from your carrier may apply</li>
                <li>• Message frequency varies based on your housing search activity</li>
                <li>• You can opt out at any time by replying <strong>STOP</strong> to any message</li>
                <li>• Reply <strong>HELP</strong> for support or contact support@openkey.com</li>
                <li>• OpenKey is not responsible for messages delayed or not delivered by carriers</li>
              </ul>
            </CardContent>
          </Card>

          {/* Disclaimers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-warning" />
                Disclaimers and Limitations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <h4 className="font-medium text-destructive mb-2">Platform Role</h4>
                  <p className="text-destructive/80 text-sm">
                    OpenKey is a platform that facilitates connections between tenants and landlords. We do not:
                  </p>
                  <ul className="text-destructive/80 text-sm mt-2 space-y-1">
                    <li>• Act as a landlord or tenant</li>
                    <li>• Guarantee housing availability or approval</li>
                    <li>• Conduct background checks or verifications</li>
                    <li>• Mediate disputes between parties</li>
                  </ul>
                </div>
                
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <h4 className="font-medium text-warning mb-2">User Responsibility</h4>
                  <p className="text-warning/80 text-sm">
                    Users are responsible for:
                  </p>
                  <ul className="text-warning/80 text-sm mt-2 space-y-1">
                    <li>• Verifying information and conducting due diligence</li>
                    <li>• Complying with all applicable laws</li>
                    <li>• Their own interactions and transactions</li>
                    <li>• Any losses or damages resulting from platform use</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardHeader>
              <CardTitle>Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We may terminate or suspend your account at any time for violations of these Terms or for any other reason. 
                You may also terminate your account at any time.
              </p>
              <p className="text-muted-foreground">
                Upon termination, your right to use the service will cease immediately, but certain provisions of these Terms will survive.
              </p>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms at any time. We will notify users of any material changes 
                by email or through the platform. Your continued use of the service after changes take effect constitutes 
                acceptance of the new Terms.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Terms;
