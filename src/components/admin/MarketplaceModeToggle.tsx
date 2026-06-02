
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Home, Users, AlertCircle } from 'lucide-react';

export const MarketplaceModeToggle: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current business phase
  const { data: currentPhase, isLoading } = useQuery({
    queryKey: ['business-phase-admin'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_business_phase', {
        p_user_id: user?.id
      });
      if (error) throw error;
      return data as string;
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Mutation to update business phase
  const updatePhaseMutation = useMutation({
    mutationFn: async (newMode: string) => {
      const { data, error } = await (supabase as any).rpc('set_business_phase', {
        p_mode: newMode
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['business-phase'] });
      queryClient.invalidateQueries({ queryKey: ['business-phase-admin'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-access'] });
      
      toast({
        title: "Marketplace Mode Updated",
        description: `Successfully switched to ${currentPhase === 'section8' ? 'Mixed' : 'Section 8'} mode`,
      });
    },
    onError: (error) => {
      console.error('Error updating marketplace mode:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update marketplace mode. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (checked: boolean) => {
    const newMode = checked ? 'mixed' : 'section8';
    updatePhaseMutation.mutate(newMode);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Marketplace Mode</CardTitle>
          <CardDescription>Loading current settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isMixedMode = currentPhase === 'mixed';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          Marketplace Mode
        </CardTitle>
        <CardDescription>
          Control which tenants can access the property marketplace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle Control */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Enable Mixed Mode</span>
              <Badge variant={isMixedMode ? "default" : "secondary"}>
                {isMixedMode ? 'Mixed' : 'Section 8'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {isMixedMode 
                ? 'All tenant types can access marketplace with housing interest'
                : 'Only voucher holders and residential tenants see marketplace'
              }
            </p>
          </div>
          <Switch
            checked={isMixedMode}
            onCheckedChange={handleToggle}
            disabled={updatePhaseMutation.isPending}
          />
        </div>

        {/* Mode Descriptions */}
        <div className="grid gap-4">
          <div className={`p-4 rounded-lg border ${!isMixedMode ? 'bg-primary/5 border-primary' : 'bg-muted/50'}`}>
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 mt-0.5" />
              <div>
                <h4 className="font-medium">Section 8 Mode</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Marketplace is only visible to voucher holders and residential tenants. 
                  Commercial/marine-only tenants are automatically excluded.
                </p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${isMixedMode ? 'bg-primary/5 border-primary' : 'bg-muted/50'}`}>
            <div className="flex items-start gap-3">
              <Home className="h-5 w-5 mt-0.5" />
              <div>
                <h4 className="font-medium">Mixed Mode</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Residential tenants always see marketplace. Commercial/marine tenants 
                  can opt-in by expressing housing interest in their settings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Warning for Mixed Mode */}
        {isMixedMode && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800">Mixed Mode Active</h4>
                <p className="text-sm text-orange-700 mt-1">
                  Commercial/marine tenants can now access the marketplace when they 
                  express housing interest. Monitor tenant activity for appropriate usage.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
