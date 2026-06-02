import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, AlertCircle, MoreHorizontal, Edit3, RotateCcw, Eye, Copy } from 'lucide-react';
import { useImportStudio } from '@/stores/importStudioStore';
import type { ProcessingRowResult } from '@/types/propertyImport';
import { cn } from '@/lib/utils';
import { DuplicateGroupIndicator } from './enhanced/DuplicateGroupIndicator';
import { BulkOperationsToolbar } from './enhanced/BulkOperationsToolbar';

interface ProcessingDataGridProps {
  data: ProcessingRowResult[];
  onRowSelect?: (rowIndex: number) => void;
  onDataUpdate?: (newData: ProcessingRowResult[]) => void;
  onDuplicateResolve?: (groupId: string, action: 'merge' | 'separate', rowIndex?: number) => void;
  onSeparateDuplicate?: (groupId: string, rowIndex: number) => void;
  onMergeDuplicates?: (groupId: string, keepIndex: number, removeIndices: number[]) => void;
  onEditRow?: (rowIndex: number) => void;
  onReprocessRow?: (rowIndex: number) => void;
  onCopyAddress?: (address: string) => void;
  showHeader?: boolean;
  showBulkToolbar?: boolean;
}

type ExtendedRowResult = ProcessingRowResult & {
  index: number;
  aiConfidence?: number;
  isDuplicate?: boolean;
  duplicateGroup?: any;
  duplicateGroupId?: string;
};

export function ProcessingDataGrid({ 
  data, 
  onRowSelect, 
  onDataUpdate,
  onSeparateDuplicate,
  onMergeDuplicates,
  onEditRow,
  onReprocessRow,
  onCopyAddress,
  showHeader = true,
  showBulkToolbar = true
}: ProcessingDataGridProps) {
  const { 
    selectedRowIds, 
    toggleRowSelection, 
    rowFilter,
    activeStage 
  } = useImportStudio();

  const extendedData: ExtendedRowResult[] = useMemo(() => {
    return data.map((row, index) => {
      // Enhanced duplicate detection using row-level duplicate group ID
      const isDuplicate = !!row.duplicate_group_id;
      
      return {
        ...row,
        index,
        aiConfidence: row.processed_data?.ai_insights?.data_quality_assessment?.accuracy_score || 0,
        isDuplicate,
        duplicateGroupId: row.duplicate_group_id,
      };
    });
  }, [data]);

  const filteredData = useMemo(() => {
    return extendedData.filter(row => {
      switch (rowFilter) {
        case 'success':
          return row.status === 'success';
        case 'warning':
          return row.status === 'warning';
        case 'failed':
          return row.status === 'failed';
        case 'duplicates':
          return row.isDuplicate;
        default:
          return true;
      }
    });
  }, [extendedData, rowFilter]);

  const columns: ColumnDef<ExtendedRowResult>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedRowIds.has(row.original.index)}
          onCheckedChange={() => toggleRowSelection(row.original.index)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50,
    },
    {
      accessorKey: 'index',
      header: 'Row',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.index + 1}
        </div>
      ),
      size: 60,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const Icon = status === 'success' ? CheckCircle : 
                    status === 'warning' ? AlertTriangle : AlertCircle;
        const variant = status === 'success' ? 'default' : 
                      status === 'warning' ? 'secondary' : 'destructive';
        
        return (
          <Badge variant={variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {status}
          </Badge>
        );
      },
      size: 100,
    },
    {
      accessorKey: 'processed_data.full_address',
      header: 'Address',
      cell: ({ row }) => {
        const address = row.original.processed_data?.full_address || 
                       `${row.original.original_data?.street_address || ''} ${row.original.original_data?.city || ''}`.trim() || 'N/A';
        const unitInfo = row.original.original_data?.unit_number || row.original.original_data?.unit_type;
        
        return (
          <div className="max-w-[200px] text-sm" title={address}>
            <div className="truncate">{address}</div>
            {unitInfo && (
              <div className="text-xs text-muted-foreground truncate">
                Unit: {unitInfo}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'unit_info',
      header: 'Unit',
      cell: ({ row }) => {
        const unitNumber = row.original.original_data?.unit_number;
        const unitType = row.original.original_data?.unit_type;
        
        if (!unitNumber && !unitType) {
          return <div className="text-xs text-muted-foreground">—</div>;
        }
        
        return (
          <div className="text-sm">
            {unitNumber && (
              <Badge variant="outline" className="text-xs">
                {unitNumber}
              </Badge>
            )}
            {unitType && (
              <div className="text-xs text-muted-foreground mt-1">
                {unitType}
              </div>
            )}
          </div>
        );
      },
      size: 80,
    },
    {
      accessorKey: 'processed_data.property_type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.original_data?.property_type || 'N/A';
        return <div className="text-sm">{type}</div>;
      },
      size: 100,
    },
    {
      accessorKey: 'aiConfidence',
      header: 'AI Score',
      cell: ({ row }) => {
        const confidence = row.original.aiConfidence || 0;
        const percentage = Math.round(confidence * 100);
        const color = percentage >= 80 ? 'text-green-600' : 
                     percentage >= 60 ? 'text-yellow-600' : 'text-red-600';
        
        return (
          <div className={cn("text-sm font-medium", color)}>
            {percentage}%
          </div>
        );
      },
      size: 80,
    },
    {
      accessorKey: 'isDuplicate',
      header: 'Duplicate',
      cell: ({ row }) => {
        if (!row.original.isDuplicate) return null;
        
        return (
          <DuplicateGroupIndicator
            duplicateGroup={row.original.duplicateGroup}
            groupId={row.original.duplicateGroupId}
            confidence={row.original.duplicateGroup?.confidence_score}
            onSeparate={onSeparateDuplicate}
            onMerge={onMergeDuplicates}
            rowIndex={row.original.index}
          />
        );
      },
      size: 120,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const address = row.original.processed_data?.full_address || 
                       `${row.original.original_data?.street_address || ''} ${row.original.original_data?.city || ''}`.trim();
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onRowSelect?.(row.original.index)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {onEditRow && (
                <DropdownMenuItem onClick={() => onEditRow(row.original.index)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Row
                </DropdownMenuItem>
              )}
              {onReprocessRow && (
                <DropdownMenuItem onClick={() => onReprocessRow(row.original.index)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reprocess
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onCopyAddress && address && (
                <DropdownMenuItem onClick={() => onCopyAddress(address)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Address
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    },
  ], [selectedRowIds, toggleRowSelection, onRowSelect]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="h-full flex flex-col">
      {showHeader && (
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              Data Grid ({filteredData.length} rows)
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedRowIds.size} selected
            </div>
          </div>
          
          {showBulkToolbar && onDataUpdate && (
            <BulkOperationsToolbar
              data={data}
              onDataUpdate={onDataUpdate}
            />
          )}
        </div>
      )}
      
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={selectedRowIds.has(row.original.index) ? "selected" : undefined}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    selectedRowIds.has(row.original.index) && "bg-muted"
                  )}
                  onClick={() => onRowSelect?.(row.original.index)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}