import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Eye } from 'lucide-react';

interface LeasePreviewCardProps {
  tenantName: string;
  propertyAddress: string;
  unitNumber?: string;
  monthlyRent: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  confirmed: boolean;
  onConfirmChange: (confirmed: boolean) => void;
  onPreviewClick?: () => void;
  landlordSignature: string;
  onSignatureChange: (signature: string) => void;
}

export const LeasePreviewCard = ({
  tenantName,
  propertyAddress,
  unitNumber,
  monthlyRent,
  leaseStartDate,
  leaseEndDate,
  confirmed,
  onConfirmChange,
  onPreviewClick,
  landlordSignature,
  onSignatureChange,
}: LeasePreviewCardProps) => {
  const startDate = leaseStartDate || new Date().toLocaleDateString();
  const endDate = leaseEndDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString();

  return (
    <Card className="border-primary/20">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Lease Agreement Preview</h3>
          </div>
          {onPreviewClick && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onPreviewClick}
            >
              <Eye className="h-3 w-3 mr-1" />
              Preview Full Lease
            </Button>
          )}
        </div>
        
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div>
              <span className="font-semibold">Property:</span>
              <span className="ml-1.5">{propertyAddress}</span>
            </div>
            {unitNumber && (
              <div>
                <span className="font-semibold">Unit:</span>
                <span className="ml-1.5">{unitNumber}</span>
              </div>
            )}
            <div>
              <span className="font-semibold">Tenant:</span>
              <span className="ml-1.5">{tenantName}</span>
            </div>
            <div>
              <span className="font-semibold">Monthly Rent:</span>
              <span className="ml-1.5 font-bold text-primary">${monthlyRent.toFixed(2)}</span>
            </div>
            <div className="col-span-2">
              <span className="font-semibold">Period:</span>
              <span className="ml-1.5">{startDate} - {endDate}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="landlord-signature" className="text-xs font-medium">
              Type your full name to sign
            </Label>
            <Input
              id="landlord-signature"
              placeholder="Enter your full legal name"
              value={landlordSignature}
              onChange={(e) => onSignatureChange(e.target.value)}
              className="text-sm"
            />
          </div>
          
          <div className="flex items-start space-x-2 p-2 rounded-lg bg-accent/50 border">
            <Checkbox 
              id="confirm-lease" 
              checked={confirmed}
              onCheckedChange={onConfirmChange}
              disabled={!landlordSignature.trim()}
            />
            <Label 
              htmlFor="confirm-lease" 
              className={`text-xs font-medium leading-tight ${landlordSignature.trim() ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
            >
              I confirm the lease details are accurate and ready to send for digital signature
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
