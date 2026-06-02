import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useResolveDiscrepancy, EivDiscrepancy } from '@/hooks/eiv/useEivDiscrepancies';
import { CheckCircle2, XCircle, Eye } from 'lucide-react';

interface Props {
  agencyId: string;
  discrepancy: EivDiscrepancy;
  open: boolean;
  onClose: () => void;
}

const EivDiscrepancyDetail: React.FC<Props> = ({ agencyId, discrepancy, open, onClose }) => {
  const [notes, setNotes] = useState(discrepancy.resolution_notes || '');
  const resolve = useResolveDiscrepancy(agencyId);

  const handleAction = async (status: EivDiscrepancy['status']) => {
    await resolve.mutateAsync({ id: discrepancy.id, status, notes });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Income Discrepancy</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div>
            <p className="text-xs text-muted-foreground">Tenant</p>
            <p className="font-medium">{discrepancy.tenant_display_name || 'Unknown'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded p-3">
              <p className="text-xs text-muted-foreground">Tenant Declared</p>
              <p className="text-xl font-bold">${discrepancy.declared_amount.toLocaleString()}</p>
            </div>
            <div className="border rounded p-3 bg-destructive/5">
              <p className="text-xs text-muted-foreground">EIV Reported</p>
              <p className="text-xl font-bold">${discrepancy.eiv_amount.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm">Variance</span>
            <Badge variant="destructive">
              {discrepancy.variance_amount > 0 ? '+' : ''}${discrepancy.variance_amount.toLocaleString()}
              {' '}({discrepancy.variance_pct.toFixed(1)}%)
            </Badge>
          </div>

          <div>
            <Label className="text-xs">Resolution Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Document the verification outcome, contact attempts, recertification action..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleAction('under_review')}
              disabled={resolve.isPending}
            >
              <Eye className="w-4 h-4 mr-2" /> Under Review
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction('false_positive')}
              disabled={resolve.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" /> False Positive
            </Button>
            <Button
              className="col-span-2"
              onClick={() => handleAction('resolved')}
              disabled={resolve.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Resolved
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EivDiscrepancyDetail;
