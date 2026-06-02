import React from 'react';
import { CategorySection } from './CategorySection';
import { PropertyPerformanceBreakdown } from './property/PropertyPerformanceBreakdown';
import { MaintenanceAnalyticsDeepDive } from './property/MaintenanceAnalyticsDeepDive';
import { PropertyRiskAssessment } from './property/PropertyRiskAssessment';
import { UnitLevelInsights } from './property/UnitLevelInsights';

interface PropertyDeepDiveHubProps {
  portfolioId: string;
  currentUserId: string;
  properties?: any[];
}

export const PropertyDeepDiveHub: React.FC<PropertyDeepDiveHubProps> = ({
  portfolioId,
  currentUserId,
  properties = []
}) => {
  const sectionContent = (
    <div className="space-y-6">
      <PropertyPerformanceBreakdown 
        portfolioId={portfolioId}
        currentUserId={currentUserId}
        properties={properties}
      />
      
      <MaintenanceAnalyticsDeepDive 
        portfolioId={portfolioId}
        currentUserId={currentUserId}
        properties={properties}
      />
      
      <PropertyRiskAssessment 
        portfolioId={portfolioId}
        currentUserId={currentUserId}
        properties={properties}
      />
      
      <UnitLevelInsights 
        portfolioId={portfolioId}
        currentUserId={currentUserId}
        properties={properties}
      />
    </div>
  );

  return (
    <CategorySection 
      title="Property Deep Dive Analytics"
    >
      {sectionContent}
    </CategorySection>
  );
};