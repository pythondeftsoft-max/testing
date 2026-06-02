import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, FileSignature, Download, Lock } from 'lucide-react';

interface PrivacyQuickLinksProps {
  /** Hide the VAWA card for non-tenant audiences (landlords). */
  showVawa?: boolean;
}

/**
 * Drop-in card row exposing HUD privacy self-service tools to tenants/landlords.
 * Lives in TenantProfile, Section8Portal, LandlordProfile, etc.
 */
export const PrivacyQuickLinks: React.FC<PrivacyQuickLinksProps> = ({ showVawa = true }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Your Privacy & Data</CardTitle>
        </div>
        <CardDescription>
          Manage HUD-required consents, request your data, and access survivor protections.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Button asChild variant="outline" className="justify-start">
          <Link to="/privacy-center">
            <FileSignature className="h-4 w-4 mr-2" />
            Privacy Center
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to="/my-data-request">
            <Download className="h-4 w-4 mr-2" />
            Request My Data
          </Link>
        </Button>
        {showVawa && (
          <Button asChild variant="outline" className="justify-start">
            <Link to="/vawa-certify">
              <Lock className="h-4 w-4 mr-2" />
              VAWA Self-Certification
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PrivacyQuickLinks;
