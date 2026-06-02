
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building, UserPlus, UserMinus, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useGlobalRoles } from '@/hooks/useGlobalRoles';

const GlobalPortfolioOverview: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPortfolios, setExpandedPortfolios] = useState<Set<string>>(new Set());
  const [newRoleData, setNewRoleData] = useState<{
    portfolioId: string;
    userId: string;
    role: 'admin_partner' | 'editor' | 'viewer' | 'maintenance' | '';
  }>({ portfolioId: '', userId: '', role: '' });

  const { 
    useAllPortfoliosWithRoles, 
    useAdminGrantPortfolioRole, 
    useAdminRevokePortfolioRole 
  } = useGlobalRoles();
  
  const { data: portfolios, isLoading } = useAllPortfoliosWithRoles();
  const grantRoleMutation = useAdminGrantPortfolioRole();
  const revokeRoleMutation = useAdminRevokePortfolioRole();

  const handleGrantPortfolioRole = async () => {
    if (!newRoleData.portfolioId || !newRoleData.userId || !newRoleData.role) return;
    
    await grantRoleMutation.mutateAsync({
      portfolioId: newRoleData.portfolioId,
      targetUserId: newRoleData.userId,
      role: newRoleData.role
    });
    
    setNewRoleData({ portfolioId: '', userId: '', role: '' });
  };

  const handleRevokePortfolioRole = async (portfolioRoleId: string) => {
    await revokeRoleMutation.mutateAsync({ portfolioRoleId });
  };

  const togglePortfolioExpansion = (portfolioId: string) => {
    const newExpanded = new Set(expandedPortfolios);
    if (newExpanded.has(portfolioId)) {
      newExpanded.delete(portfolioId);
    } else {
      newExpanded.add(portfolioId);
    }
    setExpandedPortfolios(newExpanded);
  };

  const filteredPortfolios = portfolios?.filter(portfolio => 
    portfolio.portfolio_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    portfolio.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    portfolio.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading portfolios...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Global Portfolio Roles Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Control */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search portfolios, owners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Grant Portfolio Role Section */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Portfolio</label>
                  <Select 
                    value={newRoleData.portfolioId} 
                    onValueChange={(value) => setNewRoleData({...newRoleData, portfolioId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios?.map((portfolio) => (
                        <SelectItem key={portfolio.portfolio_id} value={portfolio.portfolio_id}>
                          {portfolio.portfolio_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">User ID</label>
                  <Input
                    placeholder="Enter user UUID"
                    value={newRoleData.userId}
                    onChange={(e) => setNewRoleData({...newRoleData, userId: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Select 
                    value={newRoleData.role} 
                    onValueChange={(value: 'admin_partner' | 'editor' | 'viewer' | 'maintenance') => setNewRoleData({...newRoleData, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin_partner">Admin Partner</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleGrantPortfolioRole}
                    disabled={!newRoleData.portfolioId || !newRoleData.userId || !newRoleData.role || grantRoleMutation.isPending}
                    className="w-full"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Grant Role
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Portfolios List */}
          <div className="space-y-4">
            {filteredPortfolios.map((portfolio) => (
              <Card key={portfolio.portfolio_id}>
                <Collapsible 
                  open={expandedPortfolios.has(portfolio.portfolio_id)}
                  onOpenChange={() => togglePortfolioExpansion(portfolio.portfolio_id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {expandedPortfolios.has(portfolio.portfolio_id) ? 
                            <ChevronDown className="w-4 h-4" /> : 
                            <ChevronRight className="w-4 h-4" />
                          }
                          <div>
                            <CardTitle className="text-lg">{portfolio.portfolio_name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Owner: {portfolio.owner_name} ({portfolio.owner_email})
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <Badge variant="outline">{portfolio.property_count} Properties</Badge>
                          <Badge variant="outline">{portfolio.role_count} Roles</Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent>
                      {portfolio.roles && portfolio.roles.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Added</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {portfolio.roles.map((role) => (
                              <TableRow key={role.portfolio_role_id}>
                                <TableCell className="font-medium">{role.user_name}</TableCell>
                                <TableCell>{role.user_email}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{role.role_name}</Badge>
                                </TableCell>
                                <TableCell>
                                  {new Date(role.updated_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={role.is_active ? "default" : "secondary"}>
                                    {role.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {role.is_active && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleRevokePortfolioRole(role.portfolio_role_id)}
                                      disabled={revokeRoleMutation.isPending}
                                    >
                                      <UserMinus className="w-4 h-4 mr-1" />
                                      Revoke
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          No roles assigned to this portfolio.
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>

          {filteredPortfolios.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No portfolios found matching your search criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalPortfolioOverview;
