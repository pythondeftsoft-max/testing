
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Building, User, Plus } from 'lucide-react';
import { usePortfolioPoints } from '@/hooks/usePortfolioPoints';
import { format } from 'date-fns';
import AwardPointsDialog from './AwardPointsDialog';
import DistributePointsButton from './DistributePointsButton';

interface PortfolioPointsHistoryProps {
  portfolioId: string;
  canManage?: boolean;
}

const PortfolioPointsHistory = ({ portfolioId, canManage = false }: PortfolioPointsHistoryProps) => {
  const { portfolioPoints, loading, error } = usePortfolioPoints(portfolioId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Portfolio Points History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Portfolio Points History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load portfolio points</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Portfolio Points History
          </CardTitle>
          {canManage && (
            <button className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Award Points
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!portfolioPoints || portfolioPoints.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No points awarded yet</p>
            <p className="text-sm">Start tracking portfolio activities to earn points!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {portfolioPoints.map((point) => (
              <div key={point.id} className="border-l-4 border-green-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {point.source_event_type}
                      </Badge>
                      <span className="font-semibold text-green-600">
                        +{point.points_awarded} points
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(point.created_at), 'MMM d, yyyy')}
                      </div>
                      
                      {point.property_id && (
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          Property: {point.property_id.slice(0, 8)}...
                        </div>
                      )}
                      
                      {point.tenant_id && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Tenant: {point.tenant_id.slice(0, 8)}...
                        </div>
                      )}
                    </div>
                    
                    {point.notes && (
                      <p className="text-sm text-gray-500">{point.notes}</p>
                    )}
                  </div>
                  
                  {canManage && (
                    <DistributePointsButton 
                      portfolioPointsId={point.id}
                      onSuccess={() => {
                        // Refresh the points list
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioPointsHistory;
