import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Download, 
  Send, 
  Eye, 
  Edit, 
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info
} from 'lucide-react';
import { useTax1099Forms, useTaxTransactions, useTaxThresholds } from '@/hooks/useTaxData';
import { TaxFormGenerator } from './TaxFormGenerator';
import { Tax1099PdfService } from '@/services/tax1099PdfService';
import { format } from 'date-fns';

interface Tax1099DashboardProps {
  portfolioId?: string;
  taxYear: number;
  userId: string;
}

export const Tax1099Dashboard: React.FC<Tax1099DashboardProps> = ({
  portfolioId,
  taxYear,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'forms' | 'deadlines'>('overview');

  const { data: forms, isLoading: formsLoading } = useTax1099Forms(portfolioId, taxYear);
  const { data: transactions, isLoading: transactionsLoading } = useTaxTransactions(portfolioId, taxYear);
  const { data: thresholds } = useTaxThresholds(taxYear);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'filed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Filed</Badge>;
      case 'generated':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><FileText className="w-3 h-3 mr-1" />Generated</Badge>;
      case 'draft':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'corrected':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Corrected</Badge>;
      case 'voided':
        return <Badge variant="destructive">Voided</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getFormTypeBadge = (formType: string) => {
    const colors: Record<string, string> = {
      '1099_misc': 'bg-blue-100 text-blue-800',
      '1099_nec': 'bg-green-100 text-green-800',
      '1099_k': 'bg-purple-100 text-purple-800',
    };

    return (
      <Badge variant="outline" className={colors[formType] || 'bg-gray-100 text-gray-800'}>
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

  // Calculate required forms based on transactions and thresholds
  const getRequiredForms = () => {
    if (!transactions || !thresholds) return [];

    const payeeAmounts: Record<string, { amount: number; formType: string }> = {};
    
    transactions.forEach((transaction) => {
      const key = transaction.payee_id;
      const threshold = thresholds.find(t => t.form_type === transaction.form_type)?.threshold_amount || 600;
      
      if (!payeeAmounts[key]) {
        payeeAmounts[key] = { amount: 0, formType: transaction.form_type || '1099_misc' };
      }
      payeeAmounts[key].amount += transaction.amount;
    });

    return Object.entries(payeeAmounts)
      .filter(([_, data]) => {
        const threshold = thresholds.find(t => t.form_type === data.formType)?.threshold_amount || 600;
        return data.amount >= threshold;
      })
      .map(([payeeId, data]) => ({
        payeeId,
        amount: data.amount,
        formType: data.formType,
      }));
  };

  const requiredForms = getRequiredForms();
  const filedForms = forms?.filter(form => form.form_status === 'filed') || [];
  const draftForms = forms?.filter(form => form.form_status === 'draft') || [];
  const generatedForms = forms?.filter(form => form.form_status === 'generated') || [];

  const completionRate = requiredForms.length > 0 
    ? Math.round((filedForms.length / requiredForms.length) * 100)
    : 100;

  // Important deadlines
  const deadlines = [
    {
      name: 'Forms to Recipients',
      date: new Date(taxYear + 1, 0, 31), // January 31
      description: '1099 forms must be provided to recipients',
      critical: true,
    },
    {
      name: 'Paper Filing with IRS',
      date: new Date(taxYear + 1, 1, 28), // February 28
      description: 'Paper forms must be filed with IRS',
      critical: false,
    },
    {
      name: 'Electronic Filing with IRS',
      date: new Date(taxYear + 1, 2, 31), // March 31
      description: 'Electronic forms must be filed with IRS',
      critical: false,
    },
  ];

  const isOverdue = (date: Date) => new Date() > date;
  const isDueSoon = (date: Date) => {
    const daysUntil = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil > 0;
  };

  if (formsLoading || transactionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Required Forms</p>
                <p className="text-2xl font-bold">{requiredForms.length}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Filed</p>
                <p className="text-2xl font-bold text-green-600">{filedForms.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{draftForms.length + generatedForms.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
              <div className="w-8 h-8 flex items-center justify-center">
                <Progress value={completionRate} className="w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deadlines Alert */}
      {deadlines.some(deadline => isOverdue(deadline.date) || isDueSoon(deadline.date)) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-5 h-5" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deadlines
                .filter(deadline => isOverdue(deadline.date) || isDueSoon(deadline.date))
                .map((deadline, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div>
                      <p className="font-medium text-yellow-800">{deadline.name}</p>
                      <p className="text-sm text-yellow-700">{deadline.description}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${isOverdue(deadline.date) ? 'text-red-600' : 'text-yellow-600'}`}>
                        {format(deadline.date, 'MMM dd, yyyy')}
                      </p>
                      {isOverdue(deadline.date) && (
                        <Badge variant="destructive" className="mt-1">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1099 Forms Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>1099 Forms ({taxYear})</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Generate Forms
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Bulk Download
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Manage and track 1099 form generation and filing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {forms && forms.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Filed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell>
                        {getFormTypeBadge(form.form_type)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">Recipient {form.payee_id.slice(-8)}</p>
                          <p className="text-sm text-muted-foreground">
                            Tax Year: {form.tax_year}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(form.total_amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(form.form_status)}
                      </TableCell>
                      <TableCell>
                        {form.generated_at 
                          ? format(new Date(form.generated_at), 'MMM dd, yyyy')
                          : 'Not generated'
                        }
                      </TableCell>
                      <TableCell>
                        {form.filed_at 
                          ? format(new Date(form.filed_at), 'MMM dd, yyyy')
                          : 'Not filed'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {form.pdf_url && (
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          {form.form_status === 'generated' && (
                            <Button variant="ghost" size="sm">
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No 1099 Forms Yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate 1099 forms based on your tax transactions for {taxYear}
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Generate Your First 1099
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Required Forms Analysis */}
      {requiredForms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Required Forms Analysis</CardTitle>
            <CardDescription>
              Based on transaction data and IRS thresholds for {taxYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requiredForms.map((required, index) => {
                const existingForm = forms?.find(
                  form => form.payee_id === required.payeeId && form.form_type === required.formType
                );

                return (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        {getFormTypeBadge(required.formType)}
                      </div>
                      <div>
                        <p className="font-medium">Recipient {required.payeeId.slice(-8)}</p>
                        <p className="text-sm text-muted-foreground">
                          Total: {formatCurrency(required.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {existingForm ? (
                        getStatusBadge(existingForm.form_status)
                      ) : (
                        <Badge variant="outline" className="bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Missing
                        </Badge>
                      )}
                      {!existingForm && (
                        <Button size="sm">
                          Generate Form
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};