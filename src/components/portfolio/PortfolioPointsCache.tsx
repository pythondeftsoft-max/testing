
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Database, Zap, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface PortfolioPointsCacheProps {
  portfolioId: string;
}

interface CacheStats {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  cacheSize: number;
  lastUpdated: Date;
  status: 'healthy' | 'warning' | 'error';
}

const PortfolioPointsCache = ({ portfolioId }: PortfolioPointsCacheProps) => {
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    hitRate: 87.5,
    missRate: 12.5,
    totalRequests: 1247,
    cacheSize: 2.3,
    lastUpdated: new Date(),
    status: 'healthy'
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshCache = async () => {
    setIsRefreshing(true);
    // Simulate cache refresh
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCacheStats(prev => ({
      ...prev,
      lastUpdated: new Date(),
      hitRate: Math.min(95, prev.hitRate + Math.random() * 5),
      totalRequests: prev.totalRequests + Math.floor(Math.random() * 50)
    }));
    setIsRefreshing(false);
  };

  const clearCache = async () => {
    // Simulate cache clearing
    setCacheStats(prev => ({
      ...prev,
      hitRate: 0,
      missRate: 100,
      totalRequests: 0,
      cacheSize: 0,
      lastUpdated: new Date()
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2 text-blue-500" />
              Performance Cache
            </CardTitle>
            <CardDescription>
              Cache optimization for portfolio points calculations
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(cacheStats.status)}
            <Badge variant={cacheStats.status === 'healthy' ? 'default' : 'destructive'}>
              {cacheStats.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cache Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Cache Hit Rate</span>
                <span className="text-sm text-muted-foreground">
                  {cacheStats.hitRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={cacheStats.hitRate} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Cache Miss Rate</span>
                <span className="text-sm text-muted-foreground">
                  {cacheStats.missRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={cacheStats.missRate} className="h-2" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <Zap className="w-4 h-4 text-blue-500 mr-2" />
                <span className="text-sm font-medium">Total Requests</span>
              </div>
              <span className="text-lg font-bold text-blue-600">
                {cacheStats.totalRequests.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <Database className="w-4 h-4 text-green-500 mr-2" />
                <span className="text-sm font-medium">Cache Size</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {cacheStats.cacheSize} MB
              </span>
            </div>
          </div>
        </div>

        {/* Cache Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={refreshCache} 
            disabled={isRefreshing}
            className="flex-1"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Cache
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={clearCache}
            className="flex-1"
          >
            <Database className="w-4 h-4 mr-2" />
            Clear Cache
          </Button>
        </div>

        {/* Cache Status */}
        <div className="p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Cache Status</h4>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              Last updated: {cacheStats.lastUpdated.toLocaleTimeString()}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Performance</div>
              <div className="font-medium">
                {cacheStats.hitRate > 80 ? 'Excellent' : 
                 cacheStats.hitRate > 60 ? 'Good' : 'Needs Improvement'}
              </div>
            </div>
            
            <div>
              <div className="text-muted-foreground">Memory Usage</div>
              <div className="font-medium">
                {cacheStats.cacheSize < 5 ? 'Optimal' : 
                 cacheStats.cacheSize < 10 ? 'Moderate' : 'High'}
              </div>
            </div>
            
            <div>
              <div className="text-muted-foreground">Efficiency</div>
              <div className="font-medium">
                {cacheStats.hitRate > 85 ? 'High' : 
                 cacheStats.hitRate > 70 ? 'Medium' : 'Low'}
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Optimization Recommendations</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            {cacheStats.hitRate < 70 && (
              <div className="flex items-start">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                <span>Consider increasing cache size to improve hit rate</span>
              </div>
            )}
            {cacheStats.cacheSize > 5 && (
              <div className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                <span>Review cache eviction policies to optimize memory usage</span>
              </div>
            )}
            {cacheStats.hitRate > 85 && (
              <div className="flex items-start">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                <span>Cache performance is optimal</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioPointsCache;
