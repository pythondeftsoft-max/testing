import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Download, Loader2 } from 'lucide-react';
import { exportPortfolioDataCSV } from '@/utils/portfolioReportUtils';
import { toast } from 'sonner';

interface RawDataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  portfolioName: string;
}

const DATA_TYPES = [
  { id: 'properties', label: 'Properties', description: 'All property details and configuration' },
  { id: 'rent_payments', label: 'Rent Payments', description: 'Payment history and transaction details' },
  { id: 'maintenance_requests', label: 'Maintenance Requests', description: 'Work orders and maintenance history' },
  { id: 'portfolio_assets', label: 'Portfolio Assets', description: 'Investment assets and holdings' },
  { id: 'rent_ledger', label: 'Rent Ledger', description: 'Detailed rent accounting records' },
  { id: 'vendor_payment_records', label: 'Vendor Payments', description: 'Payments to contractors and vendors' }
];

export const RawDataExportModal: React.FC<RawDataExportModalProps> = ({
  isOpen,
  onClose,
  portfolioId,
  portfolioName
}) => {
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>(['properties']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleDatasetToggle = (datasetId: string) => {
    setSelectedDatasets(prev => 
      prev.includes(datasetId) 
        ? prev.filter(id => id !== datasetId)
        : [...prev, datasetId]
    );
  };

  const handleExport = async () => {
    if (selectedDatasets.length === 0) {
      toast.error('Please select at least one dataset to export');
      return;
    }

    setIsExporting(true);
    
    try {
      await exportPortfolioDataCSV(
        portfolioId,
        portfolioName,
        selectedDatasets,
        startDate || undefined,
        endDate || undefined
      );
      
      toast.success(`Successfully exported ${selectedDatasets.length} dataset(s)`);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Portfolio Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dataset Selection */}
          <div>
            <Label className="text-base font-medium">Select Data to Export</Label>
            <div className="mt-3 space-y-3">
              {DATA_TYPES.map((dataType) => (
                <div key={dataType.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={dataType.id}
                    checked={selectedDatasets.includes(dataType.id)}
                    onCheckedChange={() => handleDatasetToggle(dataType.id)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor={dataType.id} className="font-medium cursor-pointer">
                      {dataType.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {dataType.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <Label className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range Filter (Optional)
            </Label>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-sm">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-sm">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Date filter applies to time-based data like payments and maintenance requests
            </p>
          </div>

          {/* Export Button */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || selectedDatasets.length === 0}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV Files
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};