import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileOutput, Users, AlertCircle, AlertTriangle, FileText } from 'lucide-react';
import { useHUD50058Export, type ExportFormat } from '@/hooks/useHUD50058Export';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props { agencyId: string; }

const HUD50058Export: React.FC<Props> = ({ agencyId }) => {
  const { fetchAndExport, loading, recordCount, validationWarnings } = useHUD50058Export(agencyId);
  const [format, setFormat] = useState<ExportFormat>('csv');

  const handleExport = async () => {
    await fetchAndExport(format);
    if (recordCount === 0) {
      toast.warning('No active voucher leases found to export');
    } else {
      toast.success(`Exported ${recordCount} family records (${format === 'fixed_width' ? 'HUD Fixed-Width' : 'CSV'})`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">HUD 50058 Family Data Export</h3>
        <p className="text-sm text-muted-foreground">Export tenant family data in HUD PIC-compatible format</p>
      </div>

      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <FileOutput className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Batch Family Report Export</h4>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                Generates family data aligned to HUD 50058 field standards. Choose CSV for spreadsheets or Fixed-Width for HUD PIC submission.
              </p>
            </div>

            {/* Format Selector */}
            <div className="flex items-center gap-3 w-full max-w-sm">
              <span className="text-sm font-medium whitespace-nowrap">Export Format:</span>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      CSV (Excel-compatible)
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed_width">
                    <div className="flex items-center gap-2">
                      <FileOutput className="h-3.5 w-3.5" />
                      HUD Fixed-Width (.txt)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {format === 'fixed_width' && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-left w-full max-w-lg">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">HUD PIC FIXED-WIDTH FORMAT</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  170-character positional records per PIC Technical Reference. Fields include record type (058), PHA code, family demographics, income, rent calculations, and lease dates.
                </p>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4 text-left w-full max-w-lg">
              <p className="text-xs font-medium mb-2 text-muted-foreground">EXPORT INCLUDES:</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span>• Family ID & Head of Household</span>
                <span>• Date of Birth</span>
                <span>• Household Size</span>
                <span>• Annual Income</span>
                <span>• Voucher Number & Type</span>
                <span>• Move-in Date</span>
                <span>• Bedroom Size</span>
                <span>• Gross Rent</span>
                <span>• Utility Allowance</span>
                <span>• HAP Amount</span>
                <span>• Tenant Rent Portion</span>
                <span>• Lease Start / End</span>
                <span>• Disability Status</span>
                <span>• Race / Ethnicity</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-3 h-3" />
              <span>{format === 'csv' ? 'UTF-8 BOM encoded for Excel compatibility' : 'ASCII encoded per HUD PIC spec'}</span>
            </div>

            <Button onClick={handleExport} disabled={loading} size="lg">
              <Download className="w-4 h-4 mr-2" />
              {loading ? 'Generating...' : format === 'csv' ? 'Export 50058 Data (CSV)' : 'Export 50058 Data (HUD .txt)'}
            </Button>

            {recordCount > 0 && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Users className="w-4 h-4" /> Last export: {recordCount} families
              </p>
            )}

            {/* Validation Warnings */}
            {validationWarnings.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-left w-full max-w-lg">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {validationWarnings.length} VALIDATION WARNING{validationWarnings.length > 1 ? 'S' : ''}
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {validationWarnings.slice(0, 20).map((w, i) => (
                    <p key={i} className="text-xs text-amber-600 dark:text-amber-400">
                      <span className="font-mono">{w.familyId}</span> — {w.field}: {w.message}
                    </p>
                  ))}
                  {validationWarnings.length > 20 && (
                    <p className="text-xs text-amber-500">...and {validationWarnings.length - 20} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HUD50058Export;
