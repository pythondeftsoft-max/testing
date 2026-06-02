import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, MapPin, Home, DollarSign, Calendar, Eye, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminUserInfoPanelProps {
  userId: string | null;
}

export const AdminUserInfoPanel: React.FC<AdminUserInfoPanelProps> = ({ userId }) => {
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['user-profile-info', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return profile;
    },
    enabled: !!userId,
  });

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 border-l">
        <User className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No User Selected</h3>
        <p className="text-sm text-muted-foreground">
          Select a conversation to view user details
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full border-l">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 border-l">
        <User className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <p className="text-sm text-muted-foreground">User profile not found</p>
      </div>
    );
  }

  return (
    <div className="border-l">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          {/* User Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {userProfile.first_name} {userProfile.last_name}
                  </CardTitle>
                  <Badge variant="secondary" className="mt-1">
                    {userProfile.user_type}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{userProfile.email}</span>
              </div>
              {userProfile.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{userProfile.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Info for Tenants */}
          {userProfile.user_type === 'tenant' && (
            <>
              {((userProfile as any).city || (userProfile as any).zip_code) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {(userProfile as any).city && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">City:</span>
                        <span className="font-medium">{(userProfile as any).city}</span>
                      </div>
                    )}
                    {(userProfile as any).zip_code && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Zip Code:</span>
                        <span className="font-medium">{(userProfile as any).zip_code}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {((userProfile as any).monthly_income || (userProfile as any).max_rent) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Financial Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {(userProfile as any).monthly_income && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Income:</span>
                        <span className="font-medium">${(userProfile as any).monthly_income.toLocaleString()}</span>
                      </div>
                    )}
                    {(userProfile as any).max_rent && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Rent:</span>
                        <span className="font-medium">${(userProfile as any).max_rent.toLocaleString()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Account Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">
                  {new Date(userProfile.created_at).toLocaleDateString()}
                </span>
              </div>
              {(userProfile as any).is_plus_subscriber && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subscriber:</span>
                  <Badge variant="default" className="text-xs">Plus Member</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Eye className="h-4 w-4 mr-2" />
              View Full Profile
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
