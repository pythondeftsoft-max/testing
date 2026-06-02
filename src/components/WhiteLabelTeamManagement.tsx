import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserPlus, Settings, MoreHorizontal, Crown, Edit, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface WhiteLabelTeamManagementProps {
  configId: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  invited_at: string;
  joined_at?: string;
  is_active: boolean;
  permissions: Record<string, any>;
  // Profile info would need to be joined
  first_name?: string;
  last_name?: string;
  email?: string;
}

export function WhiteLabelTeamManagement({ configId }: WhiteLabelTeamManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');

  // Fetch team members
  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['whiteLabelTeamMembers', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_team_members')
        .select(`
          *,
          white_label_teams!inner(config_id)
        `)
        .eq('white_label_teams.config_id', configId)
        .eq('is_active', true);
      
      if (error) throw error;
      return data as TeamMember[];
    }
  });

  // Invite team member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      // First get or create team
      const { data: team, error: teamError } = await supabase
        .from('white_label_teams')
        .select('id')
        .eq('config_id', configId)
        .single();

      let teamId = team?.id;

      if (teamError && teamError.code === 'PGRST116') {
        // Create team if it doesn't exist
        const { data: newTeam, error: createError } = await supabase
          .from('white_label_teams')
          .insert({ config_id: configId, name: 'Main Team' })
          .select('id')
          .single();
        
        if (createError) throw createError;
        teamId = newTeam.id;
      } else if (teamError) {
        throw teamError;
      }

      // Create invitation
      const { data, error } = await supabase
        .from('white_label_team_members')
        .insert({
          team_id: teamId,
          user_id: 'placeholder', // Would need actual user lookup
          role,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
          is_active: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteLabelTeamMembers'] });
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteRole('viewer');
      toast({
        title: "Invitation sent",
        description: "Team member invitation has been sent successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to invite team member. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { data, error } = await supabase
        .from('white_label_team_members')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteLabelTeamMembers'] });
      toast({
        title: "Role updated",
        description: "Team member role has been updated successfully.",
      });
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('white_label_team_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteLabelTeamMembers'] });
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully.",
      });
    }
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />;
      case 'editor':
        return <Edit className="h-3 w-3" />;
      case 'viewer':
        return <Eye className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Management
        </CardTitle>
        <CardDescription>
          Manage team members and their access to your white-label configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">Team Members</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Team Members</h3>
                <p className="text-sm text-muted-foreground">
                  Invite and manage team members who can access this configuration
                </p>
              </div>
              <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to a new team member to collaborate on this white-label configuration.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={(value: 'editor' | 'viewer') => setInviteRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer - Can view configurations</SelectItem>
                          <SelectItem value="editor">Editor - Can edit configurations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={() => inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRole })}
                      disabled={!inviteEmail || inviteMemberMutation.isPending}
                      className="w-full"
                    >
                      {inviteMemberMutation.isPending ? "Sending..." : "Send Invitation"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading team members...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers?.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                          {getRoleIcon(member.role)}
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.joined_at ? "default" : "secondary"}>
                          {member.joined_at ? "Active" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.joined_at 
                          ? new Date(member.joined_at).toLocaleDateString()
                          : "Not joined"
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => updateRoleMutation.mutate({ 
                                memberId: member.id, 
                                role: member.role === 'editor' ? 'viewer' : 'editor' 
                              })}
                            >
                              Change to {member.role === 'editor' ? 'Viewer' : 'Editor'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => removeMemberMutation.mutate(member.id)}
                              className="text-destructive"
                            >
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Role Permissions</h3>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Crown className="h-4 w-4" />
                      Owner
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      <li>• Full access to all configuration settings</li>
                      <li>• Can invite and manage team members</li>
                      <li>• Can publish and unpublish sites</li>
                      <li>• Can delete the configuration</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Edit className="h-4 w-4" />
                      Editor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      <li>• Can edit branding and content settings</li>
                      <li>• Can manage SEO and marketing configurations</li>
                      <li>• Can customize themes and layouts</li>
                      <li>• Cannot manage team members or publish sites</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Eye className="h-4 w-4" />
                      Viewer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      <li>• Can view all configuration settings</li>
                      <li>• Can access analytics and reports</li>
                      <li>• Cannot make any changes</li>
                      <li>• Cannot invite team members</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}