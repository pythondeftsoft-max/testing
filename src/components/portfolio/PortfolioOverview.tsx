import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, ExternalLink, Shield, Eye, Edit, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface PortfolioWithRoles {
  id: string;
  client_name: string;
  team_count: number;
  admin_count: number;
  editor_count: number;
  viewer_count: number;
  maintenance_count: number;
}

interface PortfolioOverviewProps {
  userId: string;
}

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({ userId }) => {
  const navigate = useNavigate();

  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['portfolios-overview', userId],
    queryFn: async () => {
      // Get all portfolios the user has access to
      const { data: userPortfolios, error: portfolioError } = await supabase
        .from('portfolio_roles')
        .select('portfolio_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (portfolioError) throw portfolioError;

      const portfolioIds = [...new Set(userPortfolios.map(p => p.portfolio_id))];

      if (portfolioIds.length === 0) return [];

      // Get portfolio details with role counts
      const portfolioData = await Promise.all(
        portfolioIds.map(async (portfolioId) => {
          const { data: portfolio, error: portfolioDetailsError } = await supabase
            .from('portfolios')
            .select('id, client_name')
            .eq('id', portfolioId)
            .single();

          if (portfolioDetailsError) {
            console.error('Error fetching portfolio:', portfolioDetailsError);
            return null;
          }

          // Get all active roles for this portfolio
          const { data: roles, error: rolesError } = await supabase
            .from('portfolio_roles')
            .select('role_name')
            .eq('portfolio_id', portfolioId)
            .eq('is_active', true);

          if (rolesError) {
            console.error('Error fetching roles:', rolesError);
            return null;
          }

          const roleData = {
            id: portfolio.id,
            client_name: portfolio.client_name,
            team_count: roles.length,
            admin_count: roles.filter(r => r.role_name === 'admin_partner').length,
            editor_count: roles.filter(r => r.role_name === 'editor').length,
            viewer_count: roles.filter(r => r.role_name === 'viewer').length,
            maintenance_count: roles.filter(r => r.role_name === 'maintenance').length,
          };

          return roleData;
        })
      );

      return portfolioData
        .filter((p): p is PortfolioWithRoles => p !== null)
        .sort((a, b) => a.client_name.localeCompare(b.client_name));
    },
    enabled: !!userId,
  });

  const getRoleBadge = (count: number, label: string, icon: React.ReactNode, colorClass: string) => {
    if (count === 0) return null;
    return (
      <Badge variant="secondary" className={`${colorClass} flex items-center gap-1`}>
        {icon}
        <span>{count} {label}</span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!portfolios || portfolios.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            You don't have access to any portfolios yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Portfolio Team Overview</h3>
          <p className="text-sm text-muted-foreground mt-1">
            View team members and roles across all your portfolios
          </p>
        </div>
        <Badge variant="outline" className="text-base px-4 py-2">
          {portfolios.length} {portfolios.length === 1 ? 'Portfolio' : 'Portfolios'}
        </Badge>
      </div>

      <div className="grid gap-4">
        {portfolios.map((portfolio) => (
          <Card key={portfolio.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{portfolio.client_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {portfolio.team_count} team {portfolio.team_count === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/portfolio/${portfolio.id}/settings?tab=team`)}
                  className="gap-2"
                >
                  Manage Team
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {getRoleBadge(
                  portfolio.admin_count,
                  portfolio.admin_count === 1 ? 'Admin' : 'Admins',
                  <Shield className="w-3 h-3" />,
                  'bg-red-100 text-red-700 border-red-200'
                )}
                {getRoleBadge(
                  portfolio.editor_count,
                  portfolio.editor_count === 1 ? 'Editor' : 'Editors',
                  <Edit className="w-3 h-3" />,
                  'bg-blue-100 text-blue-700 border-blue-200'
                )}
                {getRoleBadge(
                  portfolio.viewer_count,
                  portfolio.viewer_count === 1 ? 'Viewer' : 'Viewers',
                  <Eye className="w-3 h-3" />,
                  'bg-green-100 text-green-700 border-green-200'
                )}
                {getRoleBadge(
                  portfolio.maintenance_count,
                  portfolio.maintenance_count === 1 ? 'Maintenance' : 'Maintenance',
                  <Wrench className="w-3 h-3" />,
                  'bg-orange-100 text-orange-700 border-orange-200'
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
