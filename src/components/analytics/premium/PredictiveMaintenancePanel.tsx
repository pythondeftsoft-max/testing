import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wrench,
  AlertTriangle,
  Calendar,
  DollarSign,
  TrendingUp,
  Loader2,
  RefreshCcw,
  Settings,
  Clock,
  Building
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PredictiveMaintenancePrediction {
  id: string;
  property_id: string;
  issue: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  estimated_cost: number;
  probability: number;
  timeline: string;
  description: string;
  prevention_tips: string;
}

interface PredictiveMaintenancePanelProps {
  landlordId?: string;
  portfolioId?: string;
  className?: string;
}

const PredictiveMaintenancePanel: React.FC<PredictiveMaintenancePanelProps> = ({
  landlordId,
  portfolioId,
  className = ''
}) => {
  const [predictions, setPredictions] = useState<PredictiveMaintenancePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPredictions();
  }, [landlordId, portfolioId]);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: functionError } = await supabase.functions.invoke('ai-predictive-maintenance', {
        body: { 
          portfolioId: portfolioId && portfolioId !== 'everything' ? portfolioId : null,
          landlordId: landlordId || user.id
        },
      });

      if (functionError) {
        if (functionError.message?.includes('GEMINI_API_KEY')) {
          setGeminiConfigured(false);
        }
        throw functionError;
      }

      if (data?.predictions) {
        setPredictions(data.predictions);
      } else {
        setPredictions([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch maintenance predictions:', error);
      setError(error.message || 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchPredictions();
    toast({
      title: "Refreshing Predictions",
      description: "Analyzing maintenance data with AI...",
    });
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'hvac':
        return <Settings className="w-4 h-4" />;
      case 'plumbing':
        return <Wrench className="w-4 h-4" />;
      case 'electrical':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Wrench className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (!geminiConfigured) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <Settings className="w-12 h-12 text-muted-foreground" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              AI Predictive Maintenance Setup Required
            </h3>
            <p className="text-muted-foreground mb-4">
              Gemini API is not configured. Please contact your administrator to enable AI-powered maintenance predictions.
            </p>
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
              Configuration Required
            </Badge>
          </div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">AI is analyzing maintenance patterns...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex flex-col items-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <span className="text-red-600 text-center">{error}</span>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (predictions.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex flex-col items-center space-y-3">
          <Wrench className="w-8 h-8 text-muted-foreground" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Maintenance Predictions Available
            </h3>
            <p className="text-muted-foreground">
              Add more maintenance history data to get AI-powered predictions.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Group predictions by property for better organization
  const groupedPredictions = predictions.reduce((acc, prediction) => {
    if (!acc[prediction.property_id]) {
      acc[prediction.property_id] = [];
    }
    acc[prediction.property_id].push(prediction);
    return acc;
  }, {} as Record<string, PredictiveMaintenancePrediction[]>);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wrench className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">AI Predictive Maintenance</h3>
              <p className="text-sm text-muted-foreground">
                {predictions.length} predictions across {Object.keys(groupedPredictions).length} properties
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Gemini AI
            </Badge>
            <Button onClick={handleRefresh} variant="ghost" size="sm">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Predictions by Property */}
      <div className="space-y-6">
        {Object.entries(groupedPredictions).map(([propertyId, propertyPredictions]) => (
          <Card key={propertyId} className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building className="w-5 h-5 text-muted-foreground" />
              <h4 className="font-semibold text-foreground">Property ID: {propertyId}</h4>
              <Badge variant="outline">
                {propertyPredictions.length} predictions
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {propertyPredictions.map((prediction, index) => (
                <motion.div
                  key={prediction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-4 h-full border-l-4 border-l-primary/20 hover:border-l-primary/40 transition-colors">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(prediction.category)}
                          <span className="font-medium text-sm">{prediction.issue}</span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getUrgencyColor(prediction.urgency)}`}
                        >
                          {prediction.urgency.toUpperCase()}
                        </Badge>
                      </div>
                      
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Cost:</span>
                          <span className="font-medium">{formatCurrency(prediction.estimated_cost)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Probability:</span>
                          <span className="font-medium">{Math.round(prediction.probability * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-1 col-span-2">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Timeline:</span>
                          <span className="font-medium">{prediction.timeline}</span>
                        </div>
                      </div>
                      
                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {prediction.description}
                      </p>
                      
                      {/* Prevention Tips */}
                      {prediction.prevention_tips && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            <strong>Prevention:</strong> {prediction.prevention_tips}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PredictiveMaintenancePanel;