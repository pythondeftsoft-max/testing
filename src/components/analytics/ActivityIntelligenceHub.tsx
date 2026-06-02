import React from 'react';
import { Activity, Zap, Bell, TrendingUp } from 'lucide-react';
import CategorySection from './CategorySection';
import RealTimeActivityFeed from './activity/RealTimeActivityFeed';
import AIInsightsPanel from './activity/AIInsightsPanel';
import AlertsAndNotifications from './activity/AlertsAndNotifications';
import MarketIntelligence from './activity/MarketIntelligence';

interface ActivityIntelligenceHubProps {
  landlordId: string;
  portfolioId?: string;
}

const ActivityIntelligenceHub: React.FC<ActivityIntelligenceHubProps> = ({
  landlordId,
  portfolioId
}) => {
  return (
    <div className="space-y-6">
      <CategorySection
        title="Real-Time Activity Feed"
        description="Live updates from your portfolio operations"
        icon={Activity}
        defaultExpanded={true}
        className="bg-card border-openkey-blue/20"
      >
        <RealTimeActivityFeed landlordId={landlordId} portfolioId={portfolioId} />
      </CategorySection>

      <CategorySection
        title="AI-Powered Insights"
        description="Intelligent recommendations and market analysis"
        icon={Zap}
        defaultExpanded={false}
        className="bg-card border-openkey-blue/20"
      >
        <AIInsightsPanel landlordId={landlordId} portfolioId={portfolioId} />
      </CategorySection>

      <CategorySection
        title="Alerts & Notifications"
        description="Priority alerts and actionable notifications"
        icon={Bell}
        defaultExpanded={false}
        className="bg-card border-openkey-blue/20"
      >
        <AlertsAndNotifications landlordId={landlordId} portfolioId={portfolioId} />
      </CategorySection>

      <CategorySection
        title="Market Intelligence"
        description="Market trends and competitive positioning"
        icon={TrendingUp}
        defaultExpanded={false}
        className="bg-card border-openkey-blue/20"
      >
        <MarketIntelligence landlordId={landlordId} portfolioId={portfolioId} />
      </CategorySection>
    </div>
  );
};

export default ActivityIntelligenceHub;