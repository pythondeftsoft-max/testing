
import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Calculator, Phone, Globe, BookOpen, Users, Building } from 'lucide-react';

const Resources = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Resources & Tools</h1>
          <p className="text-xl text-muted-foreground">
            Essential resources for landlords and property investors
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Section 8 Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Section 8 Program Resources
              </CardTitle>
              <CardDescription>
                Official resources and documentation for the Housing Choice Voucher Program
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">HUD Official Website</h4>
                    <p className="text-sm text-muted-foreground">Department of Housing and Urban Development</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Housing Quality Standards</h4>
                    <p className="text-sm text-muted-foreground">Inspection requirements and guidelines</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Fair Market Rent Data</h4>
                    <p className="text-sm text-muted-foreground">Current FMR rates by area</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Find Your Local PHA</h4>
                    <p className="text-sm text-muted-foreground">Directory of Public Housing Authorities</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Landlord Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-6 h-6 text-emerald-600" />
                Landlord Tools & Calculators
              </CardTitle>
              <CardDescription>
                Financial calculators and management tools for property owners
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Rental Yield Calculator</h4>
                    <p className="text-sm text-muted-foreground">Calculate your property's return on investment</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Calculator className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Cash Flow Analyzer</h4>
                    <p className="text-sm text-muted-foreground">Analyze monthly cash flow potential</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Calculator className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Expense Tracker</h4>
                    <p className="text-sm text-muted-foreground">Track maintenance and operating costs</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Lease Agreement Templates</h4>
                    <p className="text-sm text-muted-foreground">State-compliant lease templates</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal & Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-purple-600" />
                Legal & Compliance
              </CardTitle>
              <CardDescription>
                Stay compliant with housing laws and regulations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Fair Housing Laws</h4>
                    <p className="text-sm text-muted-foreground">Understanding your obligations as a landlord</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">State Housing Codes</h4>
                    <p className="text-sm text-muted-foreground">Local and state housing requirements</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Eviction Process Guide</h4>
                    <p className="text-sm text-muted-foreground">Legal procedures and requirements</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Property Insurance Guide</h4>
                    <p className="text-sm text-muted-foreground">Understanding coverage options</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Investment Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-6 h-6 text-orange-600" />
                Investment Resources
              </CardTitle>
              <CardDescription>
                Resources for property investors and portfolio builders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Market Analysis Reports</h4>
                    <p className="text-sm text-muted-foreground">Local market trends and data</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Property Valuation Tools</h4>
                    <p className="text-sm text-muted-foreground">Estimate property values and potential</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Calculator className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Financing Options Guide</h4>
                    <p className="text-sm text-muted-foreground">Investment property loan programs</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Tax Deduction Checklist</h4>
                    <p className="text-sm text-muted-foreground">Maximize your rental property deductions</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support Section */}
        <Card className="mt-8 bg-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Phone className="w-6 h-6" />
              Need Additional Support?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-primary mb-2">OpenKey Support</h3>
                <div className="space-y-1 text-primary/80">
                  <p><strong>Email:</strong> support@openkeyhousing.com</p>
                  <p><strong>Hours:</strong> 24/7</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-primary mb-2">Educational Webinars</h3>
                <p className="text-primary/80 mb-2">
                  Join our monthly webinars covering topics like:
                </p>
                <ul className="text-sm text-primary/70 space-y-1">
                  <li>• Section 8 best practices for landlords</li>
                  <li>• Property investment strategies</li>
                  <li>• Market trends and analysis</li>
                  <li>• Legal compliance updates</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default Resources;
