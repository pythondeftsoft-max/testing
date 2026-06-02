
import React from 'react';
import { FooterPageLayout } from '@/components/layouts/FooterPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Home, DollarSign, FileText, Users, Phone, Star } from 'lucide-react';

const Section8Info = () => {
  return (
    <FooterPageLayout title="Section 8 Housing Choice Voucher Program">
      <div className="text-center mb-12">
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Everything you need to know about the Housing Choice Voucher Program
        </p>
      </div>

        <div className="space-y-8">
          {/* What is Section 8 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-6 h-6 text-blue-600" />
                What is Section 8?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                The Housing Choice Voucher Program (commonly called Section 8) is a federal assistance program that helps families, seniors, and individuals with disabilities access safe and quality housing in the private rental market.
              </p>
              <p className="text-gray-700">
                Instead of being limited to public housing, participants can rent from any landlord who accepts Section 8 vouchers. Tenants contribute a portion of their income toward rent, and the housing authority covers the balance—creating stability for both tenants and landlords.
              </p>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-green-600" />
                How Section 8 Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">✅ For Tenants:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Affordable Rent:</strong> Pay only a portion of your income toward rent and utilities</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Choice & Flexibility:</strong> Use your voucher to rent apartments, single-family homes, or townhouses in the private market</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Portability:</strong> Move anywhere in the country where landlords accept Section 8</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Housing Stability:</strong> Enjoy long-term security and protection from sudden rent increases</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">🏘 For Landlords:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Guaranteed Payments:</strong> Receive dependable monthly rent directly from the housing authority</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Reduced Vacancy:</strong> Tap into a large pool of qualified renters actively seeking housing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Stable Tenants:</strong> Many Section 8 renters remain in homes long-term, lowering turnover costs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Property Oversight:</strong> Regular inspections help ensure properties are maintained to standard</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Competitive Rents:</strong> Payment standards are designed to match fair rental values in the local market</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Eligibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-600" />
                Eligibility Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">To qualify for Section 8, tenants must:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Have income within program guidelines for their area</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Be a U.S. citizen or eligible non-citizen</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Pass background and rental history screening</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Agree to program rules, such as paying their share of rent on time and maintaining the property</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Why Section 8 is a Win-Win */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-600" />
                Why Section 8 is a Win-Win
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Tenants:</h3>
                  <p className="text-gray-700">Gain access to safe, affordable housing with the freedom to choose where you live.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Landlords:</h3>
                  <p className="text-gray-700">Receive reliable payments, long-term tenants, and support from housing authorities.</p>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 mt-6">
                <p className="text-gray-700">
                  <strong>With OpenKey,</strong> we streamline the process—helping tenants find homes faster and making it easier for landlords to fill vacancies with dependable renters.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Application Process */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-orange-600" />
                How to Apply
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Contact PHA</h3>
                  <p className="text-sm text-gray-600">Contact your local Public Housing Authority to get on the waiting list</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">Wait for Voucher</h3>
                  <p className="text-sm text-gray-600">Wait times vary by location but can be several years</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Find Housing</h3>
                  <p className="text-sm text-gray-600">Once you receive a voucher, find qualified housing within the time limit</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-6 h-6 text-red-600" />
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                For more information about Section 8 or to find your local Public Housing Authority:
              </p>
              <div className="space-y-2">
                <p><strong>Website:</strong> <a href="https://www.hud.gov" className="text-blue-600 hover:underline">www.hud.gov</a></p>
                <p><strong>OpenKey Support:</strong> support@openkeyhousing.com</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500 mt-6">
                <p className="text-gray-700">
                  <strong>OpenKey makes it easier:</strong> We help streamline the Section 8 process, connecting qualified tenants with landlords who accept vouchers.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
    </FooterPageLayout>
  );
};

export default Section8Info;
