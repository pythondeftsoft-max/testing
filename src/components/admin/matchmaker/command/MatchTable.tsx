import { useState } from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Flame, 
  Check, 
  X, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Car,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { CommandMatch } from '@/hooks/useMatchCommandCenter';

interface MatchTableProps {
  matches: CommandMatch[];
  isLoading: boolean;
  onRowClick: (match: CommandMatch) => void;
  onApprove: (match: CommandMatch) => void;
  onReject: (match: CommandMatch) => void;
}

const TierIndicator = ({ tier }: { tier: string }) => {
  if (tier === 'hot_match') {
    return <Flame className="w-4 h-4 text-orange-500" />;
  }
  return <span className="w-4 h-4" />;
};

const ScoreBadge = ({ score }: { score: number }) => {
  const variant = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'neutral';
  return (
    <Badge variant={variant} className="font-mono text-xs px-2">
      {score}
    </Badge>
  );
};

const CriteriaIndicator = ({ met, partial }: { met: boolean; partial?: boolean }) => {
  if (met) return <Check className="w-4 h-4 text-green-500" />;
  if (partial) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  return <X className="w-4 h-4 text-red-400" />;
};

const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
    new: 'default',
    review: 'warning',
    pushed: 'secondary',
    approved: 'success',
    rejected: 'destructive',
  };
  return (
    <Badge variant={variants[status] || 'secondary'} className="text-xs capitalize">
      {status}
    </Badge>
  );
};

export const MatchTable = ({
  matches,
  isLoading,
  onRowClick,
  onApprove,
  onReject,
}: MatchTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'score', desc: true }]);

  const columns: ColumnDef<CommandMatch>[] = [
    {
      id: 'tier',
      header: '',
      size: 40,
      cell: ({ row }) => <TierIndicator tier={row.original.tier} />,
    },
    {
      id: 'score',
      header: 'Score',
      accessorKey: 'score',
      size: 60,
      cell: ({ row }) => <ScoreBadge score={row.original.score} />,
    },
    {
      id: 'tenant',
      header: 'Tenant',
      size: 180,
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{m.tenant_name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {m.tenant_budget ? formatCurrency(m.tenant_budget) : 'No budget'}
              {m.tenant_voucher && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">HCV</Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'property',
      header: 'Property',
      size: 200,
      cell: ({ row }) => {
        const m = row.original;
        const addr = m.property_unit_number 
          ? `${m.property_address} #${m.property_unit_number}`
          : m.property_address;
        return (
          <div className="min-w-0">
            <div className="font-medium text-sm truncate" title={addr}>{addr}</div>
            <div className="text-xs text-muted-foreground">
              {m.property_rent ? formatCurrency(m.property_rent) : 'No rent'} • {m.property_bedrooms || '?'} BR
            </div>
          </div>
        );
      },
    },
    {
      id: 'drive',
      header: 'Drive',
      size: 70,
      cell: ({ row }) => {
        const m = row.original;
        if (!m.drive_time_minutes) {
          return <span className="text-xs text-muted-foreground">–</span>;
        }
        return (
          <div className="flex items-center gap-1 text-xs">
            <Car className="w-3 h-3 text-muted-foreground" />
            <span>{m.drive_time_minutes}m</span>
            {m.drive_time_source === 'estimated' && (
              <span className="text-muted-foreground">~</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'budget',
      header: 'Budget',
      size: 60,
      cell: ({ row }) => {
        const b = row.original.breakdown;
        return <CriteriaIndicator met={b.budget >= 25} partial={b.budget >= 15 && b.budget < 25} />;
      },
    },
    {
      id: 'beds',
      header: 'Beds',
      size: 60,
      cell: ({ row }) => {
        const b = row.original.breakdown;
        return <CriteriaIndicator met={b.bedrooms >= 20} partial={b.bedrooms >= 10 && b.bedrooms < 20} />;
      },
    },
    {
      id: 'status',
      header: 'Status',
      size: 90,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      size: 100,
      cell: ({ row }) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => onApprove(row.original)}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => onReject(row.original)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: matches,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="command-table-container">
        <Table className="table-compact">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.column.getSize() }}
                    className={cn(
                      header.column.getCanSort() && "cursor-pointer select-none hover:bg-muted/50"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No matches found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          {' • '}
          {matches.length} total matches
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
