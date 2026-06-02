
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, User, Wrench, DollarSign, Receipt, Search, Filter, Edit, Trash2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { MaintenanceCost, useMaintenanceCosts } from '@/hooks/useMaintenanceCosts';
import { formatCurrency } from '@/lib/formatters';
import CostDetailsDialog from './CostDetailsDialog';

interface CostListTableProps {
  costs: MaintenanceCost[];
}

const CostListTable = ({ costs }: CostListTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCost, setSelectedCost] = useState<MaintenanceCost | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { approveCost, deleteCost } = useMaintenanceCosts();

  // Filter costs based on search and filters
  const filteredCosts = costs.filter(cost => {
    const matchesSearch = cost.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || cost.cost_type === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'approved' && cost.approved_at) ||
      (filterStatus === 'pending' && !cost.approved_at);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getCostTypeIcon = (type: string) => {
    switch (type) {
      case 'labor': return <User className="h-4 w-4" />;
      case 'materials': return <Wrench className="h-4 w-4" />;
      case 'equipment': return <Wrench className="h-4 w-4" />;
      case 'permits': return <Receipt className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (cost: MaintenanceCost) => {
    if (cost.approved_at) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
    }
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
  };

  const handleEditCost = (cost: MaintenanceCost) => {
    setSelectedCost(cost);
    setShowDetailsDialog(true);
  };

  const handleApproveCost = async (costId: string) => {
    try {
      await approveCost.mutateAsync(costId);
    } catch (error) {
      console.error('Error approving cost:', error);
    }
  };

  const handleDeleteCost = async (costId: string) => {
    if (window.confirm('Are you sure you want to delete this cost entry?')) {
      try {
        await deleteCost.mutateAsync(costId);
      } catch (error) {
        console.error('Error deleting cost:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search costs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="materials">Materials</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="permits">Permits</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Costs Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Maintenance Costs ({filteredCosts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCosts.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No costs found matching your filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(cost.created_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{cost.description}</div>
                      {cost.receipt_url && (
                        <div className="text-sm text-gray-600">
                          <a href={cost.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            View Receipt
                          </a>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getCostTypeIcon(cost.cost_type)}
                        <span className="capitalize">{cost.cost_type.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>{cost.quantity}</TableCell>
                    <TableCell>{formatCurrency(cost.unit_cost)}</TableCell>
                    <TableCell>
                      <div className="font-semibold">{formatCurrency(cost.total_cost)}</div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(cost)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCost(cost)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!cost.approved_at && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApproveCost(cost.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCost(cost.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedCost && (
        <CostDetailsDialog
          cost={selectedCost}
          isOpen={showDetailsDialog}
          onClose={() => {
            setShowDetailsDialog(false);
            setSelectedCost(null);
          }}
        />
      )}
    </div>
  );
};

export default CostListTable;
