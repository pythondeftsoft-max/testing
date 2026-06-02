import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ChevronDown, ChevronRight, Plus, Building2, Pencil, CreditCard, MoreVertical, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTaggedTransactions, useStopTracking, TaggedTransaction } from '@/hooks/usePaymentTaggingData';
import { AddPropertyTagModal } from './AddPropertyTagModal';
import { TrackPaymentModal } from './TrackPaymentModal';
import { EditPaymentTagModal } from './EditPaymentTagModal';
import { EditTransactionDisplayNameModal } from './EditTransactionDisplayNameModal';

interface TaggedTransactionsTableProps {
  landlordId: string;
  portfolioId?: string;
}

export const TaggedTransactionsTable = ({ landlordId, portfolioId }: TaggedTransactionsTableProps) => {
  const [minAmount, setMinAmount] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedTransaction, setSelectedTransaction] = useState<TaggedTransaction | null>(null);
  const [addTagModalOpen, setAddTagModalOpen] = useState(false);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [stopTrackingId, setStopTrackingId] = useState<string | null>(null);
  
  // Edit modal state
  const [editingSplit, setEditingSplit] = useState<TaggedTransaction['splits'][0] | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<TaggedTransaction | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // Edit name modal state
  const [editNameTransaction, setEditNameTransaction] = useState<TaggedTransaction | null>(null);
  const [editNameModalOpen, setEditNameModalOpen] = useState(false);

  const filters = {
    minAmount: minAmount ? Number(minAmount) : undefined,
  };

  const { data, isLoading } = useTaggedTransactions(filters);
  const stopTrackingMutation = useStopTracking();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddTag = (transaction: TaggedTransaction) => {
    setSelectedTransaction(transaction);
    setAddTagModalOpen(true);
  };

  const handleEditSplit = (split: TaggedTransaction['splits'][0], transaction: TaggedTransaction) => {
    setEditingSplit(split);
    setEditingTransaction(transaction);
    setEditModalOpen(true);
  };

  const handleStopTracking = async () => {
    if (!stopTrackingId) return;
    await stopTrackingMutation.mutateAsync(stopTrackingId);
    setStopTrackingId(null);
  };

  const getStatusDisplay = (transaction: TaggedTransaction) => {
    const remaining = transaction.remaining_balance;
    
    if (remaining === 0) {
      return <Badge className="bg-green-100 text-green-800">✓ Perfect</Badge>;
    } else if (remaining > 0) {
      return <Badge className="bg-orange-100 text-orange-800">+{formatCurrency(remaining)}</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">{formatCurrency(remaining)}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading transactions...
        </CardContent>
      </Card>
    );
  }

  const transactions = data?.transactions || [];

  return (
    <>
      {/* Header with filters and Track Payment button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Min Amount:</span>
            <Input
              type="number"
              placeholder="$0"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-[120px]"
            />
          </div>
          {minAmount && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMinAmount('')}
            >
              Clear
            </Button>
          )}
        </div>
        <Button onClick={() => setTrackModalOpen(true)} data-tour="track-payment-btn">
          <CreditCard className="h-4 w-4 mr-2" />
          Track Payment
        </Button>
      </div>

      <Card>
        {transactions.length === 0 ? (
          <CardContent className="p-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No tagged transactions</p>
            <p className="text-sm mt-1">
              Tagged payments will appear here with their allocation details.
            </p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Description/Source</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead className="text-right">Tagged / Tracked</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Units Tagged</TableHead>
                <TableHead>Last Tracked</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <Collapsible key={transaction.id} asChild>
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(transaction.id)}
                      >
                        <TableCell>
                          {expandedRows.has(transaction.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{transaction.display_name || transaction.description || 'Unknown'}</p>
                            {transaction.display_name && transaction.description && (
                              <p className="text-xs text-muted-foreground">Original: {transaction.description}</p>
                            )}
                            {!transaction.display_name && transaction.merchant_name && transaction.merchant_name !== transaction.description && (
                              <p className="text-xs text-muted-foreground">{transaction.merchant_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.bank_account ? (
                            <span className="text-sm">
                              {transaction.bank_account.institution_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            {transaction.remaining_balance === 0 ? (
                              <span className="text-green-600 font-medium">✓ Fully Allocated</span>
                            ) : (
                              <span className="text-orange-600 font-semibold">
                                {formatCurrency(transaction.remaining_balance)} remaining
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(transaction.total_tagged)} of {formatCurrency(transaction.amount)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusDisplay(transaction)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transaction.units_tagged_count === 0 ? 'No units' : `${transaction.units_tagged_count} unit(s)`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(transaction.last_tracked_date || transaction.transaction_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditNameTransaction(transaction);
                                    setEditNameModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Payment Name
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setStopTrackingId(transaction.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Stop Tracking
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      {expandedRows.has(transaction.id) && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={8} className="p-0">
                            <div className="p-4 space-y-3">
                              {/* Splits Detail */}
                              {transaction.splits && transaction.splits.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-muted-foreground">Allocated To:</p>
                                  <div className="grid gap-2">
                                    {transaction.splits.map((split) => {
                                      const expectedAmount = split.rent_info
                                        ? (split.tag_type === 'hap_voucher' ? split.rent_info.hap : split.rent_info.tenant)
                                        : 0;
                                      return (
                                        <div 
                                          key={split.id}
                                          className="grid grid-cols-[1fr_auto_auto] gap-4 items-center bg-background p-3 rounded-lg border"
                                        >
                                          {/* LEFT: Property Info */}
                                          <div className="flex items-center gap-3">
                                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <div>
                                              {split.portfolio_name && (
                                                <p className="text-xs font-semibold text-primary">{split.portfolio_name}</p>
                                              )}
                                              <p className="font-medium">{split.property?.address || 'Unknown'}</p>
                                              {split.unit && (
                                                <p className="text-sm text-muted-foreground">
                                                  Unit {split.unit.unit_name || split.unit.unit_number}
                                                </p>
                                              )}
                                              {split.rent_info && (
                                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                                                  <span>Total: {formatCurrency(split.rent_info.total)}</span>
                                                  <span className="text-muted-foreground/50">|</span>
                                                  <span className="text-green-600">HAP: {formatCurrency(split.rent_info.hap)}</span>
                                                  <span className="text-muted-foreground/50">|</span>
                                                  <span>
                                                    Tenant: {formatCurrency(split.rent_info.tenant)}
                                                    {split.rent_info.tenant_collection_method === 'stripe' && (
                                                      <span className="text-blue-500 ml-1">(Stripe)</span>
                                                    )}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* MIDDLE: Tenant Info */}
                                          <div className="text-center px-4 min-w-[120px]">
                                            {split.tenant_name ? (
                                              <div>
                                                <p className="text-xs text-muted-foreground">Tenant</p>
                                                <p className="font-medium text-blue-600">{split.tenant_name}</p>
                                              </div>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">No tenant</span>
                                            )}
                                          </div>
                                          
                                          {/* RIGHT: Badge + Amount + Edit */}
                                          <div className="flex items-center gap-4">
                                            <Badge variant="secondary">
                                              {split.tag_type === 'hap_voucher' ? 'HAP' : 
                                               split.tag_type === 'tenant_rent' ? 'Rent' : 'Other'}
                                            </Badge>
                                            <div className="text-right min-w-[100px]">
                                              <span className="font-medium text-green-600">
                                                {formatCurrency(split.amount)}
                                              </span>
                                              {expectedAmount > 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                  of {formatCurrency(expectedAmount)} expected
                                                </p>
                                              )}
                                            </div>
                                            <Button 
                                              size="sm" 
                                              variant="ghost"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditSplit(split, transaction);
                                              }}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : transaction.tag_type === 'tracked' ? (
                                <div className="flex items-center justify-between bg-orange-50 p-3 rounded-lg border border-orange-200">
                                  <div className="flex items-center gap-3">
                                    <Building2 className="h-4 w-4 text-orange-600" />
                                    <div>
                                      <p className="font-medium text-orange-800">No units assigned yet</p>
                                      <p className="text-sm text-orange-600">
                                        Go to "Untagged Properties" tab to allocate this deposit to properties/units.
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddTag(transaction);
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between bg-background p-3 rounded-lg border">
                                  <div className="flex items-center gap-3">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <p className="font-medium">Full transaction tagged</p>
                                  </div>
                                  <span className="font-medium text-green-600">
                                    {formatCurrency(transaction.amount)}
                                  </span>
                                </div>
                              )}

                              {/* Footer Summary */}
                              <div className="flex items-center justify-between pt-2 border-t text-sm">
                                <span className="text-muted-foreground">
                                  Transaction: {formatCurrency(transaction.amount)}
                                </span>
                                <span className="text-muted-foreground">
                                  Tagged: {formatCurrency(transaction.total_tagged)}
                                </span>
                                <span className={transaction.remaining_balance > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                                  {transaction.remaining_balance > 0 
                                    ? `Remaining: ${formatCurrency(transaction.remaining_balance)}`
                                    : 'Fully Allocated ✓'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Stop Tracking Confirmation Dialog */}
      <AlertDialog open={!!stopTrackingId} onOpenChange={(open) => !open && setStopTrackingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop tracking this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to stop tracking this payment? This will remove it from your tracked transactions list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleStopTracking}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddPropertyTagModal
        open={addTagModalOpen}
        onOpenChange={setAddTagModalOpen}
        transaction={selectedTransaction}
        landlordId={landlordId}
        portfolioId={portfolioId}
      />

      <TrackPaymentModal
        open={trackModalOpen}
        onOpenChange={setTrackModalOpen}
        landlordId={landlordId}
        portfolioId={portfolioId}
      />

      <EditPaymentTagModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        split={editingSplit}
        transaction={editingTransaction}
        landlordId={landlordId}
        onEditComplete={() => {
          setEditModalOpen(false);
          setEditingSplit(null);
          setEditingTransaction(null);
        }}
      />

      {editNameTransaction && (
        <EditTransactionDisplayNameModal
          open={editNameModalOpen}
          onOpenChange={(open) => {
            setEditNameModalOpen(open);
            if (!open) setEditNameTransaction(null);
          }}
          transactionId={editNameTransaction.id}
          currentDisplayName={editNameTransaction.display_name}
          originalDescription={editNameTransaction.description}
        />
      )}
    </>
  );
};