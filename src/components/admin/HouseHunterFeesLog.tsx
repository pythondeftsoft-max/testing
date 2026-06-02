import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, CreditCard, Building2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlacementFee {
  id: string;
  property_address: string;
  unit_number?: string;
  landlord_name: string;
  landlord_email: string;
  landlord_company: string | null;
  tenant_name: string;
  tenant_email: string;
  fee_amount: number;
  payment_status: string;
  payment_date: string | null;
  created_at: string;
  application_id: string | null;
  admin_listed: boolean;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  plaid_transaction_id: string | null;
}

export function HouseHunterFeesLog() {
  const [fees, setFees] = useState<PlacementFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      setLoading(true);
      console.log('🔍 HouseHunterFeesLog: Fetching placement fees...');
      
      const { data, error } = await supabase
        .from('landlord_placement_fees')
        .select(`
          *,
          properties!landlord_placement_fees_property_id_fkey(address, admin_listed, street_address, city, state),
          property_units!landlord_placement_fees_unit_id_fkey(unit_number, unit_name),
          profiles!landlord_placement_fees_landlord_id_fkey(first_name, last_name, email, company_name)
        `)
        .order('created_at', { ascending: false });

      console.log('💰 HouseHunterFeesLog: Query result:', { data, error, count: data?.length });

      if (error) throw error;

      const formattedFees: PlacementFee[] = await Promise.all((data || []).map(async (fee: any) => {
        const property = fee.properties;
        const unit = fee.property_units;
        const landlord = fee.profiles;
        
        // Fetch tenant profile separately
        let tenant = null;
        if (fee.tenant_id) {
          const { data: tenantData } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', fee.tenant_id)
            .single();
          tenant = tenantData;
        }
        
        return {
          id: fee.id,
          property_address: property?.street_address || property?.address || 'Unknown',
          unit_number: unit?.unit_number || unit?.unit_name,
          landlord_name: `${landlord?.first_name || ''} ${landlord?.last_name || ''}`.trim(),
          landlord_email: landlord?.email || '',
          landlord_company: landlord?.company_name,
          tenant_name: tenant ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() : 'N/A',
          tenant_email: tenant?.email || '',
          fee_amount: fee.fee_amount || 0,
          payment_status: fee.payment_status || 'pending',
          payment_date: fee.payment_date,
          created_at: fee.created_at,
          application_id: fee.application_id,
          admin_listed: fee.admin_listed || false,
          payment_method: fee.payment_method,
          stripe_payment_intent_id: fee.stripe_payment_intent_id,
          plaid_transaction_id: fee.plaid_transaction_id,
        };
      }));

      console.log('✅ HouseHunterFeesLog: Formatted fees:', formattedFees);
      setFees(formattedFees);
    } catch (error) {
      console.error('Error fetching placement fees:', error);
      toast.error('Failed to load house hunter fees');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodDisplay = (fee: PlacementFee) => {
    if (fee.stripe_payment_intent_id) return 'Stripe';
    if (fee.plaid_transaction_id) return 'Plaid ACH';
    if (fee.payment_method === 'wire') return 'Wire';
    if (fee.payment_method === 'other') return 'Manual';
    if (fee.payment_status === 'paid' || fee.payment_status === 'completed') return 'Manual';
    return 'Pending';
  };

  const handleExportCSV = () => {
    const headers = ['Property', 'Unit', 'Landlord', 'Company', 'Tenant', 'Fee Amount', 'Status', 'Payment Method', 'Payment Date', 'Created Date', 'Admin Listed'];
    const rows = fees.map(f => [
      f.property_address,
      f.unit_number || 'N/A',
      f.landlord_name,
      f.landlord_company || 'N/A',
      f.tenant_name,
      `$${f.fee_amount.toFixed(2)}`,
      f.payment_status,
      getPaymentMethodDisplay(f),
      f.payment_date ? format(new Date(f.payment_date), 'MMM d, yyyy') : 'N/A',
      format(new Date(f.created_at), 'MMM d, yyyy'),
      f.admin_listed ? 'Yes' : 'No'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `house-hunter-fees-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('House hunter fees exported to CSV');
  };

  const columns: ColumnDef<PlacementFee>[] = [
    {
      accessorKey: 'property_address',
      header: 'Property',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.property_address}</div>
          {row.original.unit_number && (
            <div className="text-sm text-muted-foreground">Unit {row.original.unit_number}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'landlord_name',
      header: 'Landlord',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.landlord_name}</div>
          {row.original.landlord_company && (
            <div className="text-sm text-muted-foreground">{row.original.landlord_company}</div>
          )}
          <div className="text-xs text-muted-foreground">{row.original.landlord_email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'tenant_name',
      header: 'Tenant',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.tenant_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.tenant_email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'fee_amount',
      header: 'Fee Amount',
      cell: ({ row }) => (
        <div className="font-medium text-green-600">
          ${row.original.fee_amount.toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'payment_status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.payment_status.toLowerCase();
        let variant: 'success' | 'outline' | 'neutral' = 'outline';
        
        if (status === 'paid' || status === 'completed') variant = 'success';
        else if (status === 'waived') variant = 'neutral';
        
        return (
          <Badge variant={variant} className="capitalize">
            {row.original.payment_status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'payment_date',
      header: 'Payment Date',
      cell: ({ row }) => {
        if (!row.original.payment_date) return <span className="text-muted-foreground">Pending</span>;
        return format(new Date(row.original.payment_date), 'MMM d, yyyy');
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'admin_listed',
      header: 'Admin Listed',
      cell: ({ row }) => (
        <Badge variant={row.original.admin_listed ? 'default' : 'outline'}>
          {row.original.admin_listed ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      accessorKey: 'payment_method',
      header: 'Payment Method',
      cell: ({ row }) => {
        const fee = row.original;
        
        if (fee.stripe_payment_intent_id) {
          return (
            <a
              href={`https://dashboard.stripe.com/payments/${fee.stripe_payment_intent_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
            >
              <Badge variant="default" className="bg-[#635BFF] hover:bg-[#524AE8]">
                <CreditCard className="w-3 h-3 mr-1" />
                Stripe
                <ExternalLink className="w-3 h-3 ml-1" />
              </Badge>
            </a>
          );
        }
        
        if (fee.plaid_transaction_id) {
          return (
            <Badge variant="default" className="bg-emerald-600">
              <Building2 className="w-3 h-3 mr-1" />
              Plaid ACH
            </Badge>
          );
        }
        
        if (fee.payment_method === 'wire') {
          return (
            <Badge variant="outline">
              Wire Transfer
            </Badge>
          );
        }
        
        if (fee.payment_status === 'paid' || fee.payment_status === 'completed') {
          return (
            <Badge variant="outline">
              Manual
            </Badge>
          );
        }
        
        return <span className="text-muted-foreground">Pending</span>;
      },
    },
  ];

  const filteredFees = fees.filter(fee => {
    const searchLower = searchTerm.toLowerCase();
    return (
      fee.property_address.toLowerCase().includes(searchLower) ||
      fee.landlord_name.toLowerCase().includes(searchLower) ||
      fee.tenant_name.toLowerCase().includes(searchLower) ||
      fee.landlord_company?.toLowerCase().includes(searchLower) ||
      fee.unit_number?.toLowerCase().includes(searchLower)
    );
  });

  const totalFeesCollected = fees
    .filter(f => f.payment_status === 'paid' || f.payment_status === 'completed')
    .reduce((sum, f) => sum + f.fee_amount, 0);
  
  const pendingFees = fees
    .filter(f => f.payment_status === 'pending')
    .reduce((sum, f) => sum + f.fee_amount, 0);
  
  const totalPlacements = fees.length;
  const avgFee = totalPlacements > 0 ? fees.reduce((sum, f) => sum + f.fee_amount, 0) / totalPlacements : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalFeesCollected.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${pendingFees.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Placements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlacements}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Fee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgFee.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by property, landlord, tenant, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button onClick={handleExportCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing <span className="font-semibold">{filteredFees.length}</span> of <span className="font-semibold">{totalPlacements}</span> placement fees
      </div>

      <DataTable columns={columns} data={filteredFees} />
    </div>
  );
}
