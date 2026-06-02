import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RentHAPConfigurationProps {
  totalRent: string;
  tenantPortion: string;
  hapPortion: string;
  voucherType: string;
  onTotalRentChange: (value: string) => void;
  onTenantPortionChange: (value: string) => void;
  onHAPPortionChange: (value: string) => void;
  onVoucherTypeChange: (value: string) => void;
}

export const RentHAPConfiguration: React.FC<RentHAPConfigurationProps> = ({
  totalRent,
  tenantPortion,
  hapPortion,
  voucherType,
  onTotalRentChange,
  onTenantPortionChange,
  onHAPPortionChange,
  onVoucherTypeChange,
}) => {
  const [isFullHAP, setIsFullHAP] = useState(false);

  // Calculate balance
  const calculateBalance = () => {
    const total = parseFloat(totalRent) || 0;
    const tenant = parseFloat(tenantPortion) || 0;
    const hap = parseFloat(hapPortion) || 0;
    const splitTotal = tenant + hap;
    const difference = total - splitTotal;
    const isBalanced = Math.abs(difference) < 0.01;

    return { total, tenant, hap, splitTotal, difference, isBalanced };
  };

  const balance = calculateBalance();

  // Handle 100% HAP checkbox
  const handleFullHAPChange = (checked: boolean) => {
    setIsFullHAP(checked);
    if (checked) {
      onTenantPortionChange('0');
      onHAPPortionChange(totalRent || '0');
    }
  };

  // Auto-calculate HAP portion when tenant portion changes
  const handleTenantPortionChange = (value: string) => {
    onTenantPortionChange(value);
    const total = parseFloat(totalRent) || 0;
    const tenant = parseFloat(value) || 0;
    const calculatedHAP = Math.max(0, total - tenant);
    onHAPPortionChange(calculatedHAP.toFixed(2));
    setIsFullHAP(tenant === 0 && total > 0);
  };

  // Auto-calculate tenant portion when HAP portion changes
  const handleHAPPortionChange = (value: string) => {
    onHAPPortionChange(value);
    const total = parseFloat(totalRent) || 0;
    const hap = parseFloat(value) || 0;
    const calculatedTenant = Math.max(0, total - hap);
    onTenantPortionChange(calculatedTenant.toFixed(2));
    setIsFullHAP(calculatedTenant === 0 && total > 0);
  };

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-muted/20">
      <div className="flex items-center gap-2 pb-2 border-b">
        <DollarSign className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Rent & HAP Configuration</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Rent */}
        <div className="space-y-2">
          <Label htmlFor="total_rent">Total Rent (Contract Rent)</Label>
          <Input
            id="total_rent"
            type="number"
            step="0.01"
            value={totalRent}
            onChange={(e) => onTotalRentChange(e.target.value)}
            placeholder="0.00"
            className="text-lg font-semibold"
          />
        </div>

        {/* Voucher Type */}
        <div className="space-y-2">
          <Label htmlFor="voucher_type">Voucher Type</Label>
          <Select value={voucherType} onValueChange={onVoucherTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select voucher type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Section 8">Section 8</SelectItem>
              <SelectItem value="HCV">Housing Choice Voucher (HCV)</SelectItem>
              <SelectItem value="VASH">Veterans Affairs (VASH)</SelectItem>
              <SelectItem value="Project-Based">Project-Based</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tenant and HAP Portions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tenant_portion">Tenant Portion</Label>
          <Input
            id="tenant_portion"
            type="number"
            step="0.01"
            value={tenantPortion}
            onChange={(e) => handleTenantPortionChange(e.target.value)}
            placeholder="0.00"
            disabled={isFullHAP}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hap_portion">HAP Portion</Label>
          <Input
            id="hap_portion"
            type="number"
            step="0.01"
            value={hapPortion}
            onChange={(e) => handleHAPPortionChange(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* 100% HAP Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="full_hap"
          checked={isFullHAP}
          onCheckedChange={handleFullHAPChange}
        />
        <Label
          htmlFor="full_hap"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          100% HAP (Tenant pays $0)
        </Label>
      </div>

      {/* Balance Indicator */}
      {totalRent && (tenantPortion || hapPortion) && (
        <div
          className={cn(
            "p-4 rounded-lg border-2 text-sm",
            balance.isBalanced
              ? "bg-success/10 border-success/30 text-success-foreground"
              : "bg-warning/10 border-warning/30 text-warning-foreground"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-base">
              {balance.isBalanced ? '✓ Rent split balanced' : '⚠️ Rent split unbalanced'}
            </span>
            {!balance.isBalanced && (
              <Badge variant="outline" className="font-semibold">
                ${Math.abs(balance.difference).toFixed(2)} {balance.difference > 0 ? 'short' : 'over'}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Total rent:</span>
              <span className="ml-2 font-medium">${balance.total.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Split total:</span>
              <span className="ml-2 font-medium">${balance.splitTotal.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tenant:</span>
              <span className="ml-2 font-medium">
                ${balance.tenant.toFixed(2)} ({balance.total > 0 ? ((balance.tenant / balance.total) * 100).toFixed(1) : 0}%)
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">HAP:</span>
              <span className="ml-2 font-medium">
                ${balance.hap.toFixed(2)} ({balance.total > 0 ? ((balance.hap / balance.total) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
