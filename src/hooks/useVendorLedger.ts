import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VendorTransaction {
  id: string;
  date: string;
  propertyAddress: string;
  referenceNumber: string;
  description: string;
  billAmount: number;
  paymentAmount: number;
  vendorName: string;
  source: 'vendor_payment' | 'expense_tracking' | 'maintenance';
  currencyCode?: string;
}

export interface VendorLedgerSummary {
  vendorName: string;
  totalBills: number;
  totalPayments: number;
  outstandingBalance: number;
  transactions: VendorTransaction[];
}

export const useVendorLedger = () => {
  const [ledgerData, setLedgerData] = useState<VendorLedgerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchVendorLedger = useCallback(async (
    portfolioId?: string,
    vendorNames?: string[],
    startDate?: string,
    endDate?: string,
    propertyIds?: string[]
  ) => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Fetching vendor ledger for user:', user.id, { portfolioId, vendorNames, startDate, endDate, propertyIds });

      // If no specific property IDs provided, get user's accessible properties
      let userPropertyIds: string[] = [];
      if (!propertyIds) {
        let propertiesQuery = supabase
          .from('properties')
          .select('id, address, portfolio_id')
          .eq('owner_id', user.id);

        if (portfolioId && portfolioId !== 'everything') {
          propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
        }

        const { data: userProperties, error: propertiesError } = await propertiesQuery;
        if (propertiesError) {
          console.error('Error fetching user properties:', propertiesError);
          throw propertiesError;
        }

        userPropertyIds = userProperties?.map(p => p.id) || [];
        console.log('User accessible properties:', userPropertyIds.length);
        
        if (userPropertyIds.length === 0) {
          console.log('No properties found for user, returning empty ledger');
          setLedgerData([]);
          return;
        }
      } else {
        userPropertyIds = propertyIds;
      }
      
      // Fetch vendor payments
      let vendorPaymentsQuery = supabase
        .from('vendor_payment_records')
        .select(`
          id,
          recipient_name,
          amount,
          paid_at,
          reference,
          memo,
          currency_code,
          property_id,
          properties!inner(address, portfolio_id, owner_id)
        `)
        .eq('recipient_type', 'vendor')
        .in('property_id', userPropertyIds);

      if (vendorNames && vendorNames.length > 0) {
        vendorPaymentsQuery = vendorPaymentsQuery.in('recipient_name', vendorNames);
      }

      if (startDate && endDate) {
        vendorPaymentsQuery = vendorPaymentsQuery
          .gte('paid_at', startDate)
          .lte('paid_at', endDate);
      }

      const { data: vendorPayments, error: paymentsError } = await vendorPaymentsQuery;
      if (paymentsError) {
        console.error('Error fetching vendor payments:', paymentsError);
        throw paymentsError;
      }

      console.log('Vendor payments found:', vendorPayments?.length || 0);

      // Fetch expense tracking data
      let expenseQuery = supabase
        .from('expense_tracking')
        .select(`
          id,
          vendor_name,
          amount,
          expense_date,
          description,
          payment_reference,
          property_id,
          properties!inner(address, portfolio_id, owner_id)
        `)
        .not('vendor_name', 'is', null)
        .in('property_id', userPropertyIds);

      if (vendorNames && vendorNames.length > 0) {
        expenseQuery = expenseQuery.in('vendor_name', vendorNames);
      }

      if (startDate && endDate) {
        expenseQuery = expenseQuery
          .gte('expense_date', startDate)
          .lte('expense_date', endDate);
      }

      const { data: expenses, error: expensesError } = await expenseQuery;
      if (expensesError) {
        console.error('Error fetching expenses:', expensesError);
        throw expensesError;
      }

      console.log('Expenses found:', expenses?.length || 0);

      // Fetch maintenance requests with vendor costs
      let maintenanceQuery = supabase
        .from('maintenance_requests')
        .select(`
          id,
          description,
          actual_cost,
          completed_date,
          property_id,
          properties!inner(address, portfolio_id, owner_id),
          maintenance_vendors(company_name)
        `)
        .not('actual_cost', 'is', null)
        .not('completed_date', 'is', null)
        .in('property_id', userPropertyIds);

      if (vendorNames && vendorNames.length > 0) {
        maintenanceQuery = maintenanceQuery.in('maintenance_vendors.company_name', vendorNames);
      }

      if (startDate && endDate) {
        maintenanceQuery = maintenanceQuery
          .gte('completed_date', startDate)
          .lte('completed_date', endDate);
      }

      const { data: maintenanceRequests, error: maintenanceError } = await maintenanceQuery;
      if (maintenanceError) {
        console.error('Error fetching maintenance requests:', maintenanceError);
        throw maintenanceError;
      }

      console.log('Maintenance requests found:', maintenanceRequests?.length || 0);

      // Convert all data to VendorTransaction format
      const allTransactions: VendorTransaction[] = [];

      // Add vendor payments
      vendorPayments?.forEach(payment => {
        allTransactions.push({
          id: payment.id,
          date: payment.paid_at,
          propertyAddress: payment.properties?.address || 'Unknown Property',
          referenceNumber: payment.reference || payment.id.slice(-8),
          description: payment.memo || 'Vendor Payment',
          billAmount: 0,
          paymentAmount: payment.amount,
          vendorName: payment.recipient_name,
          source: 'vendor_payment',
          currencyCode: payment.currency_code
        });
      });

      // Add expense tracking
      expenses?.forEach(expense => {
        allTransactions.push({
          id: expense.id,
          date: expense.expense_date,
          propertyAddress: expense.properties?.address || 'Unknown Property',
          referenceNumber: expense.payment_reference || expense.id.slice(-8),
          description: expense.description || 'Expense',
          billAmount: expense.amount,
          paymentAmount: 0,
          vendorName: expense.vendor_name,
          source: 'expense_tracking'
        });
      });

      // Add maintenance costs
      maintenanceRequests?.forEach(request => {
        const vendorName = request.maintenance_vendors?.company_name || 'Unknown Vendor';
        allTransactions.push({
          id: request.id,
          date: request.completed_date,
          propertyAddress: request.properties?.address || 'Unknown Property',
          referenceNumber: `MR-${request.id.slice(-6)}`,
          description: request.description || 'Maintenance Work',
          billAmount: request.actual_cost,
          paymentAmount: 0,
          vendorName,
          source: 'maintenance'
        });
      });

      // Group transactions by vendor
      const vendorGroups = new Map<string, VendorTransaction[]>();
      
      allTransactions.forEach(transaction => {
        const vendorKey = transaction.vendorName;
        if (!vendorGroups.has(vendorKey)) {
          vendorGroups.set(vendorKey, []);
        }
        vendorGroups.get(vendorKey)!.push(transaction);
      });

      // Create vendor ledger summaries
      const ledgerSummaries: VendorLedgerSummary[] = [];
      
      vendorGroups.forEach((transactions, vendorName) => {
        const sortedTransactions = transactions.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const totalBills = transactions.reduce((sum, t) => sum + t.billAmount, 0);
        const totalPayments = transactions.reduce((sum, t) => sum + t.paymentAmount, 0);

        ledgerSummaries.push({
          vendorName,
          totalBills,
          totalPayments,
          outstandingBalance: totalBills - totalPayments,
          transactions: sortedTransactions
        });
      });

      // Sort vendors by name
      ledgerSummaries.sort((a, b) => a.vendorName.localeCompare(b.vendorName));

      console.log('Final ledger summaries:', ledgerSummaries.length, 'vendors');
      console.log('Ledger data:', ledgerSummaries.map(v => ({ 
        vendor: v.vendorName, 
        transactions: v.transactions.length,
        totalBills: v.totalBills,
        totalPayments: v.totalPayments,
        outstandingBalance: v.outstandingBalance
      })));

      setLedgerData(ledgerSummaries);
    } catch (error: any) {
      console.error('Error fetching vendor ledger:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch vendor ledger data",
        variant: "destructive",
      });
      setLedgerData([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    ledgerData,
    loading,
    fetchVendorLedger
  };
};