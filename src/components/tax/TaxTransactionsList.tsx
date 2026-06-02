import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Download, Eye, Edit, Trash2 } from 'lucide-react';
import { useTaxTransactions, TaxTransaction } from '@/hooks/useTaxData';
import { format } from 'date-fns';

interface TaxTransactionsListProps {
  portfolioId?: string;
  taxYear: number;
}

export const TaxTransactionsList: React.FC<TaxTransactionsListProps> = ({
  portfolioId,
  taxYear,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterFormType, setFilterFormType] = useState<string>('all');

  const { data: transactions, isLoading } = useTaxTransactions(portfolioId, taxYear);

  const filteredTransactions = transactions?.filter((transaction) => {
    const matchesSearch = 
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || transaction.transaction_type === filterType;
    const matchesFormType = filterFormType === 'all' || transaction.form_type === filterFormType;

    return matchesSearch && matchesType && matchesFormType;
  }) || [];

  const getTransactionTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      'rent': 'bg-blue-100 text-blue-800',
      'repair': 'bg-orange-100 text-orange-800',
      'maintenance': 'bg-orange-100 text-orange-800',
      'management_fee': 'bg-green-100 text-green-800',
      'commission': 'bg-green-100 text-green-800',
      'legal_fee': 'bg-purple-100 text-purple-800',
      'accounting_fee': 'bg-purple-100 text-purple-800',
      'advertising': 'bg-pink-100 text-pink-800',
      'insurance': 'bg-gray-100 text-gray-800',
      'utilities': 'bg-yellow-100 text-yellow-800',
      'other': 'bg-gray-100 text-gray-800',
    };

    const colorClass = typeColors[type] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge variant="secondary" className={colorClass}>
        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const getFormTypeBadge = (formType?: string) => {
    if (!formType) return null;
    
    const formTypeColors: Record<string, string> = {
      '1099_misc': 'bg-blue-100 text-blue-800',
      '1099_nec': 'bg-green-100 text-green-800',
      '1099_k': 'bg-purple-100 text-purple-800',
    };

    const colorClass = formTypeColors[formType] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge variant="outline" className={colorClass}>
        {formType.replace('_', '-').toUpperCase()}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTotalAmount = () => {
    return filteredTransactions.reduce((total, transaction) => total + transaction.amount, 0);
  };

  const transactionTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'rent', label: 'Rent' },
    { value: 'repair', label: 'Repair' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'management_fee', label: 'Management Fee' },
    { value: 'commission', label: 'Commission' },
    { value: 'legal_fee', label: 'Legal Fee' },
    { value: 'accounting_fee', label: 'Accounting Fee' },
    { value: 'advertising', label: 'Advertising' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'other', label: 'Other' },
  ];

  const formTypes = [
    { value: 'all', label: 'All Forms' },
    { value: '1099_misc', label: '1099-MISC' },
    { value: '1099_nec', label: '1099-NEC' },
    { value: '1099_k', label: '1099-K' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Tax Transactions ({taxYear})</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Track all tax-eligible transactions for 1099 reporting
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters and Search */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                {transactionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterFormType} onValueChange={setFilterFormType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Form Type" />
              </SelectTrigger>
              <SelectContent>
                {formTypes.map((form) => (
                  <SelectItem key={form.value} value={form.value}>
                    {form.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{filteredTransactions.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(getTotalAmount())}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg. Transaction</p>
              <p className="text-2xl font-bold">
                {filteredTransactions.length > 0 
                  ? formatCurrency(getTotalAmount() / filteredTransactions.length)
                  : formatCurrency(0)
                }
              </p>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transactions found for the selected criteria.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Form Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.payment_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {getTransactionTypeBadge(transaction.transaction_type)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transaction.description || 'N/A'}</p>
                        {transaction.invoice_number && (
                          <p className="text-sm text-muted-foreground">
                            Invoice: {transaction.invoice_number}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{transaction.vendor_name || 'N/A'}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      {getFormTypeBadge(transaction.form_type)}
                    </TableCell>
                    <TableCell>
                      {transaction.is_tax_exempt ? (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          Exempt
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Taxable
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};