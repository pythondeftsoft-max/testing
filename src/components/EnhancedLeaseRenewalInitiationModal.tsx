import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, ExternalLink, Settings } from 'lucide-react';
import { LeaseRenewalTemplateManager } from './LeaseRenewalTemplateManager';
import { PlatformRenewalForm } from './PlatformRenewalForm';
import { ExternalRenewalForm } from './ExternalRenewalForm';

interface EnhancedLeaseRenewalInitiationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenantId: string;
  currentRent: number;
  currentLeaseEnd: string;
  propertyAddress: string;
  landlordId: string;
  onSuccess?: () => void;
}

type RenewalFlowType = 'platform_custom' | 'external' | null;

export const EnhancedLeaseRenewalInitiationModal: React.FC<EnhancedLeaseRenewalInitiationModalProps> = ({
  open,
  onOpenChange,
  propertyId,
  tenantId,
  currentRent,
  currentLeaseEnd,
  propertyAddress,
  landlordId,
  onSuccess
}) => {
  const [currentFlow, setCurrentFlow] = useState<RenewalFlowType>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const handleFlowSelect = (flowType: RenewalFlowType) => {
    setCurrentFlow(flowType);
  };

  const handleBackToOptions = () => {
    setCurrentFlow(null);
    setSelectedTemplateId(null);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setShowTemplateManager(false);
    setCurrentFlow('platform_custom');
  };

  const handleSuccess = () => {
    setCurrentFlow(null);
    setSelectedTemplateId(null);
    onOpenChange(false);
    if (onSuccess) onSuccess();
  };

  // Show template manager
  if (showTemplateManager) {
    return (
      <LeaseRenewalTemplateManager
        landlordId={landlordId}
        open={showTemplateManager}
        onOpenChange={(open) => {
          setShowTemplateManager(open);
          if (!open && !selectedTemplateId) setCurrentFlow(null);
        }}
        onTemplateSelect={handleTemplateSelect}
      />
    );
  }

  // Show platform renewal form (custom template)
  if (currentFlow === 'platform_custom') {
    return (
      <PlatformRenewalForm
        open={open}
        onOpenChange={onOpenChange}
        propertyId={propertyId}
        tenantId={tenantId}
        currentRent={currentRent}
        currentLeaseEnd={currentLeaseEnd}
        propertyAddress={propertyAddress}
        renewalType={currentFlow}
        templateId={selectedTemplateId}
        onSuccess={handleSuccess}
        onBack={handleBackToOptions}
      />
    );
  }

  // Show external renewal form
  if (currentFlow === 'external') {
    return (
      <ExternalRenewalForm
        open={open}
        onOpenChange={onOpenChange}
        propertyId={propertyId}
        tenantId={tenantId}
        currentRent={currentRent}
        currentLeaseEnd={currentLeaseEnd}
        propertyAddress={propertyAddress}
        onSuccess={handleSuccess}
        onBack={handleBackToOptions}
      />
    );
  }

  // Show renewal options
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose Lease Renewal Method</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Property: <strong>{propertyAddress}</strong>
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Platform with Custom Template */}
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Use Custom Template</CardTitle>
                </div>
                <CardDescription>
                  Use your own template and send through OpenKey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Custom Terms</Badge>
                    <Badge variant="outline" className="text-xs">Digital Signing</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload and manage your own lease templates. Full customization with digital workflow.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTemplateManager(true);
                      }}
                    >
                      Manage Templates
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTemplateManager(true);
                      }}
                    >
                      Select Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* External Renewal */}
            <Card className="md:col-span-2 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleFlowSelect('external')}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">External Renewal</CardTitle>
                </div>
                <CardDescription>
                  Handle renewal outside OpenKey and upload the signed lease
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Offline Process</Badge>
                    <Badge variant="outline" className="text-xs">Document Upload</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use your own process for lease renewal (email, in-person, etc.) and upload the signed documents to maintain records in OpenKey.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};