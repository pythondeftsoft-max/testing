
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, UserPlus, Shield, Building2, Users, AlertTriangle } from 'lucide-react';
import { useGlobalRoles, GlobalPortfolio } from '@/hooks/useGlobalRoles';
import { useToast } from '@/hooks/use-toast';
import { AdminPortfolioAccessDialog } from './AdminPortfolioAccessDialog';

const PortfolioAccessManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterPortfolioId, setFilterPortfolioId] = useState<string>('all');
  const [filterOwnerId, setFilterOwnerId] = useState<string>('all');
  const [selectedPortfolio, setSelectedPortfolio] = useState<GlobalPortfolio | null>(null);
  const [newRoleEmail, setNewRoleEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin_partner' | 'editor' | 'viewer' | 'maintenance'>('viewer');
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);

  const { toast } = useToast();
  const {
    useAllPortfoliosWithRoles,
    useAdminGrantPortfolioRole,
    useAdminRevokePortfolioRole,
  } = useGlobalRoles();

  const { data: portfolios = [], isLoading, error } = useAllPortfoliosWithRoles();
  const grantRoleMutation = useAdminGrantPortfolioRole();
  const revokeRoleMutation = useAdminRevokePortfolioRole();

  const handleGrantRole = async () => {
    if (!selectedPortfolio || !newRoleEmail || !newRole) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      // This functionality is now handled by AdminPortfolioAccessDialog
      toast({
        title: "Use Manage Access",
        description: "Please use the Manage Access button for detailed portfolio management.",
      });
      setIsGrantDialogOpen(false);
    } catch (error) {
      console.error('Error granting portfolio role:', error);
    }
  };

  const handleManageAccess = (portfolio: GlobalPortfolio) => {
    setSelectedPortfolio(portfolio);
    setIsAccessDialogOpen(true);
  };

  const handleRevokeRole = async (portfolioRoleId: string) => {
    try {
      await revokeRoleMutation.mutateAsync({ portfolioRoleId });
    } catch (error) {
      console.error('Error revoking portfolio role:', error);
    }
  };

  // Get unique portfolios and owners for dropdowns
  const uniquePortfolios = Array.from(new Set(portfolios.map(p => p.portfolio_id)))
    .map(id => portfolios.find(p => p.portfolio_id === id)!)
    .filter(Boolean);
  
  const uniqueOwners = Array.from(new Set(portfolios.map(p => p.owner_email)))
    .map(email => portfolios.find(p => p.owner_email === email)!)
    .filter(Boolean);

  const filteredPortfolios = portfolios.filter(portfolio => {
    const matchesSearch = portfolio.portfolio_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         portfolio.owner_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPortfolio = filterPortfolioId === 'all' || portfolio.portfolio_id === filterPortfolioId;
    const matchesOwner = filterOwnerId === 'all' || portfolio.owner_email === filterOwnerId;
    
    let matchesRole = true;
    if (filterRole !== 'all') {
      matchesRole = portfolio.roles?.some((role: any) => 
        role.role_name === filterRole && role.is_active
      ) || false;
    }
    
    return matchesSearch && matchesPortfolio && matchesOwner && matchesRole;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Portfolio Access Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading portfolios...</div>
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
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Portfolio Access Management - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-destructive">Error loading portfolios: {error.message}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Portfolio Access Management
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage user access and roles across all portfolios
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search portfolios or owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterPortfolioId} onValueChange={setFilterPortfolioId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by portfolio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Portfolios</SelectItem>
              {uniquePortfolios.map((portfolio) => (
                <SelectItem key={portfolio.portfolio_id} value={portfolio.portfolio_id}>
                  {portfolio.portfolio_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterOwnerId} onValueChange={setFilterOwnerId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {uniqueOwners.map((owner) => (
                <SelectItem key={owner.owner_email} value={owner.owner_email}>
                  {owner.owner_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin_partner">Admin Partner</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Grant Access
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Grant Portfolio Access</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="portfolio">Portfolio</Label>
                  <Select 
                    value={selectedPortfolio?.portfolio_id || ''} 
                    onValueChange={(value) => {
                      const portfolio = portfolios.find(p => p.portfolio_id === value);
                      setSelectedPortfolio(portfolio || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios.map((portfolio) => (
                        <SelectItem key={portfolio.portfolio_id} value={portfolio.portfolio_id}>
                          {portfolio.portfolio_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="email">User Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newRoleEmail}
                    onChange={(e) => setNewRoleEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newRole} onValueChange={(value: any) => setNewRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin_partner">Admin Partner</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleGrantRole} disabled={grantRoleMutation.isPending}>
                  {grantRoleMutation.isPending ? 'Granting...' : 'Grant Access'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Results Summary */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Total Portfolios: {portfolios.length}</span>
          <span>Filtered Results: {filteredPortfolios.length}</span>
        </div>

        {/* Portfolios Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Portfolio</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Team Members</TableHead>
                <TableHead>Recent Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPortfolios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm || filterRole !== 'all' || filterPortfolioId !== 'all' || filterOwnerId !== 'all'
                      ? 'No portfolios match your filters' 
                      : 'No portfolios found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPortfolios.map((portfolio) => (
                  <TableRow key={portfolio.portfolio_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{portfolio.portfolio_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Created {new Date(portfolio.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{portfolio.owner_name}</div>
                        <div className="text-sm text-muted-foreground">{portfolio.owner_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {portfolio.property_count} properties
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{portfolio.role_count} members</span>
                      </div>
                      {portfolio.roles && portfolio.roles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {portfolio.roles.slice(0, 3).map((role: any, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {role.role_name}
                            </Badge>
                          ))}
                          {portfolio.roles.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{portfolio.roles.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        Last updated {new Date(portfolio.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManageAccess(portfolio)}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Manage Access
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Portfolio Access Management Dialog */}
        <AdminPortfolioAccessDialog
          portfolio={selectedPortfolio}
          open={isAccessDialogOpen}
          onOpenChange={setIsAccessDialogOpen}
        />
      </CardContent>
    </Card>
  );
};

export default PortfolioAccessManager;
