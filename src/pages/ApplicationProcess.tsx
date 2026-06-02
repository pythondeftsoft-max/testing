
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FooterPageLayout } from '@/components/layouts/FooterPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, FileCheck, Home, MessageSquare, CheckCircle } from 'lucide-react';

const ApplicationProcess = () => {
  const navigate = useNavigate();

  return (
    <FooterPageLayout title="Housing Application Process">
      <div className="text-center mb-12">
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Step-by-step guide to finding housing through OpenKey
        </p>
      </div>

        <div className="space-y-8">
          {/* Process Overview */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">Quick Overview</CardTitle>
              <CardDescription className="text-blue-600">
                Our streamlined process connects Section 8 voucher holders with quality housing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4 text-center">
                <div className="space-y-2">
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                    <span className="font-bold">1</span>
                  </div>
                  <p className="font-medium">Apply</p>
                </div>
                <div className="space-y-2">
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                    <span className="font-bold">2</span>
                  </div>
                  <p className="font-medium">Browse</p>
                </div>
                <div className="space-y-2">
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                    <span className="font-bold">3</span>
                  </div>
                  <p className="font-medium">Connect</p>
                </div>
                <div className="space-y-2">
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                    <span className="font-bold">4</span>
                  </div>
                  <p className="font-medium">Move In</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Steps */}
          <div className="space-y-6">
            {/* Step 1 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center">
                    <span className="font-bold">1</span>
                  </div>
                  Submit Your Application
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <FileCheck className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">What You'll Need:</h3>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Basic contact information</li>
                      <li>• Section 8 voucher details (if you have one)</li>
                      <li>• Preferred location and housing requirements</li>
                      <li>• Budget range</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Clock className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Processing Time:</h3>
                    <p className="text-gray-700">Applications are typically reviewed within 24-48 hours</p>
                  </div>
                </div>
                <Button onClick={() => navigate('/find-home')} className="bg-blue-600 hover:bg-blue-700">
                  Start Your Application <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center">
                    <span className="font-bold">2</span>
                  </div>
                  Browse Available Properties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <Home className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Property Features:</h3>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Verified Section 8 acceptance</li>
                      <li>• Detailed photos and descriptions</li>
                      <li>• Neighborhood information</li>
                      <li>• Transparent pricing</li>
                    </ul>
                  </div>
                </div>
                <Button onClick={() => navigate('/browse-properties')} variant="outline">
                  Browse Properties <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center">
                    <span className="font-bold">3</span>
                  </div>
                  Connect with Landlords
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <MessageSquare className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Direct Communication:</h3>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Send messages directly to property owners</li>
                      <li>• Schedule viewings</li>
                      <li>• Ask questions about the property</li>
                      <li>• Negotiate terms</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">💡 Pro Tip: Priority Placement</h4>
                  <p className="text-orange-700 text-sm">
                    Upgrade to priority placement for $15 to get your application seen first by landlords and increase your chances of securing housing quickly.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 4 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="bg-orange-600 text-white w-10 h-10 rounded-full flex items-center justify-center">
                    <span className="font-bold">4</span>
                  </div>
                  Complete the Move-In Process
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Final Steps:</h3>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Complete rental application with chosen landlord</li>
                      <li>• Coordinate Section 8 inspection</li>
                      <li>• Sign lease agreement</li>
                      <li>• Move into your new home!</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Support Section */}
          <Card className="bg-gray-100">
            <CardHeader>
              <CardTitle>Need Help Along the Way?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                Our team is here to support you throughout the entire process. Contact us anytime:
              </p>
              <div className="space-y-2">
                <p><strong>Email:</strong> info@openkey.com</p>
                <p><strong>Phone:</strong> (555) 123-4567</p>
              </div>
            </CardContent>
          </Card>
        </div>
    </FooterPageLayout>
  );
};

export default ApplicationProcess;
