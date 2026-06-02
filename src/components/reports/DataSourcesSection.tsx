import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Database, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface DataSource {
  table: string;
  description: string;
}

export interface DataRequirement {
  field: string;
  description: string;
}

export interface CalculationStep {
  step: string;
  formula: string;
}

export interface DataSourcesSectionProps {
  sources: DataSource[];
  dataRequirements?: {
    fields: DataRequirement[];
    note?: string;
    calculationSteps?: CalculationStep[];
    updateButton?: {
      label: string;
      onClick: () => void;
    };
  };
}

export const DataSourcesSection: React.FC<DataSourcesSectionProps> = ({
  sources,
  dataRequirements,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="mb-4 border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-info" />
              <span className="text-sm font-medium text-info">Report Information</span>
              <Badge variant="outline" className="text-xs">
                {sources.length} {sources.length === 1 ? 'source' : 'sources'}
              </Badge>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-info" />
            ) : (
              <ChevronDown className="h-4 w-4 text-info" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            {/* Data Requirements Section */}
            {dataRequirements && (
              <div className="space-y-4 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Data Requirements & Setup
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Ensure the following fields are populated for accurate reporting:
                    </p>
                    
                    <div className="space-y-2 mb-3">
                      {dataRequirements.fields.map((req, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-info">•</span>
                          <div className="flex-1">
                            <span className="font-medium text-sm">{req.field}:</span>
                            <span className="text-sm text-muted-foreground ml-1">{req.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {dataRequirements.calculationSteps && dataRequirements.calculationSteps.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <p className="font-semibold text-sm">How This Report Calculates:</p>
                        {dataRequirements.calculationSteps.map((calc, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="text-info">{index + 1}.</span>
                            <div className="flex-1">
                              <span className="font-medium text-sm">{calc.step}</span>
                              <span className="text-sm text-muted-foreground ml-1">= {calc.formula}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {dataRequirements.note && (
                      <div className="px-3 py-2 rounded-md bg-info/5 border border-info/20">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-info">Note:</span> {dataRequirements.note}
                        </p>
                      </div>
                    )}
                  </div>
                  {dataRequirements.updateButton && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={dataRequirements.updateButton.onClick}
                      className="flex items-center gap-2 ml-4 text-info border-info/30 hover:bg-info/10"
                    >
                      {dataRequirements.updateButton.label}
                    </Button>
                  )}
                </div>
              </div>
            )}

          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
