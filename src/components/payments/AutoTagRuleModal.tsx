import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateAutoTagRule, useUpdateAutoTagRule, AutoTagRule } from '@/hooks/useLandlordPlaidTransactions';

interface AutoTagRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: AutoTagRule | null;
  landlordId: string;
  portfolioId?: string;
}

export const AutoTagRuleModal = ({
  open,
  onOpenChange,
  rule,
  landlordId,
  portfolioId,
}: AutoTagRuleModalProps) => {
  const [ruleName, setRuleName] = useState('');
  const [matchType, setMatchType] = useState<'description' | 'amount' | 'merchant' | 'combined'>('description');
  const [matchPattern, setMatchPattern] = useState('');
  const [matchAmountMin, setMatchAmountMin] = useState('');
  const [matchAmountMax, setMatchAmountMax] = useState('');
  const [matchMerchant, setMatchMerchant] = useState('');
  const [targetPropertyId, setTargetPropertyId] = useState('');
  const [targetUnitId, setTargetUnitId] = useState('');
  const [tagType, setTagType] = useState('tenant_rent');

  const createRule = useCreateAutoTagRule();
  const updateRule = useUpdateAutoTagRule();

  // Fetch properties
  const { data: properties } = useQuery({
    queryKey: ['properties-for-tagging', landlordId, portfolioId],
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select('id, address, property_units(id, unit_number, unit_name)')
        .eq('owner_id', landlordId)
        .is('deleted_at', null);

      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query.order('address');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const selectedProperty = properties?.find(p => p.id === targetPropertyId);
  const units = selectedProperty?.property_units || [];

  // Reset form when rule changes
  useEffect(() => {
    if (rule) {
      setRuleName(rule.rule_name);
      setMatchType(rule.match_type);
      setMatchPattern(rule.match_pattern || '');
      setMatchAmountMin(rule.match_amount_min?.toString() || '');
      setMatchAmountMax(rule.match_amount_max?.toString() || '');
      setMatchMerchant(rule.match_merchant || '');
      setTargetPropertyId(rule.target_property_id);
      setTargetUnitId(rule.target_unit_id || '');
      setTagType(rule.tag_type);
    } else {
      setRuleName('');
      setMatchType('description');
      setMatchPattern('');
      setMatchAmountMin('');
      setMatchAmountMax('');
      setMatchMerchant('');
      setTargetPropertyId('');
      setTargetUnitId('');
      setTagType('tenant_rent');
    }
  }, [rule, open]);

  const handleSubmit = async () => {
    if (!ruleName || !targetPropertyId) return;

    const params = {
      ruleName,
      matchType,
      matchPattern: matchPattern || undefined,
      matchAmountMin: matchAmountMin ? parseFloat(matchAmountMin) : undefined,
      matchAmountMax: matchAmountMax ? parseFloat(matchAmountMax) : undefined,
      matchMerchant: matchMerchant || undefined,
      targetPropertyId,
      targetUnitId: targetUnitId || undefined,
      tagType,
    };

    if (rule) {
      await updateRule.mutateAsync({ ruleId: rule.id, ...params });
    } else {
      await createRule.mutateAsync(params);
    }

    onOpenChange(false);
  };

  const isValid = ruleName && targetPropertyId && (
    (matchType === 'description' && matchPattern) ||
    (matchType === 'merchant' && matchMerchant) ||
    (matchType === 'amount' && (matchAmountMin || matchAmountMax)) ||
    (matchType === 'combined')
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Rule' : 'Create Auto-Tag Rule'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rule Name */}
          <div className="space-y-2">
            <Label>Rule Name *</Label>
            <Input
              placeholder="e.g., Monthly HAP from Nassau County"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
            />
          </div>

          {/* Match Type */}
          <div className="space-y-2">
            <Label>Match By *</Label>
            <Select value={matchType} onValueChange={(v) => setMatchType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="description">Description Contains</SelectItem>
                <SelectItem value="merchant">Merchant Name</SelectItem>
                <SelectItem value="amount">Amount Range</SelectItem>
                <SelectItem value="combined">Combined (All Criteria)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Match Pattern (for description/combined) */}
          {(matchType === 'description' || matchType === 'combined') && (
            <div className="space-y-2">
              <Label>Description Contains {matchType === 'description' ? '*' : ''}</Label>
              <Input
                placeholder="e.g., HAP PAYMENT, HOUSING AUTHORITY"
                value={matchPattern}
                onChange={(e) => setMatchPattern(e.target.value)}
              />
            </div>
          )}

          {/* Merchant (for merchant/combined) */}
          {(matchType === 'merchant' || matchType === 'combined') && (
            <div className="space-y-2">
              <Label>Merchant Contains {matchType === 'merchant' ? '*' : ''}</Label>
              <Input
                placeholder="e.g., NASSAU COUNTY"
                value={matchMerchant}
                onChange={(e) => setMatchMerchant(e.target.value)}
              />
            </div>
          )}

          {/* Amount Range (for amount/combined) */}
          {(matchType === 'amount' || matchType === 'combined') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min Amount {matchType === 'amount' ? '*' : ''}</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={matchAmountMin}
                  onChange={(e) => setMatchAmountMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Any"
                  value={matchAmountMax}
                  onChange={(e) => setMatchAmountMax(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Target Property */}
          <div className="space-y-2">
            <Label>Target Property *</Label>
            <Select value={targetPropertyId} onValueChange={(v) => {
              setTargetPropertyId(v);
              setTargetUnitId('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties?.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Unit (if multi-unit) */}
          {units.length > 1 && (
            <div className="space-y-2">
              <Label>Target Unit (optional)</Label>
              <Select value={targetUnitId} onValueChange={setTargetUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="All units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Units</SelectItem>
                  {units.map((unit: any) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      Unit {unit.unit_name || unit.unit_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tag Type */}
          <div className="space-y-2">
            <Label>Tag As *</Label>
            <Select value={tagType} onValueChange={setTagType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant_rent">Tenant Rent Payment</SelectItem>
                <SelectItem value="hap_voucher">HAP / Voucher Payment</SelectItem>
                <SelectItem value="other">Other Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createRule.isPending || updateRule.isPending}
          >
            {(createRule.isPending || updateRule.isPending) ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
