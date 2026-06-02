import React from 'react';
import { Star, Grid3X3, BarChart3, Settings, TrendingUp, Building2 } from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWidgetFavorites, FavoriteWidget } from '@/hooks/useWidgetFavorites';
import { FavoriteWidgetRenderer } from './FavoriteWidgetRenderer';


interface FavoritesOverviewProps {
  currentUserId: string;
  onStartCustomizing: () => void;
}

const FavoritesOverview: React.FC<FavoritesOverviewProps> = ({
  currentUserId,
  onStartCustomizing
}) => {
  const {
    favoriteWidgetData,
    getFavoritesByTab,
    getFavoritesByCategory,
    totalFavorites,
    isFavorited,
    toggleFavorite
  } = useWidgetFavorites(currentUserId);


  const handleDeleteWidget = (widgetId: string) => {
    // Remove from favorites (same as unfavoriting)
    toggleFavorite(widgetId);
  };

  const renderFavoriteWidget = (widget: FavoriteWidget) => (
    <div key={widget.id}>
      <FavoriteWidgetRenderer
        widget={widget}
        onToggleFavorite={toggleFavorite}
        onDelete={handleDeleteWidget}
        isFavorited={isFavorited(widget.id)}
      />
    </div>
  );

  const renderWidgetGrid = (widgets: FavoriteWidget[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {widgets.map(renderFavoriteWidget)}
    </div>
  );

  if (totalFavorites === 0) {
    return (
      <CardEnhanced variant="premium" className="border-0 shadow-md">
        <CardEnhancedContent className="p-8">
          <div className="text-center py-12">
            <Star className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h3 className="text-xl font-semibold mb-3 text-openkey-blue">
              Create Your Personal Dashboard
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Star your favorite widgets from any tab to create a personalized overview. 
              Click the customize button to get started.
            </p>
            <Button onClick={onStartCustomizing} className="gap-2 bg-openkey-blue hover:bg-openkey-blue/90">
              <Star className="h-4 w-4" />
              Start Customizing
            </Button>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced variant="premium" className="border-0 shadow-md">
      <CardEnhancedHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardEnhancedTitle className="text-lg font-semibold text-openkey-blue">
              Your Favorite Analytics
            </CardEnhancedTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Personalized dashboard with your most important metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              {totalFavorites} Favorites
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={onStartCustomizing}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Customize
            </Button>
          </div>
        </div>
      </CardEnhancedHeader>

      <CardEnhancedContent className="pt-0">
        {renderWidgetGrid(favoriteWidgetData)}
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default FavoritesOverview;