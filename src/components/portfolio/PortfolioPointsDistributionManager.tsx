
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortfolioDistribution } from '@/hooks/usePortfolioDistribution';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PortfolioPointsDistributionManagerProps {
  portfolioId: string;
  currentUserId: string;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  role_name: string;
}

const PortfolioPointsDistributionManager = ({ portfolioId, currentUserId }: PortfolioPointsDistributionManagerProps) => {
  const [newDistribution, setNewDistribution] = useState({
    user_id: '',
    distribution_percent: '',
    role_tag: ''
  });

  const {
    distributions,
    remainingPercent,
    isComplete,
    totalAllocated,
    loading,
    createDistribution,
    updateDistribution,
    deleteDistribution
  } = usePortfolioDistribution(portfolioId);

  // Get portfolio team members
  const { data: teamMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['portfolio-team-members', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_roles')
        .select(`
          user_id,
          role_name,
          profiles!portfolio_roles_user_id_fkey(first_name, last_name)
        `)
        .eq('portfolio_id', portfolioId)
        .eq('is_active', true);

      if (error) throw error;

      return data?.map(item => ({
        id: item.user_id,
        first_name: item.profiles?.first_name || 'Unknown',
        last_name: item.profiles?.last_name || 'User',
        role_name: item.role_name
      })) as TeamMember[];
    },
    enabled: !!portfolioId,
  });

  const handleAddDistribution = async () => {
    if (!newDistribution.user_id || !newDistribution.distribution_percent) return;

    const percentage = parseFloat(newDistribution.distribution_percent);
    if (percentage <= 0 || percentage > remainingPercent!) return;

    await createDistribution.mutateAsync({
      portfolio_id: portfolioId,
      user_id: newDistribution.user_id,
      distribution_percent: percentage,
      role_tag: newDistribution.role_tag || undefined
    });

    setNewDistribution({ user_id: '', distribution_percent: '', role_tag: '' });
  };

  const handleUpdateDistribution = async (id: string, field: string, value: any) => {
    const distribution = distributions?.find(d => d.id === id);
    if (!distribution) return;

    await updateDistribution.mutateAsync({
      id,
      distribution_percent: field === 'distribution_percent' ? parseFloat(value) : distribution.distribution_percent,
      role_tag: field === 'role_tag' ? value : distribution.role_tag,
      active: field === 'active' ? value : distribution.active
    });
  };

  const handleDeleteDistribution = async (id: string) => {
    await deleteDistribution.mutateAsync(id);
  };

  const getSelectedMemberName = (userId: string) => {
    const member = teamMembers?.find(m => m.id === userId);
    return member ? `${member.first_name} ${member.last_name} (${member.role_name})` : 'Select team member';
  };

  if (loading || membersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Points Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading distribution settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Points Distribution Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure how portfolio points are distributed among team members. Total must equal 100%.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Distribution Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              {isComplete ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              )}
              <span className="font-medium">
                Distribution Status: {totalAllocated}% allocated
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Remaining: {remainingPercent}%
            </div>
          </div>

          {!isComplete && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Points distribution is incomplete. Total allocation must equal 100% to activate automatic point distribution.
              </AlertDescription>
            </Alert>
          )}

          {/* Current Distributions */}
          {distributions && distributions.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Current Distribution</h3>
              {distributions.map((dist) => {
                const member = teamMembers?.find(m => m.id === dist.user_id);
                return (
                  <div key={dist.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {member ? `${member.first_name} ${member.last_name}` : 'Unknown User'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {member?.role_name} {dist.role_tag && `• ${dist.role_tag}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={dist.distribution_percent}
                        onChange={(e) => handleUpdateDistribution(dist.id, 'distribution_percent', e.target.value)}
                        className="w-20"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="text-sm">%</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDistribution(dist.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add New Distribution */}
          {teamMembers && teamMembers.length > 0 && remainingPercent! > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Add New Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="team-member">Team Member</Label>
                  <Select
                    value={newDistribution.user_id}
                    onValueChange={(value) => setNewDistribution(prev => ({ ...prev, user_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers
                        .filter(member => !distributions?.some(d => d.user_id === member.id && d.active))
                        .map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name} {member.last_name} ({member.role_name})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentage">Percentage</Label>
                  <Input
                    id="percentage"
                    type="number"
                    value={newDistribution.distribution_percent}
                    onChange={(e) => setNewDistribution(prev => ({ ...prev, distribution_percent: e.target.value }))}
                    placeholder="0.0"
                    min="0"
                    max={remainingPercent}
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-tag">Role Tag (Optional)</Label>
                  <Input
                    id="role-tag"
                    value={newDistribution.role_tag}
                    onChange={(e) => setNewDistribution(prev => ({ ...prev, role_tag: e.target.value }))}
                    placeholder="e.g., Lead Manager"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleAddDistribution}
                    disabled={!newDistribution.user_id || !newDistribution.distribution_percent || createDistribution.isPending}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {teamMembers && teamMembers.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No team members available. Add team members to the portfolio first before setting up points distribution.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioPointsDistributionManager;
