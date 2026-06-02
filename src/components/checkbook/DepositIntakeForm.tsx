import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Plus, Calendar, DollarSign, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';

interface DepositIntakeFormProps {
  userId: string;
  portfolioId?: string;
  onDepositCreated?: () => void;
}

interface DepositData {
  amount: string;
  deposit_date: string;
  payer_name: string;
  reference_number: string;
  notes: string;
}

export function DepositIntakeForm({ userId, portfolioId, onDepositCreated }: DepositIntakeFormProps) {
  const [depositData, setDepositData] = useState<DepositData>({
    amount: '',
    deposit_date: new Date().toISOString().split('T')[0],
    payer_name: '',
    reference_number: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof DepositData, value: string) => {
    setDepositData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositData.amount || parseFloat(depositData.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('deposits')
        .insert({
          user_id: userId,
          portfolio_id: portfolioId,
          amount: parseFloat(depositData.amount),
          deposit_date: depositData.deposit_date,
          payer_name: depositData.payer_name || null,
          reference_number: depositData.reference_number || null,
          notes: depositData.notes || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Deposit Created",
        description: `Successfully created deposit of ${formatCurrency(parseFloat(depositData.amount))}`
      });

      // Reset form
      setDepositData({
        amount: '',
        deposit_date: new Date().toISOString().split('T')[0],
        payer_name: '',
        reference_number: '',
        notes: ''
      });

      onDepositCreated?.();
    } catch (error) {
      console.error('Error creating deposit:', error);
      toast({
        title: "Error",
        description: "Failed to create deposit. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // For now, just show a placeholder message
    toast({
      title: "File Upload",
      description: `File "${file.name}" selected. CSV/XLS processing will be implemented in Phase 2.`,
      variant: "default"
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Manual Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Manual Deposit Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={depositData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="deposit_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Deposit Date *
              </Label>
              <Input
                id="deposit_date"
                type="date"
                value={depositData.deposit_date}
                onChange={(e) => handleInputChange('deposit_date', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="payer_name">Payer Name</Label>
              <Input
                id="payer_name"
                placeholder="e.g., Housing Authority, Bank Transfer"
                value={depositData.payer_name}
                onChange={(e) => handleInputChange('payer_name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                placeholder="Check #, Transfer ID, etc."
                value={depositData.reference_number}
                onChange={(e) => handleInputChange('reference_number', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Additional details about this deposit..."
                value={depositData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Deposit'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Remittance File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Drop your CSV/XLS file here</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Or click to browse and select a remittance file
            </p>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
              id="file-upload"
            />
            <Button 
              variant="outline" 
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Select File
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Supported formats: CSV, Excel (.xlsx, .xls)
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <h4 className="font-medium text-sm">Expected File Format:</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Amount column (required)</li>
              <li>Date column (required)</li>
              <li>Property/Unit identifier (optional)</li>
              <li>Tenant name (optional)</li>
              <li>Reference/memo (optional)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}