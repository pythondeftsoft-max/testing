import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { Building2 } from "lucide-react";

interface BankAccountSelectorProps {
  value?: string;
  onChange: (accountId: string) => void;
  label?: string;
}

export const BankAccountSelector = ({ value, onChange, label = "Source Bank Account" }: BankAccountSelectorProps) => {
  const { accounts, isLoading } = useBankAccounts();

  const payoutAccounts = accounts?.filter(acc => 
    (acc.status === 'active' || acc.status === 'linked') && acc.is_default_for_payouts
  ) || [];

  const displayAccounts = payoutAccounts.length > 0 ? payoutAccounts : accounts?.filter(acc => acc.status === 'active' || acc.status === 'linked') || [];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading accounts..." : "Select source account"} />
        </SelectTrigger>
        <SelectContent>
          {displayAccounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>
                  {account.institution_name} {account.account_type} ••••{account.mask}
                </span>
                {account.status !== 'active' && account.status !== 'linked' && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Reconnect Required
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
