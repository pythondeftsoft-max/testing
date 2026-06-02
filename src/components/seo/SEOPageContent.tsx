import React from 'react';
import { CheckCircle, Users, Clock, Shield } from 'lucide-react';

interface SEOPageContentProps {
  city?: string | null;
  state?: string | null;
  templateType: string;
}

const SEOPageContent: React.FC<SEOPageContentProps> = ({
  city,
  state,
  templateType
}) => {
  const locationString = city && state 
    ? `${city}, ${state}` 
    : city || state || 'your area';

  // Template type display name
  const getTemplateDisplayName = () => {
    switch (templateType) {
      case 'section_8':
        return 'Section 8 housing';
      case 'housing_voucher':
        return 'housing voucher assistance';
      case 'landlord_voucher':
        return 'voucher tenant placement';
      case 'assisted_living':
        return 'assisted living';
      case 'senior_housing':
        return 'senior housing';
      case 'affordable':
        return 'affordable housing';
      default:
        return 'housing assistance';
    }
  };

  const isLandlordFocused = templateType === 'landlord_voucher';

  return (
    <div className="space-y-12">
      {/* How OpenKey Works Section */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">
          How OpenKey Works in {locationString}
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Step 1</h3>
            <p className="text-muted-foreground">
              {isLandlordFocused 
                ? 'Submit your property details and preferences'
                : 'Submit your information and housing needs'
              }
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Step 2</h3>
            <p className="text-muted-foreground">
              {isLandlordFocused
                ? 'We match you with verified voucher holders'
                : 'We match you with verified landlords who accept vouchers'
              }
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Step 3</h3>
            <p className="text-muted-foreground">
              Get placed faster with our direct matching process
            </p>
          </div>
        </div>
      </section>

      {/* Why No Marketplace Section */}
      <section className="bg-muted/30 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Why We Don't Use a Public Marketplace
        </h2>
        
        <p className="text-muted-foreground mb-6">
          OpenKey takes a different approach to {getTemplateDisplayName()} in {locationString}. 
          Instead of listing properties publicly, we use a direct matching system that benefits 
          both tenants and landlords.
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">Reduces Application Fatigue</h4>
              <p className="text-sm text-muted-foreground">
                {isLandlordFocused
                  ? 'No sorting through hundreds of unqualified applicants'
                  : 'No applying to dozens of properties hoping for a response'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">Prevents Delays</h4>
              <p className="text-sm text-muted-foreground">
                Direct matching means no competing offers or bidding wars
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">Pre-Qualified Matches</h4>
              <p className="text-sm text-muted-foreground">
                {isLandlordFocused
                  ? 'Only receive tenants who meet your criteria'
                  : 'Only connect with landlords verified to accept your voucher'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">Personal Support</h4>
              <p className="text-sm text-muted-foreground">
                Our team handles the matching process directly
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SEOPageContent;
