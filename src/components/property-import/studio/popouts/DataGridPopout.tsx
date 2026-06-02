import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Search, Filter, Download, RefreshCw } from 'lucide-react';
import { ProcessingDataGrid } from '../ProcessingDataGrid';
import { BulkOperationsToolbar } from '../enhanced/BulkOperationsToolbar';
import { useImportStudio } from '@/stores/importStudioStore';
import type { ProcessingRowResult } from '@/types/propertyImport';
import { useState } from 'react';

interface DataGridPopoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ProcessingRowResult[];
  onRowSelect?: (rowIndex: number) => void;
  onDataUpdate?: (newData: ProcessingRowResult[]) => void;
  onDuplicateResolve?: (groupId: string, action: 'merge' | 'separate', rowIndex?: number) => void;
}

export function DataGridPopout({ 
  open, 
  onOpenChange, 
  data, 
  onRowSelect, 
  onDataUpdate,
  onDuplicateResolve 
}: DataGridPopoutProps) {
  const { rowFilter, setRowFilter, selectedRowIds } = useImportStudio();
  const [searchTerm, setSearchTerm] = useState('');

  const getFilterCounts = () => {
    const counts = {
      all: data.length,
      success: data.filter(r => r.status === 'success').length,
      warning: data.filter(r => r.status === 'warning').length,
      failed: data.filter(r => r.status === 'failed').length,
      duplicates: data.filter(r => r.duplicate_group_id).length,
    };
    return counts;
  };

  const counts = getFilterCounts();

  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting data...', { filter: rowFilter, search: searchTerm });
  };

  const handleRefresh = () => {
    // Implement refresh functionality
    console.log('Refreshing data...');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Data Grid ({data.length} rows)</DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4">
          {/* Enhanced Toolbar */}
          <div className="space-y-4 border-b pb-4">
            {/* Top Row - Search and Actions */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search addresses, property types, or any field..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={rowFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRowFilter('all')}
                >
                  All <Badge variant="secondary" className="ml-2">{counts.all}</Badge>
                </Button>
                <Button
                  variant={rowFilter === 'success' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRowFilter('success')}
                >
                  Success <Badge variant="secondary" className="ml-2">{counts.success}</Badge>
                </Button>
                <Button
                  variant={rowFilter === 'warning' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRowFilter('warning')}
                >
                  Warning <Badge variant="secondary" className="ml-2">{counts.warning}</Badge>
                </Button>
                <Button
                  variant={rowFilter === 'failed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRowFilter('failed')}
                >
                  Failed <Badge variant="secondary" className="ml-2">{counts.failed}</Badge>
                </Button>
                <Button
                  variant={rowFilter === 'duplicates' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRowFilter('duplicates')}
                >
                  Duplicates <Badge variant="secondary" className="ml-2">{counts.duplicates}</Badge>
                </Button>
              </div>
              {selectedRowIds.size > 0 && (
                <div className="ml-auto">
                  <Badge variant="outline">
                    {selectedRowIds.size} selected
                  </Badge>
                </div>
              )}
            </div>

            {/* Bulk Operations Toolbar */}
            {onDataUpdate && selectedRowIds.size > 0 && (
              <BulkOperationsToolbar
                data={data}
                onDataUpdate={onDataUpdate}
              />
            )}
          </div>

          {/* Data Grid */}
          <div className="h-[calc(90vh-220px)] overflow-hidden">
            <ProcessingDataGrid
              data={data}
              onRowSelect={onRowSelect}
              onDataUpdate={onDataUpdate}
              onDuplicateResolve={onDuplicateResolve}
              showHeader={false}
              showBulkToolbar={false}
            />
          </div>

          {/* Footer Statistics */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Total Rows: {data.length}</span>
                <span>Success: {counts.success}</span>
                <span>Warnings: {counts.warning}</span>
                <span>Failed: {counts.failed}</span>
                {counts.duplicates > 0 && <span>Duplicates: {counts.duplicates}</span>}
              </div>
              <div>
                Quality Score: {Math.round((counts.success / data.length) * 100)}%
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}