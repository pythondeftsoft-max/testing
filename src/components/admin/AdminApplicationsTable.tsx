
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { User, Calendar, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import ReassignUnitDialog from './ReassignUnitDialog';

interface AdminApplicationData {
  id: string;
  property_id: string;
  unit_id: string | null;
  tenant_id: string;
  status: string;
  priority_payment_made: boolean;
  priority_payment_amount: number | null;
  created_at: string;
  updated_at: string;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_phone: string | null;
  unit_number: string | null;
  unit_name: string | null;
}

interface AdminApplicationsTableProps {
  applications: AdminApplicationData[];
  onStatusUpdate: (applicationId: string, newStatus: string, reason?: string) => Promise<boolean>;
  onBulkStatusUpdate: (applicationIds: string[], newStatus: string, reason?: string) => Promise<number>;
  onReassignUnit: (applicationId: string, unitId: string, reason?: string) => Promise<boolean>;
  loading?: boolean;
}

const AdminApplicationsTable = ({
  applications,
  onStatusUpdate,
  onBulkStatusUpdate,
  onReassignUnit,
  loading = false
}: AdminApplicationsTableProps) => {
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ status: string; reason: string } | null>(null);
  const [reassignDialog, setReassignDialog] = useState<{
    open: boolean;
    applicationId: string | null;
    propertyId: string;
    currentUnitNumber?: string | null;
    tenantName?: string;
  }>({
    open: false,
    applicationId: null,
    propertyId: '',
    currentUnitNumber: null,
    tenantName: undefined
  });

  const getStatusBadge = (status: string, priorityPayment: boolean) => {
    const statusConfig = {
      approved: { 
        variant: 'default' as const, 
        label: 'Approved', 
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800 border-green-300'
      },
      denied: { 
        variant: 'destructive' as const, 
        label: 'Denied', 
        icon: XCircle,
        className: 'bg-red-100 text-red-800 border-red-300'
      },
      pending: { 
        variant: 'secondary' as const, 
        label: 'Pending', 
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      },
      under_review: { 
        variant: 'outline' as const, 
        label: 'Under Review', 
        icon: AlertCircle,
        className: 'bg-blue-100 text-blue-800 border-blue-300'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className={`text-xs shadow-sm flex items-center gap-1 ${config.className}`}>
          <IconComponent className="h-3 w-3" />
          {config.label}
        </Badge>
        {priorityPayment && (
          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
            Priority
          </Badge>
        )}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedApplications(new Set(applications.map(app => app.id)));
    } else {
      setSelectedApplications(new Set());
    }
  };

  const handleSelectApplication = (applicationId: string, checked: boolean) => {
    const newSelected = new Set(selectedApplications);
    if (checked) {
      newSelected.add(applicationId);
    } else {
      newSelected.delete(applicationId);
    }
    setSelectedApplications(newSelected);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedApplications.size === 0) return;
    
    const result = await onBulkStatusUpdate(
      Array.from(selectedApplications), 
      bulkAction.status, 
      bulkAction.reason
    );
    
    if (result > 0) {
      setSelectedApplications(new Set());
      setBulkAction(null);
    }
  };

  const handleSingleStatusUpdate = async (applicationId: string, newStatus: string) => {
    const success = await onStatusUpdate(applicationId, newStatus);
    if (success) {
      // Remove from selected if it was selected
      const newSelected = new Set(selectedApplications);
      newSelected.delete(applicationId);
      setSelectedApplications(newSelected);
    }
  };

  const handleReassignClick = (application: AdminApplicationData) => {
    setReassignDialog({
      open: true,
      applicationId: application.id,
      propertyId: application.property_id,
      currentUnitNumber: application.unit_number,
      tenantName: `${application.tenant_first_name || ''} ${application.tenant_last_name || ''}`.trim()
    });
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedApplications.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">
              {selectedApplications.size} application(s) selected
            </span>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Action
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Status Update</DialogTitle>
                  <DialogDescription>
                    Update the status of {selectedApplications.size} selected application(s)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">New Status</label>
                    <Select 
                      value={bulkAction?.status || ''} 
                      onValueChange={(status) => setBulkAction(prev => ({ ...prev, status, reason: prev?.reason || '' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="denied">Denied</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Reason (optional)</label>
                    <Textarea
                      placeholder="Enter reason for status change..."
                      value={bulkAction?.reason || ''}
                      onChange={(e) => setBulkAction(prev => ({ ...prev, status: prev?.status || '', reason: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleBulkAction} disabled={!bulkAction?.status || loading}>
                      Update Applications
                    </Button>
                    <Button variant="outline" onClick={() => setBulkAction(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Applications Table */}
      <div className="rounded-lg border border-amber-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-50 hover:to-orange-50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedApplications.size === applications.length && applications.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-amber-800">Tenant</TableHead>
              <TableHead className="font-semibold text-amber-800">Unit</TableHead>
              <TableHead className="font-semibold text-amber-800">Applied</TableHead>
              <TableHead className="font-semibold text-amber-800">Status</TableHead>
              <TableHead className="font-semibold text-amber-800">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.id} className="hover:bg-amber-50/50 transition-colors">
                <TableCell>
                  <Checkbox
                    checked={selectedApplications.has(application.id)}
                    onCheckedChange={(checked) => handleSelectApplication(application.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {application.tenant_first_name} {application.tenant_last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {application.tenant_phone}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {application.unit_number ? (
                      <Badge variant="outline" className="text-amber-700 border-amber-300">
                        Unit {application.unit_number}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">No unit assigned</span>
                    )}
                    {application.unit_name && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {application.unit_name}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDate(application.created_at)}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(application.status, application.priority_payment_made)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={application.status}
                      onValueChange={(newStatus) => handleSingleStatusUpdate(application.id, newStatus)}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="denied">Denied</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReassignClick(application)}
                      disabled={loading}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Reassign
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {applications.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No applications found for this property.</p>
        </div>
      )}

      {/* Reassign Unit Dialog */}
      <ReassignUnitDialog
        open={reassignDialog.open}
        onOpenChange={(open) => setReassignDialog(prev => ({ ...prev, open }))}
        applicationId={reassignDialog.applicationId}
        propertyId={reassignDialog.propertyId}
        currentUnitNumber={reassignDialog.currentUnitNumber}
        tenantName={reassignDialog.tenantName}
        onReassign={onReassignUnit}
      />
    </div>
  );
};

export default AdminApplicationsTable;
