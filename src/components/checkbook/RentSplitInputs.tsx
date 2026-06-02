import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface RentSplitInputsProps {
  totalRent: string;
  tenantPortion: string;
  voucherPortion: string;
  onTenantPortionChange: (value: string) => void;
  onVoucherPortionChange: (value: string) => void;
}

export const RentSplitInputs = ({
  totalRent,
  tenantPortion,
  voucherPortion,
  onTenantPortionChange,
  onVoucherPortionChange
}: RentSplitInputsProps) => {
  const total = parseFloat(totalRent || "0");
  const tenant = parseFloat(tenantPortion || "0");
  const voucher = parseFloat(voucherPortion || "0");
  const sum = tenant + voucher;
  const isBalanced = Math.abs(sum - total) < 0.01;

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Section 8 / Voucher Split</Label>
        {total > 0 && (
          <Badge variant={isBalanced ? "default" : "destructive"} className="gap-1">
            {isBalanced ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Balanced
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                ${Math.abs(sum - total).toFixed(2)} {sum > total ? "over" : "under"}
              </>
            )}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Total Rent (from property)</Label>
        <Input
          type="number"
          value={totalRent}
          disabled
          className="bg-background"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Tenant Portion</Label>
          <Input
            type="number"
            placeholder="0.00"
            step="0.01"
            value={tenantPortion}
            onChange={(e) => onTenantPortionChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Voucher/PHA Portion</Label>
          <Input
            type="number"
            placeholder="0.00"
            step="0.01"
            value={voucherPortion}
            onChange={(e) => onVoucherPortionChange(e.target.value)}
          />
        </div>
      </div>

      {!isBalanced && total > 0 && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Portions must add up to ${total.toFixed(2)}
        </p>
      )}
    </div>
  );
};
