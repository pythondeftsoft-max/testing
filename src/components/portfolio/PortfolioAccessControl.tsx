
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import PortfolioRoleManager from './PortfolioRoleManager';
import { PortfolioPermissionsManager } from './PortfolioPermissionsManager';

interface PortfolioAccessControlProps {
  portfolioId: string;
  currentUserId: string;
  isAdminPartner: boolean;
}

export const PortfolioAccessControl: React.FC<PortfolioAccessControlProps> = ({
  portfolioId,
  currentUserId,
  isAdminPartner,
}) => {

  if (!isAdminPartner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Portfolio Access Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You need admin partner permissions to manage portfolio access control.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PortfolioRoleManager
        portfolioId={portfolioId}
        currentUserId={currentUserId}
      />
      <PortfolioPermissionsManager
        portfolioId={portfolioId}
        currentUserId={currentUserId}
        isAdminPartner={isAdminPartner}
      />
    </div>
  );
};
