import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Wand2 } from 'lucide-react';
import { useLandlordAutoTagRules, useUpdateAutoTagRule, useDeleteAutoTagRule, AutoTagRule } from '@/hooks/useLandlordPlaidTransactions';
import { AutoTagRuleModal } from './AutoTagRuleModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AutoTagRulesTableProps {
  landlordId: string;
  portfolioId?: string;
}

export const AutoTagRulesTable = ({ landlordId, portfolioId }: AutoTagRulesTableProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoTagRule | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  const { data, isLoading } = useLandlordAutoTagRules();
  const updateRule = useUpdateAutoTagRule();
  const deleteRule = useDeleteAutoTagRule();

  const rules = data?.rules || [];

  const handleEdit = (rule: AutoTagRule) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const handleToggleActive = async (rule: AutoTagRule) => {
    await updateRule.mutateAsync({
      ruleId: rule.id,
      isActive: !rule.is_active,
    });
  };

  const handleDelete = async () => {
    if (deleteRuleId) {
      await deleteRule.mutateAsync(deleteRuleId);
      setDeleteRuleId(null);
    }
  };

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case 'description': return 'Description';
      case 'amount': return 'Amount Range';
      case 'merchant': return 'Merchant';
      case 'combined': return 'Combined';
      default: return type;
    }
  };

  const getTagTypeLabel = (type: string) => {
    switch (type) {
      case 'tenant_rent': return 'Rent';
      case 'hap_voucher': return 'HAP';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading rules...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Auto-Tag Rules
          </CardTitle>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No auto-tag rules yet</p>
              <p className="text-sm mt-1">
                Create rules to automatically tag recurring payments like monthly HAP deposits.
              </p>
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create First Rule
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Match Type</TableHead>
                  <TableHead>Match Criteria</TableHead>
                  <TableHead>Target Property</TableHead>
                  <TableHead>Tag As</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.rule_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getMatchTypeLabel(rule.match_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {rule.match_pattern && <div>Contains: "{rule.match_pattern}"</div>}
                      {rule.match_merchant && <div>Merchant: "{rule.match_merchant}"</div>}
                      {(rule.match_amount_min !== null || rule.match_amount_max !== null) && (
                        <div>
                          Amount: {formatCurrency(rule.match_amount_min)} - {formatCurrency(rule.match_amount_max)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {rule.property?.address || '—'}
                        {rule.unit && (
                          <span className="text-muted-foreground">
                            {' '}/ Unit {rule.unit.unit_name || rule.unit.unit_number}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={rule.tag_type === 'hap_voucher' ? 'default' : 'secondary'}
                      >
                        {getTagTypeLabel(rule.tag_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggleActive(rule)}
                        disabled={updateRule.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(rule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteRuleId(rule.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AutoTagRuleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        rule={editingRule}
        landlordId={landlordId}
        portfolioId={portfolioId}
      />

      <AlertDialog open={!!deleteRuleId} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this auto-tag rule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
