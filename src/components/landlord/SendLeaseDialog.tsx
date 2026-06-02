import { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, AlertCircle, Eye, CalendarIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSendLease } from '@/hooks/useSendLease';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeasePreviewCard } from './LeasePreviewCard';
import { LeaseDocumentPreview } from './LeaseDocumentPreview';
import { usePlacementFeeConfig } from '@/hooks/usePlacementFeeConfig';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface SendLeaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  propertyId: string;
  tenantName: string;
  propertyAddress: string;
  unitId?: string;
  unitNumber?: string;
  monthlyRent: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
}

export const SendLeaseDialog = ({
  open,
  onOpenChange,
  applicationId,
  propertyId,
  tenantName,
  propertyAddress,
  unitId,
  unitNumber,
  monthlyRent,
  leaseStartDate,
  leaseEndDate,
}: SendLeaseDialogProps) => {
  const [leaseMethod, setLeaseMethod] = useState<'uploaded' | 'openkey'>('openkey');
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string>('');
  const [showLeasePreview, setShowLeasePreview] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [leaseConfirmed, setLeaseConfirmed] = useState(false);
  const [landlordSignature, setLandlordSignature] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Lease date state - default to today and 1 year from today
  const [startDate, setStartDate] = useState<Date>(() => new Date());
  const [endDate, setEndDate] = useState<Date>(() => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear;
  });
  
  const { mutate: sendLease, isPending } = useSendLease();
  const { data: placementFeeConfig } = usePlacementFeeConfig();

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    setUploadedFile(file);
    setUploading(true);

    try {
      // Upload to property-documents bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${propertyId}/leases/${Date.now()}-${file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-documents')
        .getPublicUrl(fileName);

      // Create document record (simplified - you may want to create a proper record in a documents table)
      setUploadedDocumentId(uploadData.path);
      toast.success('Lease document uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading lease:', error);
      toast.error(error.message || 'Failed to upload lease document');
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    disabled: uploading || isPending,
  });

  const handleSend = () => {
    if (leaseMethod === 'uploaded' && !uploadedDocumentId) {
      return;
    }

    if (leaseMethod === 'openkey' && !landlordSignature.trim()) {
      toast.error('Please sign the lease by typing your full name');
      return;
    }

    if (leaseMethod === 'openkey' && !leaseConfirmed) {
      toast.error('Please confirm the lease details before sending');
      return;
    }

    sendLease({
      applicationId,
      leaseMethod,
      leaseDocumentId: leaseMethod === 'uploaded' ? uploadedDocumentId : undefined,
      unitId: unitId,
      landlordSignature: leaseMethod === 'openkey' ? landlordSignature : undefined,
      leaseStartDate: format(startDate, 'yyyy-MM-dd'),
      leaseEndDate: format(endDate, 'yyyy-MM-dd'),
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setLeaseMethod('openkey');
        setUploadedDocumentId('');
        setShowLeasePreview(false);
        setLeaseConfirmed(false);
        setLandlordSignature('');
        setUploadedFile(null);
      },
    });
  };

  const placementFeePercentage = placementFeeConfig?.config_value?.percentage || 40;
  const estimatedFee = monthlyRent * (placementFeePercentage / 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Send Lease Agreement</DialogTitle>
          <DialogDescription>
            Send a lease agreement to {tenantName} and create a placement fee
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[80vh] overflow-y-auto">
          {/* Unit Info (read-only) */}
          {unitNumber && (
            <div className="rounded-lg bg-muted p-3">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-muted-foreground">Unit:</span>
                  <span className="font-medium ml-2">{unitNumber}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Monthly Rent:</span>
                  <span className="font-medium ml-2">${monthlyRent.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Lease Dates */}
          <div className="space-y-2">
            <Label>Lease Period</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      disabled={(date) => date < startDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Lease Method Selection */}
          <div className="space-y-2">
            <Label>Lease Method</Label>
            <RadioGroup value={leaseMethod} onValueChange={(val) => setLeaseMethod(val as 'uploaded' | 'openkey')}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="openkey" id="openkey" />
                <Label htmlFor="openkey" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileText className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">OpenKey Digital Signing</div>
                    <div className="text-xs text-muted-foreground">Use our built-in electronic signature system</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="uploaded" id="uploaded" />
                <Label htmlFor="uploaded" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Upload className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-semibold">Upload <span className="text-primary">Signed</span> Lease Document</div>
                    <div className="text-xs text-muted-foreground">Upload an already-signed lease from external source (skips digital signing)</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Document Upload (if uploaded method) */}
          {leaseMethod === 'uploaded' && (
            <div className="space-y-2">
              <Label>Lease Document</Label>
              {!uploadedFile ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  } ${uploading || isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  {uploading ? (
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  ) : isDragActive ? (
                    <p className="text-sm text-primary">Drop the lease document here</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium">Drag & drop your lease document here</p>
                      <p className="text-xs text-muted-foreground mt-1">or click to browse (PDF, DOC, DOCX)</p>
                    </>
                  )}
                </div>
              ) : (
                <Alert className="bg-primary/5 border-primary/20">
                  <FileText className="h-4 w-4 text-primary" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-sm">{uploadedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUploadedFile(null);
                        setUploadedDocumentId('');
                      }}
                      disabled={uploading || isPending}
                    >
                      Remove
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Lease Preview (if openkey method) */}
          {leaseMethod === 'openkey' && (
            <div className="space-y-3">
              {!showLeasePreview ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowLeasePreview(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Review and Sign
                </Button>
              ) : (
              <LeasePreviewCard
                  tenantName={tenantName}
                  propertyAddress={propertyAddress}
                  unitNumber={unitNumber}
                  monthlyRent={monthlyRent}
                  leaseStartDate={format(startDate, 'PPP')}
                  leaseEndDate={format(endDate, 'PPP')}
                  confirmed={leaseConfirmed}
                  onConfirmChange={setLeaseConfirmed}
                  onPreviewClick={() => setShowFullPreview(true)}
                  landlordSignature={landlordSignature}
                  onSignatureChange={setLandlordSignature}
                />
              )}
            </div>
          )}

          {/* Fee Estimate */}
          <Alert className="bg-muted">
            <AlertDescription>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly Rent:</span>
                  <span className="font-medium">${monthlyRent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Placement Fee:</span>
                  <span className="font-semibold text-primary">${estimatedFee.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Final fee will be calculated based on current platform configuration
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={
              isPending || 
              (leaseMethod === 'uploaded' && !uploadedDocumentId) || 
              (leaseMethod === 'openkey' && (!showLeasePreview || !landlordSignature.trim() || !leaseConfirmed))
            }
          >
            {isPending ? 'Sending...' : 'Send Lease'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <LeaseDocumentPreview
        open={showFullPreview}
        onOpenChange={setShowFullPreview}
        tenantName={tenantName}
        propertyAddress={propertyAddress}
        unitNumber={unitNumber}
        monthlyRent={monthlyRent}
        leaseStartDate={format(startDate, 'PPP')}
        leaseEndDate={format(endDate, 'PPP')}
        landlordSignature={landlordSignature}
        landlordSignedAt={landlordSignature ? new Date().toISOString() : undefined}
      />
    </Dialog>
  );
};
