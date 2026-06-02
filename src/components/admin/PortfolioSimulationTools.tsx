import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Play, User, Building, CheckCircle2, XCircle, AlertTriangle, Eye, Edit, Plus, Trash2 } from 'lucide-react';
import { useAdminRbac } from '@/hooks/useAdminRbac';
import { useToast } from '@/hooks/use-toast';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import { useGlobalRoles } from '@/hooks/useGlobalRoles';

interface SimulationRequest {
  userId: string;
  portfolioId: string;
  objectName: string;
  action: 'view' | 'edit' | 'create' | 'delete';
}

interface SimulationResult {
  allowed: boolean;
  reason: string;
  effectiveRole?: string;
  appliedPermissions?: string[];
}

const PortfolioSimulationTools: React.FC = () => {
  const [simulationRequest, setSimulationRequest] = useState<SimulationRequest>({
    userId: '',
    portfolioId: '',
    objectName: '',
    action: 'view'
  });
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const { simulateUserPermissions } = useAdminRbac();
  const { toast } = useToast();
  
  const { useAllPortfoliosWithRoles } = useGlobalRoles();
  const { data: portfoliosData } = useAllPortfoliosWithRoles();

  // Mock permission objects
  const permissionObjects = [
    'properties',
    'tenants',
    'financial_reports',
    'maintenance_requests',
    'portfolio_settings',
    'lease_agreements',
    'payment_processing'
  ];

  const runPermissionSimulation = async () => {
    if (!simulationRequest.userId || !simulationRequest.portfolioId || !simulationRequest.objectName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSimulating(true);
    
    try {
      // Call real simulation API
      const result = await simulateUserPermissions.mutateAsync({
        userId: simulationRequest.userId,
        portfolioId: simulationRequest.portfolioId,
        permissionChecks: [{
          object: simulationRequest.objectName,
          action: simulationRequest.action,
        }]
      });

      const permissionKey = `${simulationRequest.objectName}_${simulationRequest.action}`;
      const allowed = result.results[permissionKey] || false;

      const simulationResult: SimulationResult = {
        allowed,
        reason: allowed 
          ? `User has sufficient permissions for ${simulationRequest.action} on ${simulationRequest.objectName}`
          : `User lacks required permissions for ${simulationRequest.action} on ${simulationRequest.objectName}`,
        effectiveRole: 'Determined by RBAC system',
        appliedPermissions: allowed ? [`can_${simulationRequest.action}_${simulationRequest.objectName}`] : []
      };

      setSimulationResult(simulationResult);

      toast({
        title: "Simulation Complete",
        description: `Permission check completed for ${simulationRequest.action} on ${simulationRequest.objectName}`,
      });
    } catch (error) {
      console.error('Simulation error:', error);
      toast({
        title: "Simulation Failed",
        description: "Unable to run permission simulation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'view': return <Eye className="w-4 h-4" />;
      case 'edit': return <Edit className="w-4 h-4" />;
      case 'create': return <Plus className="w-4 h-4" />;
      case 'delete': return <Trash2 className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const getResultIcon = (allowed: boolean) => {
    return allowed ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <PermissionGuard 
      object="admin.simulation_tools" 
      action="view" 
      scope="account"
      showDeniedMessage
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Portfolio Access Simulation Tools
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Test and validate user permissions before making changes
            </p>
          </CardHeader>
        <CardContent className="space-y-6">
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Permission Simulation</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Test if a specific user can perform an action on a portfolio object
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">User ID</label>
                      <Input
                        placeholder="Enter user UUID or email"
                        value={simulationRequest.userId}
                        onChange={(e) => setSimulationRequest({
                          ...simulationRequest,
                          userId: e.target.value
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Portfolio</label>
                      <Select 
                        value={simulationRequest.portfolioId}
                        onValueChange={(value) => setSimulationRequest({
                          ...simulationRequest,
                          portfolioId: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select portfolio" />
                        </SelectTrigger>
                        <SelectContent>
                          {(portfoliosData || []).map((portfolio) => (
                            <SelectItem key={portfolio.portfolio_id} value={portfolio.portfolio_id}>
                              {portfolio.portfolio_name || 'Unnamed Portfolio'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Object</label>
                      <Select 
                        value={simulationRequest.objectName}
                        onValueChange={(value) => setSimulationRequest({
                          ...simulationRequest,
                          objectName: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select object" />
                        </SelectTrigger>
                        <SelectContent>
                          {permissionObjects.map((object) => (
                            <SelectItem key={object} value={object}>
                              {object.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Action</label>
                      <Select 
                        value={simulationRequest.action}
                        onValueChange={(value: 'view' | 'edit' | 'create' | 'delete') => 
                          setSimulationRequest({
                            ...simulationRequest,
                            action: value
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              View
                            </div>
                          </SelectItem>
                          <SelectItem value="edit">
                            <div className="flex items-center gap-2">
                              <Edit className="w-4 h-4" />
                              Edit
                            </div>
                          </SelectItem>
                          <SelectItem value="create">
                            <div className="flex items-center gap-2">
                              <Plus className="w-4 h-4" />
                              Create
                            </div>
                          </SelectItem>
                          <SelectItem value="delete">
                            <div className="flex items-center gap-2">
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={runPermissionSimulation}
                    disabled={isSimulating || !simulationRequest.userId || !simulationRequest.portfolioId || !simulationRequest.objectName}
                    className="w-full"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isSimulating ? 'Running Simulation...' : 'Run Permission Check'}
                  </Button>
                </CardContent>
              </Card>

              {/* Simulation Results */}
              {simulationResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getResultIcon(simulationResult.allowed)}
                      Simulation Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert className={simulationResult.allowed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{simulationResult.allowed ? 'ACCESS GRANTED' : 'ACCESS DENIED'}</strong>
                        <br />
                        {simulationResult.reason}
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">User ID</label>
                        <p className="font-mono text-sm">{simulationRequest.userId}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Effective Role</label>
                        <Badge variant="outline">
                          {simulationResult.effectiveRole || 'No Role'}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Action Attempted</label>
                        <div className="flex items-center gap-2">
                          {getActionIcon(simulationRequest.action)}
                          <span className="capitalize">{simulationRequest.action}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Object</label>
                        <Badge variant="secondary">
                          {simulationRequest.objectName.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    {simulationResult.appliedPermissions && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Applied Permissions</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {simulationResult.appliedPermissions.map((permission, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
        </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
};

export default PortfolioSimulationTools;