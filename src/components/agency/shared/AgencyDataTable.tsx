import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';

export interface AgencyDataTableColumn<TRow> {
  /** Column key — used for React keys */
  key: string;
  /** Header label */
  header: React.ReactNode;
  /** Cell renderer */
  cell: (row: TRow, index: number) => React.ReactNode;
  /** Optional extra classes for the cell */
  className?: string;
  /** Optional extra classes for the header */
  headerClassName?: string;
  /** Optional fixed width (Tailwind class, e.g. "w-32") */
  width?: string;
}

export interface AgencyDataTableEmpty {
  icon: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: { label: string; onClick?: () => void; href?: string };
}

export interface AgencyDataTableProps<TRow> {
  columns: AgencyDataTableColumn<TRow>[];
  rows: TRow[];
  loading?: boolean;
  /** Empty state config — shown when not loading and rows is empty */
  empty: AgencyDataTableEmpty;
  /** Optional toolbar (search / filters / export) — rendered above the table */
  toolbar?: React.ReactNode;
  /** Optional pagination footer */
  footer?: React.ReactNode;
  /** Per-row key extractor */
  rowKey?: (row: TRow, index: number) => string | number;
  /** Per-row click handler */
  onRowClick?: (row: TRow) => void;
  /** Wrap in a Card. Defaults to true. */
  card?: boolean;
  /** Sticky header. Defaults to true. */
  stickyHeader?: boolean;
  /** Skeleton row count while loading. Defaults to 5. */
  skeletonRows?: number;
  className?: string;
}

function AgencyDataTableInner<TRow>({
  columns,
  rows,
  loading,
  empty,
  toolbar,
  footer,
  rowKey,
  onRowClick,
  stickyHeader = true,
  skeletonRows = 5,
}: Omit<AgencyDataTableProps<TRow>, 'card' | 'className'>) {
  const colCount = columns.length;

  return (
    <>
      {toolbar && (
        <div className="px-4 py-3 border-b flex flex-wrap items-center gap-2">
          {toolbar}
        </div>
      )}
      {loading ? (
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader className={cn(stickyHeader && 'sticky top-0 bg-background z-10')}>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.key} className={c.headerClassName}>
                    {c.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      <Skeleton className="h-4 w-full max-w-[180px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState bare {...empty} />
      ) : (
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader className={cn(stickyHeader && 'sticky top-0 bg-background z-10')}>
              <TableRow>
                {columns.map((c) => (
                  <TableHead
                    key={c.key}
                    className={cn(c.headerClassName, c.width)}
                  >
                    {c.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => {
                const key = rowKey ? rowKey(row, i) : i;
                return (
                  <TableRow
                    key={key}
                    className={cn(onRowClick && 'cursor-pointer hover:bg-accent/50')}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((c) => (
                      <TableCell key={c.key} className={c.className}>
                        {c.cell(row, i)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {footer && !loading && rows.length > 0 && (
        <div className="px-4 py-3 border-t flex items-center justify-between">
          {footer}
        </div>
      )}
    </>
  );
}

/**
 * Standardized data table for the agency portal.
 * Built-in: sticky header, loading skeleton, empty state, optional toolbar/footer.
 */
export function AgencyDataTable<TRow>(props: AgencyDataTableProps<TRow>) {
  const { card = true, className } = props;
  if (!card) {
    return (
      <div className={cn('rounded-md border bg-card', className)}>
        <AgencyDataTableInner {...props} />
      </div>
    );
  }
  return (
    <Card className={cn(className)}>
      <CardContent className="p-0">
        <AgencyDataTableInner {...props} />
      </CardContent>
    </Card>
  );
}

export default AgencyDataTable;
