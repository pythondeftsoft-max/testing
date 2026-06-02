
import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Building, User, Plus, CheckCircle } from 'lucide-react';
import { useUserPoints } from '@/hooks/useUserPoints';
import { format } from 'date-fns';

interface UserPointsHistoryProps {
  userId: string;
  portfolioId?: string;
  showPortfolioFilter?: boolean;
}

const UserPointsHistory = ({ userId, portfolioId, showPortfolioFilter = true }: UserPointsHistoryProps) => {
  const { userPoints, loading, error } = useUserPoints(userId, portfolioId);

  if (loading) {
    return (
      <CardEnhanced variant="elevated">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-openkey-blue" />
            Points History
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  if (error) {
    return (
      <CardEnhanced variant="elevated">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-openkey-blue" />
            Points History
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <p className="text-destructive">Failed to load points history</p>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced variant="elevated" className="card-hover">
      <CardEnhancedHeader>
        <CardEnhancedTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-openkey-blue" />
          Points History
        </CardEnhancedTitle>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        {!userPoints || userPoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No points earned yet</p>
            <p className="text-sm">Start contributing to portfolios to earn points!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {userPoints.map((point) => (
              <div key={point.id} className="border-l-4 border-openkey-gold pl-4 py-3 bg-gradient-to-r from-openkey-gold/5 to-transparent rounded-r-lg transition-all duration-200 hover:from-openkey-gold/10">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="success" className="text-xs flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {point.source_event_type}
                      </Badge>
                      <div className="flex items-center gap-1 font-semibold text-openkey-gold">
                        <Plus className="h-3 w-3" />
                        {point.points_awarded} points
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(point.created_at), 'MMM d, yyyy')}
                      </div>
                      
                      {showPortfolioFilter && point.portfolio_id && (
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          Portfolio: {point.portfolio_id.slice(0, 8)}...
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {point.distribution_percent}% share
                      </div>
                    </div>
                    
                    {point.notes && (
                      <p className="text-sm text-muted-foreground">{point.notes}</p>
                    )}
                    
                    {point.distribution_details && typeof point.distribution_details === 'object' && 'property_id' in point.distribution_details && (
                      <p className="text-xs text-muted-foreground">
                        Property-related event
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default UserPointsHistory;
