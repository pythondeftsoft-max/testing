import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Send, FileText, Tag, ChevronRight } from 'lucide-react';

interface LateUnit {
  propertyId: string;
  propertyAddress: string;
  unitId: string | null;
  unitNumber: string | null;
  tenantName: string;
  tenantId: string;
  dueDate: string;
  amountOwed: number;
  daysLate: number;
  status: 'grace' | 'late' | 'overdue';
}

interface LateUnitsTableProps {
  lateUnits: LateUnit[];
  loading?: boolean;
  onSendReminder?: (tenantId: string) => void;
  onViewLedger?: (unitId: string) => void;
  onTagPayment?: (unitId: string) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusBadge = (status: 'grace' | 'late' | 'overdue', daysLate: number) => {
  switch (status) {
    case 'grace':
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
          Grace ({daysLate}d)
        </Badge>
      );
    case 'late':
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
          Late ({daysLate}d)
        </Badge>
      );
    case 'overdue':
      return (
        <Badge variant="destructive">
          Overdue ({daysLate}d)
        </Badge>
      );
  }
};

export const LateUnitsTable = ({
  lateUnits,
  loading,
  onSendReminder,
  onViewLedger,
  onTagPayment,
}: LateUnitsTableProps) => {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6 h-48" />
      </Card>
    );
  }

  if (lateUnits.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5" />
            Late & At-Risk Units
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
              <AlertTriangle className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="font-medium text-emerald-600">All Caught Up!</p>
            <p className="text-sm text-muted-foreground">No late or at-risk payments this period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Late & At-Risk Units
          <Badge variant="secondary" className="ml-2">{lateUnits.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Owed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lateUnits.map((unit, index) => (
              <TableRow key={`${unit.propertyId}-${unit.unitId}-${index}`}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {unit.propertyAddress}
                </TableCell>
                <TableCell>{unit.unitNumber || '-'}</TableCell>
                <TableCell>{unit.tenantName}</TableCell>
                <TableCell>{unit.dueDate}</TableCell>
                <TableCell className="text-right font-medium text-red-600">
                  {formatCurrency(unit.amountOwed)}
                </TableCell>
                <TableCell>{getStatusBadge(unit.status, unit.daysLate)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onSendReminder?.(unit.tenantId)}
                      title="Send Reminder"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onViewLedger?.(unit.unitId || unit.propertyId)}
                      title="View Ledger"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onTagPayment?.(unit.unitId || unit.propertyId)}
                      title="Tag Payment"
                    >
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
