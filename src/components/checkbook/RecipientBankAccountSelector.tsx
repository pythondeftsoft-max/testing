import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLandlordBankAccounts } from "@/hooks/useLandlordBankAccounts";
import { Building2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RecipientBankAccountSelectorProps {
  landlordId?: string;
  value?: string;
  onChange: (accountId: string) => void;
  label?: string;
  disabled?: boolean;
}

export const RecipientBankAccountSelector = ({ 
  landlordId, 
  value, 
  onChange, 
  label = "Pay to Account",
  disabled = false 
}: RecipientBankAccountSelectorProps) => {
  const { accounts, isLoading } = useLandlordBankAccounts(landlordId || null);

  if (!landlordId) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Alert variant="default" className="border-muted">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Select a property to view recipient's bank accounts
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Loading accounts..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Recipient has no bank accounts linked. They need to connect a bank account before receiving payments.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select recipient's bank account" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>
                  {account.institution_name} {account.account_type} ••••{account.mask}
                </span>
                {account.is_default_for_payouts && (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && accounts.find(a => a.id === value)?.is_default_for_payouts && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          Default payout account
        </p>
      )}
    </div>
  );
};
