import { ModernAssetsLayout } from './ModernAssetsLayout';

interface CrossPortfolioAssetsDashboardProps {
  userId: string;
}

export const CrossPortfolioAssetsDashboard = ({ userId }: CrossPortfolioAssetsDashboardProps) => {
  return (
    <div className="space-y-6">
      {/* Modern Layout with Sidebar + Tabbed Content */}
      <ModernAssetsLayout userId={userId} />
    </div>
  );
};