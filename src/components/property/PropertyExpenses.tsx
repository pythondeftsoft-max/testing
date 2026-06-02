import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface PropertyExpensesProps {
  propertyId: string;
  unitId?: string;
}

export const PropertyExpenses = ({ propertyId, unitId }: PropertyExpensesProps) => {
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['vendor-payments', propertyId, unitId],
    queryFn: async () => {
      let query = supabase
        .from('vendor_payment_records')
        .select(`
          *,
          maintenance_requests:maintenance_request_id (
            id,
            title,
            tenant_id,
            profiles:tenant_id (
              full_name,
              first_name,
              last_name
            )
          )
        `)
        .eq('property_id', propertyId)
        .order('paid_at', { ascending: false });
      
      if (unitId) {
        query = query.eq('unit_id', unitId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

  const getSubmittedBy = (expense: any) => {
    const maintenanceRequest = expense.maintenance_requests;
    
    if (!maintenanceRequest) {
      return <Badge variant="outline">Manual</Badge>;
    }
    
    if (maintenanceRequest.tenant_id && maintenanceRequest.profiles) {
      const profile = maintenanceRequest.profiles;
      const name = profile.full_name || 
        [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 
        'Tenant';
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          <Badge variant="secondary" className="text-xs">Tenant</Badge>
        </div>
      );
    }
    
    return <Badge variant="outline">Admin</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!expenses || expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No vendor payments recorded</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Expense History</CardTitle>
          <Badge variant="outline" className="text-base">
            Total: ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Vendor</TableHead>
                <TableHead className="font-semibold">Submitted By</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="font-semibold">Payment Method</TableHead>
                <TableHead className="font-semibold">Memo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {format(new Date(expense.paid_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{expense.recipient_name}</div>
                  </TableCell>
                  <TableCell>
                    {getSubmittedBy(expense)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-semibold text-foreground">
                      <DollarSign className="h-4 w-4" />
                      {expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {expense.payment_method === 'manual' ? 'Manual' : 'Plaid'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {expense.memo ? (
                      <div className="flex items-start gap-2 max-w-xs">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">
                          {expense.memo.length > 50 ? `${expense.memo.substring(0, 50)}...` : expense.memo}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
