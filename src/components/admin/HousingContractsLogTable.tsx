import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/ui/data-table';
import { usePlacementFeeConfig } from '@/hooks/usePlacementFeeConfig';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Download } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ViewContractModal } from './ViewContractModal';
import { Input } from '@/components/ui/input';

interface ContractLog {
  id: string;
  property_address: string;
  unit_number?: string;
  signer_name: string;
  signer_role: string;
  contract_type: string;
  signed_at: string;
  listing_date: string;
  delisted_at?: string | null;
  delisted_reason?: string | null;
  monthly_rent: number;
  platform_commission: number;
  contract_status: string;
  listing_event_type: string;
  property_id: string;
  unit_id?: string | null;
  contract_text?: string;
}

export function HousingContractsLogTable() {
  const [contracts, setContracts] = useState<ContractLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<ContractLog | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: placementFeeConfig } = usePlacementFeeConfig();

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('property_listing_contracts')
        .select(`
          id,
          property_id,
          unit_id,
          signer_name,
          signer_role,
          contract_type,
          signed_at,
          contract_text,
          contract_status,
          listing_date,
          listing_request:property_tenant_requests!listing_request_id (
            listing_event_type,
            status,
            created_at,
            delisted_at,
            delisted_reason
          ),
          property:properties!property_id (
            address,
            street_address,
            city,
            state,
            monthly_rent
          ),
          unit:property_units!unit_id (
            unit_number,
            unit_name,
            monthly_rent
          )
        `)
        .order('signed_at', { ascending: false });

      if (error) throw error;

      const formattedContracts: ContractLog[] = (data || []).map((contract: any) => {
        const listing = contract.listing_request;
        const property = contract.property;
        const unit = contract.unit;
        
        const propertyAddress = property?.street_address || property?.address || 'Unknown Address';
        const unitDisplay = unit?.unit_number || unit?.unit_name;
        
        // Get rent from unit if exists, otherwise from property
        const monthlyRent = unit?.monthly_rent || property?.monthly_rent || 0;
        const placementFeePercentage = placementFeeConfig?.config_value?.percentage || 40;
        const platformCommission = monthlyRent * (placementFeePercentage / 100);
        
        return {
          id: contract.id,
          property_id: contract.property_id,
          unit_id: contract.unit_id,
          property_address: propertyAddress,
          unit_number: unitDisplay,
          signer_name: contract.signer_name,
          signer_role: contract.signer_role,
          contract_type: contract.contract_type,
          signed_at: contract.signed_at,
          listing_date: contract.listing_date || listing?.created_at || contract.signed_at,
          delisted_at: listing?.delisted_at || null,
          delisted_reason: listing?.delisted_reason || null,
          monthly_rent: monthlyRent,
          platform_commission: platformCommission,
          contract_status: contract.contract_status || 'active',
          listing_event_type: listing?.listing_event_type || 'initial_listing',
          contract_text: contract.contract_text,
        };
      });

      setContracts(formattedContracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Failed to load housing contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleViewContract = (contract: ContractLog) => {
    setSelectedContract(contract);
    setIsViewModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['Property', 'Unit', 'Listing Event', 'Signer', 'Role', 'Signed Date', 'Monthly Rent', 'Platform Fee (40%)', 'Listed Date', 'Date Ended', 'Status'];
    const rows = contracts.map(c => [
      c.property_address,
      c.unit_number || 'N/A',
      c.listing_event_type,
      c.signer_name,
      c.signer_role,
      format(new Date(c.signed_at), 'MMM d, yyyy'),
      `$${c.monthly_rent.toFixed(2)}`,
      `$${c.platform_commission.toFixed(2)}`,
      format(new Date(c.listing_date), 'MMM d, yyyy'),
      c.delisted_at ? format(new Date(c.delisted_at), 'MMM d, yyyy') : 'Active',
      c.contract_status
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `housing-contracts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Contracts exported to CSV');
  };

  const columns: ColumnDef<ContractLog>[] = [
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
      accessorKey: 'listing_event_type',
      header: 'Listing Event',
      cell: ({ row }) => (
        <Badge variant={row.original.listing_event_type === 'initial_listing' ? 'default' : 'secondary'}>
          {row.original.listing_event_type === 'initial_listing' ? 'Initial Listing' : 'Re-listing'}
        </Badge>
      ),
    },
    {
      accessorKey: 'signer_name',
      header: 'Signer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.signer_name}</div>
          <div className="text-sm text-muted-foreground capitalize">{row.original.signer_role}</div>
        </div>
      ),
    },
    {
      accessorKey: 'signed_at',
      header: 'Signed Date',
      cell: ({ row }) => format(new Date(row.original.signed_at), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'monthly_rent',
      header: 'Monthly Rent',
      cell: ({ row }) => (
        <div className="font-medium text-green-600">
          ${row.original.monthly_rent.toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })}
        </div>
      ),
    },
    {
      accessorKey: 'platform_commission',
      header: 'Platform Fee (40%)',
      cell: ({ row }) => (
        <div className="font-medium text-blue-600">
          ${row.original.platform_commission.toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })}
        </div>
      ),
    },
    {
      accessorKey: 'listing_date',
      header: 'Listed Date',
      cell: ({ row }) => format(new Date(row.original.listing_date), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'delisted_at',
      header: 'Date Ended',
      cell: ({ row }) => (
        row.original.delisted_at 
          ? (
            <div>
              <div>{format(new Date(row.original.delisted_at), 'MMM d, yyyy')}</div>
              {row.original.delisted_reason && (
                <div className="text-xs text-muted-foreground">
                  {row.original.delisted_reason}
                </div>
              )}
            </div>
          )
          : <span className="text-muted-foreground">Active</span>
      ),
    },
    {
      accessorKey: 'contract_status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.contract_status?.toLowerCase() || 'active';
        const variant = status === 'active' ? 'success' : 
                       status === 'terminated' ? 'destructive' : 
                       status === 'expired' ? 'secondary' : 'neutral';
        
        return (
          <Badge variant={variant as any}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewContract(row.original)}
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  const filteredContracts = contracts.filter(contract => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contract.property_address.toLowerCase().includes(searchLower) ||
      contract.signer_name.toLowerCase().includes(searchLower) ||
      contract.unit_number?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by property, signer, or unit..."
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

      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Total Contracts: </span>
          <span className="font-semibold">{filteredContracts.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total Monthly Rent: </span>
          <span className="font-semibold text-green-600">
            ${filteredContracts.reduce((sum, c) => sum + c.monthly_rent, 0).toLocaleString('en-US', { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            })}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Total Platform Revenue: </span>
          <span className="font-semibold text-blue-600">
            ${filteredContracts.reduce((sum, c) => sum + c.platform_commission, 0).toLocaleString('en-US', { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            })}
          </span>
        </div>
      </div>

      <DataTable columns={columns} data={filteredContracts} />

      {selectedContract && (
        <ViewContractModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedContract(null);
          }}
          propertyId={selectedContract.property_id}
          unitId={selectedContract.unit_id}
          propertyAddress={selectedContract.property_address}
        />
      )}
    </div>
  );
}
