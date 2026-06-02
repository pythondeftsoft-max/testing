
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Home, TrendingUp, FileText, Award, Users } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const BlogCategory = () => {
  const { categorySlug } = useParams();

  const categoryData = {
    'tenant-help-center': {
      title: 'Tenant Help Center',
      description: 'Section 8 & Housing Assistance',
      icon: Home,
      color: 'bg-openkey-blue/10 text-openkey-blue',
      bgColor: 'bg-openkey-blue/5',
      summary: `
        <div class="prose max-w-none">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Section 8 Housing Assistance Overview</h2>
          <p class="text-gray-700 mb-6">The Section 8 Housing Choice Voucher Program is the federal government's major program for assisting very low-income families, the elderly, and the disabled to afford decent, safe, and sanitary housing in the private market.</p>
          
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Key Benefits</h3>
          <ul class="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>Reduces housing costs to 30% of your income</li>
            <li>Freedom to choose your own housing</li>
            <li>Portability - move anywhere in the country</li>
            <li>Long-term assistance available</li>
          </ul>
          
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Getting Started</h3>
          <p class="text-gray-700 mb-4">Contact your local Public Housing Authority (PHA) to apply for assistance. Most PHAs have waiting lists, so apply as early as possible.</p>
        </div>
      `
    },
    'landlord-resources': {
      title: 'Landlord Resources',
      description: 'Property Management & Investment',
      icon: TrendingUp,
      color: 'bg-openkey-green/10 text-openkey-green',
      bgColor: 'bg-openkey-green/5',
      summary: `
        <div class="prose max-w-none">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Landlord Resources & Property Management</h2>
          <p class="text-gray-700 mb-6">Comprehensive resources for landlords to successfully manage rental properties, work with Section 8 tenants, and maximize investment returns.</p>
          
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Key Topics Covered</h3>
          <ul class="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>Section 8 program benefits for landlords</li>
            <li>Property management best practices</li>
            <li>Tenant screening and selection</li>
            <li>Legal compliance and regulations</li>
            <li>Maintenance and property upkeep</li>
          </ul>
          
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Investment Benefits</h3>
          <p class="text-gray-700 mb-4">Learn how to leverage government assistance programs to create stable rental income and build long-term wealth through real estate investment.</p>
        </div>
      `
    },
    'real-estate-tips-tricks': {
      title: 'Real Estate Tips & Tricks',
      description: 'Market Insights & Strategies',
      icon: FileText,
      color: 'bg-gray-100 text-gray-600',
      bgColor: 'bg-gray-50',
      summary: `
        <div class="prose max-w-none">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Real Estate Tips & Tricks</h2>
          <p class="text-gray-700 mb-6">Expert insights, market strategies, and proven techniques for success in the real estate industry.</p>
          
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Market Analysis</h3>
          <ul class="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>Understanding local market trends</li>
            <li>Identifying profitable investment opportunities</li>
            <li>Timing your buying and selling decisions</li>
            <li>Analyzing property values and ROI</li>
          </ul>
          
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Professional Strategies</h3>
          <p class="text-gray-700 mb-4">Discover insider tips from industry professionals on negotiation, property evaluation, and building a successful real estate portfolio.</p>
        </div>
      `
    },
    'property-tools-landlord-tips': {
      title: 'Property Tools & Landlord Tips',
      description: 'Management & Maintenance',
      icon: Award,
      color: 'bg-openkey-blue/10 text-openkey-blue',
      bgColor: 'bg-openkey-blue/5',
      summary: `
        <div class="prose max-w-none">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Property Management Tools</h2>
          <p class="text-gray-700 mb-6">Essential tools and practical tips for efficient property management and maintenance.</p>
          
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Management Tools</h3>
          <ul class="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>Digital rent collection systems</li>
            <li>Maintenance request tracking</li>
            <li>Tenant communication platforms</li>
            <li>Inspection scheduling software</li>
          </ul>
          
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Maintenance Tips</h3>
          <p class="text-gray-700 mb-4">Proactive maintenance scheduling, emergency response protocols, and cost-effective repair strategies.</p>
        </div>
      `
    },
    'case-studies-success-stories': {
      title: 'Case Studies & Success Stories',
      description: 'Real Examples',
      icon: Users,
      color: 'bg-openkey-green/10 text-openkey-green',
      bgColor: 'bg-openkey-green/5',
      summary: `
        <div class="prose max-w-none">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Success Stories & Case Studies</h2>
          <p class="text-gray-700 mb-6">Real-world examples of successful housing partnerships, tenant placements, and community development initiatives.</p>
          
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Featured Success Stories</h3>
          <ul class="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>Family transitions from homelessness to stable housing</li>
            <li>Landlord partnerships that benefit entire communities</li>
            <li>Innovative programs reducing housing wait times</li>
            <li>Technology solutions improving housing access</li>
          </ul>
          
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Impact Metrics</h3>
          <p class="text-gray-700 mb-4">Measurable outcomes from housing assistance programs, including placement rates, housing stability, and community development indicators.</p>
        </div>
      `
    }
  };

  const category = categoryData[categorySlug as keyof typeof categoryData];

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Category Not Found</h1>
            <p className="text-gray-600 mb-8">The category you're looking for doesn't exist.</p>
            <Link to="/blog">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const IconComponent = category.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <Link to="/blog">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>

        {/* Category Header */}
        <Card className={`${category.bgColor} border-0 mb-8`}>
          <CardContent className="p-8">
            <div className="flex items-center mb-6">
              <div className={`w-16 h-16 ${category.color} rounded-xl flex items-center justify-center mr-6`}>
                <IconComponent className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{category.title}</h1>
                <p className="text-lg text-gray-600">{category.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Summary */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-8">
            <div dangerouslySetInnerHTML={{ __html: category.summary }} />
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default BlogCategory;
