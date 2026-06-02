import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Plus, 
  Download, 
  Send, 
  Check,
  AlertTriangle,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useGenerate1099Form, useTaxTransactions, useTaxThresholds } from '@/hooks/useTaxData';
import { toast } from 'sonner';

interface TaxFormGeneratorProps {
  portfolioId?: string;
  taxYear: number;
  userId: string;
}

interface PayeeData {
  payee_id: string;
  total_amount: number;
  transaction_count: number;
  form_type: string;
  requires_1099: boolean;
  threshold_amount: number;
}

export const TaxFormGenerator: React.FC<TaxFormGeneratorProps> = ({
  portfolioId,
  taxYear,
  userId,
}) => {
  const [selectedFormType, setSelectedFormType] = useState<string>('1099_misc');
  const [generationStep, setGenerationStep] = useState<'review' | 'generating' | 'complete'>('review');
  const [generatedForms, setGeneratedForms] = useState<any[]>([]);

  const { data: transactions } = useTaxTransactions(portfolioId, taxYear);
  const { data: thresholds } = useTaxThresholds(taxYear);
  const generate1099Mutation = useGenerate1099Form();

  // Calculate required forms based on transactions and thresholds
  const getPayeeData = (): PayeeData[] => {
    if (!transactions || !thresholds) return [];

    const payeeAmounts: Record<string, { 
      amount: number; 
      count: number; 
      formType: string; 
      transactions: any[];
    }> = {};

    transactions.forEach(transaction => {
      const key = transaction.payee_id;
      const formType = transaction.form_type || '1099_misc';
      
      if (!payeeAmounts[key]) {
        payeeAmounts[key] = { 
          amount: 0, 
          count: 0, 
          formType,
          transactions: [] 
        };
      }
      
      payeeAmounts[key].amount += transaction.amount;
      payeeAmounts[key].count += 1;
      payeeAmounts[key].transactions.push(transaction);
    });

    return Object.entries(payeeAmounts).map(([payeeId, data]) => {
      const threshold = thresholds.find(t => t.form_type === data.formType)?.threshold_amount || 600;
      
      return {
        payee_id: payeeId,
        total_amount: data.amount,
        transaction_count: data.count,
        form_type: data.formType,
        requires_1099: data.amount >= threshold,
        threshold_amount: threshold,
      };
    }).filter(data => data.requires_1099);
  };

  const payeeData = getPayeeData();
  const filteredPayees = selectedFormType === 'all' 
    ? payeeData 
    : payeeData.filter(p => p.form_type === selectedFormType);

  const handleGenerateForm = async (payee: PayeeData) => {
    try {
      // Calculate box amounts based on form type
      const boxAmounts = calculateBoxAmounts(payee.form_type, payee.total_amount);
      
      const formData = {
        portfolio_id: portfolioId,
        payer_id: userId,
        payee_id: payee.payee_id,
        tax_year: taxYear,
        form_type: payee.form_type,
        total_amount: payee.total_amount,
        box_amounts: boxAmounts,
        form_status: 'generated',
        generated_at: new Date().toISOString(),
        created_by: userId,
      };

      await generate1099Mutation.mutateAsync(formData);
      
      setGeneratedForms(prev => [...prev, { ...formData, id: Date.now() }]);
      toast.success(`1099 form generated for payee ${payee.payee_id.slice(-8)}`);
      
    } catch (error) {
      toast.error('Failed to generate 1099 form');
      console.error('Form generation error:', error);
    }
  };

  const handleBulkGenerate = async () => {
    setGenerationStep('generating');
    
    try {
      for (const payee of filteredPayees) {
        await handleGenerateForm(payee);
      }
      setGenerationStep('complete');
      toast.success(`Generated ${filteredPayees.length} 1099 forms successfully`);
    } catch (error) {
      setGenerationStep('review');
      toast.error('Bulk generation failed');
    }
  };

  const calculateBoxAmounts = (formType: string, totalAmount: number) => {
    // This would typically include more complex logic based on transaction types
    switch (formType) {
      case '1099_misc':
        return {
          box_1: totalAmount, // Rents
          box_3: 0, // Other income
          box_7: 0, // Nonemployee compensation
        };
      case '1099_nec':
        return {
          box_1: totalAmount, // Nonemployee compensation
        };
      default:
        return { box_1: totalAmount };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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

  if (generationStep === 'generating') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generating 1099 Forms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              Generating {filteredPayees.length} forms for tax year {taxYear}...
            </p>
          </div>
          <Progress value={(generatedForms.length / filteredPayees.length) * 100} className="w-full" />
          <p className="text-sm text-center text-muted-foreground">
            {generatedForms.length} of {filteredPayees.length} forms completed
          </p>
        </CardContent>
      </Card>
    );
  }

  if (generationStep === 'complete') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Forms Generated Successfully
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">
              Successfully generated {generatedForms.length} 1099 forms
            </p>
            <p className="text-muted-foreground mb-4">
              Forms are ready for review and filing
            </p>
          </div>
          
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setGenerationStep('review')}>
              Generate More Forms
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download All PDFs
            </Button>
            <Button variant="outline">
              <Send className="w-4 h-4 mr-2" />
              File with IRS
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          1099 Form Generator
        </CardTitle>
        <CardDescription>
          Generate 1099 forms for tax year {taxYear} based on transaction data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form Type Filter */}
        <div className="flex items-center gap-4">
          <Label htmlFor="form-type">Form Type:</Label>
          <Select value={selectedFormType} onValueChange={setSelectedFormType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Forms</SelectItem>
              <SelectItem value="1099_misc">1099-MISC</SelectItem>
              <SelectItem value="1099_nec">1099-NEC</SelectItem>
              <SelectItem value="1099_k">1099-K</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Total Amount</span>
            </div>
            <p className="text-xl font-bold">
              {formatCurrency(filteredPayees.reduce((sum, p) => sum + p.total_amount, 0))}
            </p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Recipients</span>
            </div>
            <p className="text-xl font-bold">{filteredPayees.length}</p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Tax Year</span>
            </div>
            <p className="text-xl font-bold">{taxYear}</p>
          </div>
        </div>

        {/* Payee List */}
        {filteredPayees.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Recipients Requiring 1099 Forms</h3>
              <Button onClick={handleBulkGenerate} disabled={generate1099Mutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Generate All Forms
              </Button>
            </div>

            <div className="space-y-3">
              {filteredPayees.map((payee) => (
                <div key={payee.payee_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getFormTypeBadge(payee.form_type)}
                    <div>
                      <p className="font-medium">Recipient {payee.payee_id.slice(-8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {payee.transaction_count} transactions • Threshold: {formatCurrency(payee.threshold_amount)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(payee.total_amount)}</p>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                    </div>
                    
                    <Button 
                      size="sm"
                      onClick={() => handleGenerateForm(payee)}
                      disabled={generate1099Mutation.isPending}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No recipients meet the IRS threshold requirements for 1099 reporting in {taxYear}.
              {selectedFormType !== 'all' && (
                <span className="block mt-1">
                  Try selecting "All Forms" to see other form types.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Important Deadlines */}
        <div className="pt-4 border-t">
          <h3 className="font-medium mb-3">Important Deadlines for {taxYear + 1}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="font-medium text-yellow-800">Forms to Recipients</p>
              <p className="text-sm text-yellow-700">January 31, {taxYear + 1}</p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="font-medium text-blue-800">File with IRS</p>
              <p className="text-sm text-blue-700">March 31, {taxYear + 1} (Electronic)</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};