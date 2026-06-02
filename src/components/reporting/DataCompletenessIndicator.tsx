import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

export interface DataQualityScore {
  score: number; // 0-100
  completeness: 'excellent' | 'good' | 'partial' | 'poor';
  missingFields: string[];
  estimatedFields: string[];
  realFields: string[];
}

export interface PropertyDataQuality {
  propertyId: string;
  propertyAddress: string;
  quality: DataQualityScore;
}

interface DataCompletenessIndicatorProps {
  properties: PropertyDataQuality[];
  onImproveData?: (propertyId: string) => void;
}

export const DataCompletenessIndicator: React.FC<DataCompletenessIndicatorProps> = ({
  properties,
  onImproveData
}) => {
  const overallScore = properties.length > 0 
    ? Math.round(properties.reduce((sum, p) => sum + p.quality.score, 0) / properties.length)
    : 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (completeness: DataQualityScore['completeness']) => {
    switch (completeness) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'partial': return 'outline';
      case 'poor': return 'destructive';
    }
  };

  const poorQualityProperties = properties.filter(p => p.quality.score < 60);
  
  return (
    <div className="space-y-4">
      {/* Overall Data Quality Alert */}
      {overallScore < 80 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Financial Data Quality: {overallScore}%</strong>
                <p className="text-sm mt-1">
                  Some properties are missing financial information. Improve data accuracy for better reports.
                </p>
              </div>
              <Button variant="outline" size="sm" className="ml-4">
                <ExternalLink className="h-4 w-4 mr-2" />
                Setup Guide
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Properties with Poor Data Quality */}
      {poorQualityProperties.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Properties needing financial setup:
          </h4>
          <div className="grid gap-2">
            {poorQualityProperties.map((property) => (
              <div 
                key={property.propertyId}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{property.propertyAddress}</p>
                    <Badge variant={getScoreBadgeVariant(property.quality.completeness)}>
                      {property.quality.score}% complete
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Missing: {property.quality.missingFields.join(', ')}
                  </p>
                </div>
                {onImproveData && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onImproveData(property.propertyId)}
                  >
                    Complete Setup
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Success State */}
      {overallScore >= 80 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Excellent data quality ({overallScore}%)</strong> - Your balance sheet reflects accurate financial information.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};