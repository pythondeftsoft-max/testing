import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { DelinquentTenant, DelinquentTenantsData } from '@/hooks/useDelinquentTenants';
import { formatCurrency } from '@/lib/formatters';

interface DelinquentTenantsTableProps {
  data: DelinquentTenantsData | null;
  loading: boolean;
}

const DelinquentTenantsTable = ({ data, loading }: DelinquentTenantsTableProps) => {
  const columns: ColumnDef<DelinquentTenant>[] = [
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("unit")}</div>
      ),
    },
    {
      accessorKey: "tenantName",
      header: "Tenant",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.getValue("tenantName")}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.email && (
              <div className="truncate">{row.original.email}</div>
            )}
            {row.original.phone && (
              <div>{row.original.phone}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "lastPayment",
      header: "Last Payment",
      cell: ({ row }) => {
        const lastPayment = row.getValue("lastPayment") as string | null;
        return (
          <div className="text-sm">
            {lastPayment 
              ? new Date(lastPayment).toLocaleDateString()
              : "No payment"
            }
          </div>
        );
      },
    },
    {
      accessorKey: "totalBalance",
      header: "Total",
      cell: ({ row }) => (
        <div className="font-medium text-red-600">
          {formatCurrency(row.getValue("totalBalance"))}
        </div>
      ),
    },
    {
      id: "days0to30",
      header: "0-30 Days",
      cell: ({ row }) => (
        <div className="font-medium">
          {formatCurrency(row.original.breakdown.current)}
        </div>
      ),
    },
    {
      id: "days31to60", 
      header: "31-60 Days",
      cell: ({ row }) => (
        <div className="font-medium">
          {formatCurrency(row.original.breakdown.days30)}
        </div>
      ),
    },
    {
      id: "days61to90",
      header: "61-90 Days", 
      cell: ({ row }) => (
        <div className="font-medium">
          {formatCurrency(row.original.breakdown.days60)}
        </div>
      ),
    },
    {
      id: "days91plus",
      header: "91+ Days",
      cell: ({ row }) => (
        <div className="font-medium text-red-600">
          {formatCurrency(row.original.breakdown.days90Plus)}
        </div>
      ),
    },
  ];

  const summaryData = data ? [
    {
      category: "0-30 Days",
      amount: data.agingBreakdown.current,
      percentage: data.totalOutstanding > 0 ? (data.agingBreakdown.current / data.totalOutstanding) * 100 : 0
    },
    {
      category: "31-60 Days", 
      amount: data.agingBreakdown.days30,
      percentage: data.totalOutstanding > 0 ? (data.agingBreakdown.days30 / data.totalOutstanding) * 100 : 0
    },
    {
      category: "61-90 Days",
      amount: data.agingBreakdown.days60, 
      percentage: data.totalOutstanding > 0 ? (data.agingBreakdown.days60 / data.totalOutstanding) * 100 : 0
    },
    {
      category: "91+ Days",
      amount: data.agingBreakdown.days90Plus,
      percentage: data.totalOutstanding > 0 ? (data.agingBreakdown.days90Plus / data.totalOutstanding) * 100 : 0
    }
  ] : [];

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.tenants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delinquent Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No delinquent tenants found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Delinquent Tenants</span>
          <span className="text-sm font-normal text-muted-foreground">
            {data.totalCount} tenant{data.totalCount !== 1 ? 's' : ''} • {formatCurrency(data.totalOutstanding)} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <DataTable columns={columns} data={data.tenants} />
          </TabsContent>
          
          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Aging Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {summaryData.map((item) => (
                      <div key={item.category} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.category}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.percentage.toFixed(1)}% of total
                          </div>
                        </div>
                        <div className="font-bold">
                          {formatCurrency(item.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Summary Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Delinquent</span>
                      <span className="font-medium">{data.totalCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Outstanding</span>
                      <span className="font-medium">{formatCurrency(data.totalOutstanding)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Delinquency</span>
                      <span className="font-medium">{formatCurrency(data.averageDelinquency)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DelinquentTenantsTable;