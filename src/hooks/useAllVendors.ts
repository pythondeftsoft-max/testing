import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Vendor {
  id: string;
  name: string;
  source: 'maintenance_vendor' | 'expense_tracking' | 'vendor_payment';
}

export const useAllVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAllVendors = async () => {
    try {
      setLoading(true);
      
      // Get vendors from maintenance_vendors table
      const { data: maintenanceVendors } = await supabase
        .from('maintenance_vendors')
        .select('id, company_name')
        .eq('is_active', true);

      // Get unique vendor names from expense_tracking
      const { data: expenseVendors } = await supabase
        .from('expense_tracking')
        .select('vendor_name')
        .not('vendor_name', 'is', null);

      // Get unique recipient names from vendor_payment_records
      const { data: paymentVendors } = await supabase
        .from('vendor_payment_records')
        .select('recipient_name')
        .eq('recipient_type', 'vendor');

      // Combine and deduplicate vendors
      const vendorMap = new Map<string, Vendor>();

      // Add maintenance vendors
      maintenanceVendors?.forEach(vendor => {
        if (vendor.company_name) {
          vendorMap.set(vendor.company_name.toLowerCase(), {
            id: vendor.id,
            name: vendor.company_name,
            source: 'maintenance_vendor'
          });
        }
      });

      // Add expense vendors
      expenseVendors?.forEach(expense => {
        if (expense.vendor_name && !vendorMap.has(expense.vendor_name.toLowerCase())) {
          vendorMap.set(expense.vendor_name.toLowerCase(), {
            id: `expense-${expense.vendor_name}`,
            name: expense.vendor_name,
            source: 'expense_tracking'
          });
        }
      });

      // Add payment vendors
      paymentVendors?.forEach(payment => {
        if (payment.recipient_name && !vendorMap.has(payment.recipient_name.toLowerCase())) {
          vendorMap.set(payment.recipient_name.toLowerCase(), {
            id: `payment-${payment.recipient_name}`,
            name: payment.recipient_name,
            source: 'vendor_payment'
          });
        }
      });

      const allVendors = Array.from(vendorMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );

      setVendors(allVendors);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch vendors",
        variant: "destructive",
      });
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllVendors();
  }, []);

  return {
    vendors,
    loading,
    refetch: fetchAllVendors
  };
};