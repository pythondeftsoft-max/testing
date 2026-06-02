import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DataRequirement {
  field: string;
  description: string;
  impact: string;
  location?: string;
}

interface DataRequirementsAlertProps {
  reportName: string;
  requirements: DataRequirement[];
  className?: string;
}

export const DataRequirementsAlert: React.FC<DataRequirementsAlertProps> = ({
  reportName,
  requirements,
  className
}) => {
  const navigate = useNavigate();

  return (
    <Alert variant="default" className={`border-info/20 bg-info/5 ${className}`}>
      <Info className="h-4 w-4 text-info" />
      <AlertTitle className="text-info">Data Requirements for {reportName}</AlertTitle>
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This report requires the following property fields:
            </p>
            <div className="flex flex-wrap gap-2">
              {requirements.map((req, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center px-2 py-1 rounded-md bg-info/10 text-info text-xs font-medium"
                >
                  {req.field}
                </span>
              ))}
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/properties')}
            className="flex items-center gap-2 text-info border-info/30 hover:bg-info/10"
          >
            Update Properties
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};