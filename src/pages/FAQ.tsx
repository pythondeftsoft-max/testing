
import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Users, Home, DollarSign, MessageSquare } from 'lucide-react';

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-muted-foreground">
            Get answers to common questions about OpenKey and Section 8 housing
          </p>
        </div>

        <div className="space-y-8">
          {/* General Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-primary" />
                General Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="what-is-openkey">
                  <AccordionTrigger>What is OpenKey?</AccordionTrigger>
                  <AccordionContent>
                    OpenKey is a platform that connects Section 8 voucher holders with quality housing while helping 
                    landlords and investors build successful rental portfolios. We streamline the housing search process 
                    and make it easier for both tenants and landlords to find each other.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="how-does-it-work">
                  <AccordionTrigger>How does OpenKey work?</AccordionTrigger>
                  <AccordionContent>
                    OpenKey works by allowing tenants to create profiles and browse available properties, while landlords 
                    can list their Section 8-friendly properties. Our platform facilitates direct communication between 
                    tenants and landlords, making the housing search process more efficient and transparent.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="is-it-free">
                  <AccordionTrigger>Is OpenKey free to use?</AccordionTrigger>
                  <AccordionContent>
                    Basic registration and property browsing is free for tenants. We offer optional priority placement 
                    services for $15 to help tenants get noticed faster. For landlords, we offer various listing packages 
                    to meet different needs and budgets.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* For Tenants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-emerald-600" />
                For Tenants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="need-voucher">
                  <AccordionTrigger>Do I need a Section 8 voucher to use OpenKey?</AccordionTrigger>
                  <AccordionContent>
                    While having a Section 8 voucher is helpful, you don't need one to get started. You can create a profile 
                    and start looking for housing even if you're still waiting for your voucher. This helps you get familiar 
                    with available options in your area.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="application-process">
                  <AccordionTrigger>How long does the application process take?</AccordionTrigger>
                  <AccordionContent>
                    Creating your OpenKey profile takes just a few minutes. Once you apply to specific properties, response 
                    times vary by landlord, but most respond within 24-48 hours. The overall timeline depends on factors 
                    like Section 8 inspection scheduling and lease negotiations.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="priority-placement">
                  <AccordionTrigger>What is Priority Placement?</AccordionTrigger>
                  <AccordionContent>
                    Priority Placement is a $15 service that puts your application at the top of landlords' lists. 
                    This increases your visibility and response rates, helping you secure housing faster in competitive markets.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="messaging-limits">
                  <AccordionTrigger>Are there limits on messaging landlords?</AccordionTrigger>
                  <AccordionContent>
                    Free users can send up to 2 initial messages per property. Once a landlord responds, the conversation 
                    becomes unlimited. OpenKey Plus subscribers get unlimited messaging from the start.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* For Landlords */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-6 h-6 text-purple-600" />
                For Landlords
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="listing-cost">
                  <AccordionTrigger>How much does it cost to list my property?</AccordionTrigger>
                  <AccordionContent>
                    We offer flexible listing packages starting from basic free listings to premium featured placements. 
                    Contact our team for detailed pricing information tailored to your portfolio size and needs.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="tenant-screening">
                  <AccordionTrigger>How are tenants screened on OpenKey?</AccordionTrigger>
                  <AccordionContent>
                    While OpenKey facilitates connections, final tenant screening remains your responsibility as the landlord. 
                    We provide tenant profiles with relevant information, but you should conduct your own background checks, 
                    credit checks, and reference verifications according to your standards.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="section8-requirements">
                  <AccordionTrigger>What are the requirements for accepting Section 8?</AccordionTrigger>
                  <AccordionContent>
                    Properties must pass Housing Quality Standards (HQS) inspections, meet local housing codes, and comply 
                    with fair housing laws. Rent must be reasonable compared to similar properties in the area. We can help 
                    guide you through the process and requirements.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="payment-guarantee">
                  <AccordionTrigger>How reliable are Section 8 payments?</AccordionTrigger>
                  <AccordionContent>
                    Section 8 payments are very reliable as they come directly from the local housing authority. Typically, 
                    the housing authority pays 70-80% of the rent directly to you, while the tenant pays the remaining portion. 
                    This provides excellent payment security for landlords.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Technical Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-orange-600" />
                Technical Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="account-issues">
                  <AccordionTrigger>I'm having trouble with my account</AccordionTrigger>
                  <AccordionContent>
                    For account-related issues, please contact our support team at info@openkey.com or call (555) 123-4567. 
                    We typically respond to support requests within 24 hours during business days.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="browser-issues">
                  <AccordionTrigger>The website isn't working properly</AccordionTrigger>
                  <AccordionContent>
                    Try clearing your browser cache and cookies, or try using a different browser. Make sure JavaScript is 
                    enabled. If problems persist, contact our technical support team with details about your browser and 
                    the specific issue you're experiencing.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="mobile-app">
                  <AccordionTrigger>Do you have a mobile app?</AccordionTrigger>
                  <AccordionContent>
                    Currently, OpenKey is a web-based platform optimized for both desktop and mobile browsers. 
                    A dedicated mobile app is in development and will be available in the future.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Still Have Questions */}
          <Card className="bg-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Still Have Questions?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-primary/80 mb-4">
                Can't find the answer you're looking for? Our support team is here to help!
              </p>
              <div className="space-y-2 text-primary/80">
                <p><strong>Email:</strong> support@openkeyhousing.com</p>
                <p><strong>Hours:</strong> 24/7</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FAQ;
