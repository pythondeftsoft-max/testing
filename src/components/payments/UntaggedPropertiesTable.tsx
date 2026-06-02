import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, AlertCircle, Tag, Building2 } from 'lucide-react';
import { useUntaggedProperties, UntaggedProperty } from '@/hooks/usePaymentTaggingData';
import { TagPaymentToPropertyModal } from './TagPaymentToPropertyModal';

interface UntaggedPropertiesTableProps {
  landlordId: string;
  portfolioId?: string;
}

export const UntaggedPropertiesTable = ({ landlordId, portfolioId }: UntaggedPropertiesTableProps) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('all');
  const [selectedProperty, setSelectedProperty] = useState<UntaggedProperty | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);

  const { data, isLoading } = useUntaggedProperties({ year: selectedYear, month: selectedMonth });

  // Extract unique portfolios from data
  const portfolios = useMemo(() => {
    const unique = new Map<string, string>();
    (data?.properties || []).forEach((p: UntaggedProperty) => {
      if (p.portfolio_id && p.portfolio_name) {
        unique.set(p.portfolio_id, p.portfolio_name);
      }
    });
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [data?.properties]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleTagPayment = (property: UntaggedProperty) => {
    setSelectedProperty(property);
    setTagModalOpen(true);
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading properties...
        </CardContent>
      </Card>
    );
  }

  // Filter to only show properties that still need tagging (is_complete: false) and by portfolio
  const properties = (data?.properties || [])
    .filter((p: UntaggedProperty) => !p.is_complete)
    .filter((p: UntaggedProperty) => selectedPortfolio === 'all' || p.portfolio_id === selectedPortfolio);

  return (
    <>
      {/* Period & Portfolio Selector */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Period:</span>
        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {portfolios.length > 0 && (
          <>
            <span className="text-sm font-medium text-muted-foreground ml-2">Portfolio:</span>
            <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Portfolios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Portfolios</SelectItem>
                {portfolios.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        
        {data?.untaggedCount !== undefined && (
          <Badge variant={data.untaggedCount > 0 ? "destructive" : "default"} className="ml-auto">
            {data.untaggedCount > 0 
              ? `${data.untaggedCount} need attention` 
              : 'All tagged ✓'}
          </Badge>
        )}
      </div>

      <Card>
        {properties.length === 0 ? (
          <CardContent className="p-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No occupied properties found</p>
            <p className="text-sm mt-1">
              Properties with tenants will appear here for payment tracking.
            </p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Rent Breakdown</TableHead>
                <TableHead className="text-right">Amount Tagged</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Tagged Deposits</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => (
                <TableRow 
                  key={property.unit_id}
                  className={!property.is_complete ? 'bg-orange-50/50' : ''}
                >
                  <TableCell className="font-medium">
                    <div className="text-xs text-blue-600 font-semibold mb-0.5">
                      {property.portfolio_name}
                    </div>
                    <div>{property.property_address}</div>
                    {(property.unit_number !== '1' || property.unit_name) && (
                      <div className="text-sm text-muted-foreground">
                        {property.unit_name || `Unit ${property.unit_number}`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {property.tenant_name || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">{formatCurrency(property.required_rent)}</div>
                    {property.hap_expected > 0 && (
                      <div className="text-xs text-green-600">HAP: {formatCurrency(property.hap_expected)}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Tenant: {formatCurrency(property.tenant_expected_raw ?? property.tenant_expected)}
                      {property.tenant_collection_method === 'stripe' && (
                        <span className="text-blue-500 ml-1">(Stripe)</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={property.amount_tagged > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                      {formatCurrency(property.amount_tagged)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {property.is_complete ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    ) : (
                      <span className="text-orange-600 font-medium">
                        {formatCurrency(property.remaining)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {property.tagged_deposits && property.tagged_deposits.length > 0 ? (
                      <div className="text-sm space-y-1">
                        {property.tagged_deposits.map((deposit, idx) => (
                          <div key={idx}>
                            <p className="truncate max-w-[150px]">{deposit.description || 'Unknown'}</p>
                            <p className="text-muted-foreground text-xs">
                              {formatCurrency(deposit.amount)} • {deposit.tag_type === 'hap' ? 'HAP' : 'Tenant'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={property.is_complete ? "outline" : "default"}
                      onClick={() => handleTagPayment(property)}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {property.is_complete ? 'Edit' : 'Tag Payment'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <TagPaymentToPropertyModal
        open={tagModalOpen}
        onOpenChange={setTagModalOpen}
        property={selectedProperty}
        landlordId={landlordId}
      />
    </>
  );
};
