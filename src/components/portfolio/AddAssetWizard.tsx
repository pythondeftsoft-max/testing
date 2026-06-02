import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { Plus } from 'lucide-react';
import { CategorySelectionStep } from './wizard-steps/CategorySelectionStep';
import { AssetDetailsStep } from './wizard-steps/AssetDetailsStep';
import { ReviewStep } from './wizard-steps/ReviewStep';
import { AssetCategory } from '@/types/portfolio-assets';
import { SymbolSearchResult } from '@/hooks/useSymbolSearch';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import { usePermissions } from '@/providers/PermissionProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface WizardData {
  selectedCategory?: AssetCategory;
  selectedSubcategory?: string;
  selectedSymbol?: SymbolSearchResult;
  assetName: string;
  assetValue: number;
  acquisitionCost?: number;
  acquisitionDate?: string;
  annualIncome: number;
  annualExpenses: number;
  metadata: Record<string, any>;
  tags: string[];
  notes?: string;
  enableCashFlowReminders?: boolean;
  cashFlowReminderFrequency?: 'quarterly' | 'semi-annual' | 'annual';
}

interface AddAssetWizardProps {
  portfolioId: string;
  onAssetAdded?: () => void;
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AddAssetWizard: React.FC<AddAssetWizardProps> = ({
  portfolioId,
  onAssetAdded,
  trigger,
  isOpen,
  onOpenChange
}) => {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { user } = useAuth();
  const { portfolios } = useUserPortfolios(user?.id);
  
  console.log('🎪 [AddAssetWizard] Component rendered:', {
    portfolioId,
    isOpen,
    hasOnAssetAdded: !!onAssetAdded,
    hasTrigger: !!trigger,
    hasOnOpenChange: !!onOpenChange,
    timestamp: new Date().toISOString()
  });

  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Debug open state changes
  useEffect(() => {
    console.log('🎪 [AddAssetWizard] Open state changed:', { open, portfolioId });
  }, [open, portfolioId]);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(portfolioId === 'everything' ? 'everything' : portfolioId);
  const [wizardData, setWizardData] = useState<WizardData>({
    assetName: '',
    assetValue: 0,
    annualIncome: 0,
    annualExpenses: 0,
    metadata: {},
    tags: []
  });

  const isEverythingMode = portfolioId === 'everything';
  const needsPortfolioSelection = isEverythingMode && !selectedPortfolioId;
  const effectivePortfolioId = isEverythingMode ? 
    (selectedPortfolioId === 'everything' ? 'everything' : selectedPortfolioId) : 
    portfolioId;

  const steps = [
    ...(needsPortfolioSelection ? ['Portfolio'] : []),
    'Category',
    'Details',
    'Review'
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      console.log('➡️ [AddAssetWizard] Moving to next step:', { from: currentStep, to: currentStep + 1 });
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      console.log('⬅️ [AddAssetWizard] Moving to previous step:', { from: currentStep, to: currentStep - 1 });
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    console.log('✅ [AddAssetWizard] Wizard completed, closing and resetting');
    setOpen(false);
    setCurrentStep(0);
    setSelectedPortfolioId(portfolioId === 'everything' ? 'everything' : portfolioId);
    setWizardData({
      assetName: '',
      assetValue: 0,
      annualIncome: 0,
      annualExpenses: 0,
      metadata: {},
      tags: []
    });
    onAssetAdded?.();
  };

  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const renderCurrentStep = () => {
    const stepIndex = currentStep;
    
    // Portfolio selection step (only for "everything" mode)
    if (needsPortfolioSelection && stepIndex === 0) {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Select Portfolio</h3>
            <p className="text-muted-foreground">Choose which portfolio to add the asset to:</p>
          </div>
          <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a portfolio for this asset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everything">
                <div className="flex items-center justify-between w-full">
                  <span>Everything (Personal Assets)</span>
                  <span className="text-xs text-muted-foreground">
                    Individual investments
                  </span>
                </div>
              </SelectItem>
              {portfolios?.map((portfolio) => (
                <SelectItem key={portfolio.id} value={portfolio.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{portfolio.client_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {portfolio.property_count || 0} properties
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button 
              onClick={handleNext} 
              disabled={!selectedPortfolioId}
            >
              Next
            </Button>
          </div>
        </div>
      );
    }
    
    const categoryStepIndex = needsPortfolioSelection ? 1 : 0;
    if (stepIndex === categoryStepIndex) {
      return (
        <CategorySelectionStep
          wizardData={wizardData}
          onDataChange={updateWizardData}
          onNext={handleNext}
        />
      );
    }

    // Details step (now comes right after category)
    const detailsStepIndex = categoryStepIndex + 1;
      
    if (stepIndex === detailsStepIndex) {
      return (
        <AssetDetailsStep
          wizardData={wizardData}
          onDataChange={updateWizardData}
          onNext={handleNext}
          onBack={handleBack}
        />
      );
    }

    // Review step (final step)
    return (
      <ReviewStep
        wizardData={wizardData}
        portfolioId={effectivePortfolioId}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    );
  };

  // Check permissions
  const canCreateAssets = isEverythingMode 
    ? hasPermission('portfolio.assets', 'create', 'account')
    : hasPermission('portfolio.assets', 'create', 'portfolio');
  const showPermissionDenied = !permissionsLoading && !canCreateAssets;

  if (showPermissionDenied && !trigger) {
    // Silently render nothing — the dashboard already gates entry points
    // (Quick Actions, etc.) by permission/mode, so a loud red banner here
    // is just noise for landlords without asset permissions.
    return null;
  }

  return (
    <PermissionGuard 
      object="portfolio.assets" 
      action="create" 
      scope={isEverythingMode ? 'account' : 'portfolio'} 
      portfolioId={isEverythingMode ? undefined : portfolioId}
      fallback={
        <div>
          <p>Permission denied for portfolio.assets create in {isEverythingMode ? 'account' : `portfolio ${portfolioId}`}</p>
        </div>
      }
    >
      <Dialog open={open} onOpenChange={(newOpen) => {
        console.log('🔄 [AddAssetWizard] Dialog state change:', { newOpen, portfolioId });
        setOpen(newOpen);
      }}>
        {trigger && (
          <DialogTrigger asChild>
            {trigger}
          </DialogTrigger>
        )}
        {!trigger && isOpen === undefined && (
          <DialogTrigger asChild>
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <Stepper currentStep={currentStep} steps={steps} />
            {renderCurrentStep()}
          </div>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
};