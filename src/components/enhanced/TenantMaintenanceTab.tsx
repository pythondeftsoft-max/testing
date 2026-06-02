
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Wrench, 
  Plus, 
  Calendar, 
  DollarSign, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { EnhancedTenantProfileData } from '@/hooks/useEnhancedTenantProfile';

interface TenantMaintenanceTabProps {
  tenantData: EnhancedTenantProfileData;
}

export const TenantMaintenanceTab = ({ tenantData }: TenantMaintenanceTabProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const openRequests = tenantData.maintenanceRequests.filter(r => r.status !== 'completed').length;
  const completedRequests = tenantData.maintenanceRequests.filter(r => r.status === 'completed').length;
  const totalCost = tenantData.maintenanceRequests.reduce((sum, r) => sum + (r.actualCost || r.estimatedCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Maintenance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {openRequests}
            </div>
            <div className="text-sm text-gray-600">Open Requests</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {completedRequests}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {tenantData.maintenanceRequests.length}
            </div>
            <div className="text-sm text-gray-600">Total Requests</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              ${totalCost.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Cost</div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Maintenance Requests
            </span>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Request
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenantData.maintenanceRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No maintenance requests</h3>
              <p className="text-sm">This tenant hasn't submitted any maintenance requests yet.</p>
              <Button className="mt-4" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Request
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {tenantData.maintenanceRequests.map((request) => (
                  <div key={request.id} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{request.title}</h4>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.category && (
                          <span className="capitalize">{request.category}</span>
                        )}
                      </div>
                    </div>
                    
                    {request.description && (
                      <p className="text-gray-700 text-sm mb-3">
                        {request.description}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {request.completedAt && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <span className="text-gray-600">Completed:</span>
                          <span className="font-medium">
                            {new Date(request.completedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      
                      {request.estimatedCost && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">Est. Cost:</span>
                          <span className="font-medium">
                            ${request.estimatedCost.toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      {request.actualCost && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">Actual:</span>
                          <span className="font-medium">
                            ${request.actualCost.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {request.status !== 'completed' && (
                      <div className="mt-3 pt-3 border-t flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>
                            Open for {Math.ceil((Date.now() - new Date(request.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                        <Button size="sm" variant="outline">
                          Update Status
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
