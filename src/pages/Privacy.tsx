
import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Eye, Lock, UserCheck, Database, Mail, MessageSquare } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-xl text-muted-foreground">
            How we collect, use, and protect your information
          </p>
          <p className="text-sm text-muted-foreground mt-2">Last updated: January 2024</p>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                Our Commitment to Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                At OpenKey, we are committed to protecting your privacy and maintaining the confidentiality of your personal information. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
              </p>
              <p className="text-muted-foreground">
                By using OpenKey, you agree to the collection and use of information in accordance with this policy.
              </p>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-6 h-6 text-emerald-600" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Personal Information</h3>
                  <ul className="space-y-2 text-muted-foreground ml-4">
                    <li>• Name, email address, and phone number</li>
                    <li>• Housing preferences and requirements</li>
                    <li>• Section 8 voucher information (if applicable)</li>
                    <li>• Financial information for housing qualification</li>
                    <li>• Property details for landlords</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">Usage Information</h3>
                  <ul className="space-y-2 text-muted-foreground ml-4">
                    <li>• Pages visited and time spent on our platform</li>
                    <li>• Search queries and property views</li>
                    <li>• Messages sent through our platform</li>
                    <li>• Device information and IP address</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">Communications</h3>
                  <ul className="space-y-2 text-muted-foreground ml-4">
                    <li>• Messages between tenants and landlords</li>
                    <li>• Support inquiries and correspondence</li>
                    <li>• Feedback and survey responses</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-6 h-6 text-purple-600" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">We use the information we collect to:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Platform Services</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Match tenants with suitable properties</li>
                    <li>• Facilitate communication between parties</li>
                    <li>• Process applications and requests</li>
                    <li>• Provide customer support</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Improvements & Analytics</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Improve our platform and services</li>
                    <li>• Analyze usage patterns and trends</li>
                    <li>• Send relevant updates and notifications</li>
                    <li>• Prevent fraud and ensure security</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-orange-600" />
                Information Sharing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">We may share your information in the following situations:</p>
              <div className="space-y-4">
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <h4 className="font-medium text-primary mb-2">With Other Users</h4>
                  <p className="text-primary/80 text-sm">
                    Tenant profiles are visible to landlords, and property listings are visible to tenants. 
                    We only share information necessary for the housing matching process.
                  </p>
                </div>
                
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <h4 className="font-medium text-emerald-600 mb-2">Service Providers</h4>
                  <p className="text-emerald-600/80 text-sm">
                    We work with trusted third-party services for payment processing, email delivery, 
                    and analytics. These providers are bound by confidentiality agreements.
                  </p>
                </div>
                
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <h4 className="font-medium text-destructive mb-2">Legal Requirements</h4>
                  <p className="text-destructive/80 text-sm">
                    We may disclose information if required by law, legal process, or to protect 
                    the rights, property, or safety of OpenKey, our users, or others.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-6 h-6 text-destructive" />
                Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">We implement industry-standard security measures to protect your information:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="space-y-2 text-muted-foreground">
                  <li>• SSL encryption for data transmission</li>
                  <li>• Secure database storage</li>
                  <li>• Regular security audits and updates</li>
                  <li>• Access controls and authentication</li>
                </ul>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Employee training on data protection</li>
                  <li>• Incident response procedures</li>
                  <li>• Regular data backups</li>
                  <li>• Compliance with privacy regulations</li>
                </ul>
              </div>
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mt-4">
                <p className="text-warning text-sm">
                  <strong>Note:</strong> While we use reasonable efforts to protect your information, 
                  no security system is impenetrable. Please use strong passwords and keep your account credentials secure.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SMS/Text Messaging */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-primary" />
                SMS/Text Messaging
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">What We Send</h3>
                  <p className="text-muted-foreground text-sm">
                    We may send you SMS messages including property matches, housing updates, application status notifications, and account alerts.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Consent</h3>
                  <p className="text-muted-foreground text-sm">
                    By opting in during signup, you consent to receive text messages from OpenKey. Message frequency varies. Message and data rates may apply.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Opt-Out</h3>
                  <p className="text-muted-foreground text-sm">
                    You can opt out at any time by replying <strong>STOP</strong> to any message. Reply <strong>HELP</strong> for assistance or contact support@openkey.com.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Carriers</h3>
                  <p className="text-muted-foreground text-sm">
                    Supported carriers include AT&T, T-Mobile, Verizon, and others. Carriers are not liable for delayed or undelivered messages.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Data Handling</h3>
                  <p className="text-muted-foreground text-sm">
                    Phone numbers and SMS consent status are stored securely and never shared with third parties for marketing purposes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-indigo-600" />
                Your Rights and Choices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">You have the following rights regarding your personal information:</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium">Access & Portability</h4>
                      <p className="text-sm text-muted-foreground">Request a copy of your personal data</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium">Correction</h4>
                      <p className="text-sm text-muted-foreground">Update or correct your information</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium">Deletion</h4>
                      <p className="text-sm text-muted-foreground">Request deletion of your account and data</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium">Communication Preferences</h4>
                      <p className="text-sm text-muted-foreground">Control email notifications and updates</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium">Restriction</h4>
                      <p className="text-sm text-muted-foreground">Limit how we process your information</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium">Objection</h4>
                      <p className="text-sm text-muted-foreground">Object to certain uses of your data</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Updates */}
          <Card className="bg-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Policy Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-primary/80">
                We may update this Privacy Policy from time to time. When we make changes, we will notify you 
                by email and update the "Last updated" date at the top of this policy. We encourage you to 
                review this policy periodically to stay informed about how we protect your information.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Privacy;
