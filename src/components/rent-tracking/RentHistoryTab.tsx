import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSignedUploadUrls, uploadToSignedUrl } from '@/lib/signedUploadUtils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { History, Plus, Receipt, Pencil, Trash2, RefreshCw, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { LogPaymentSubmitData } from './LogPaymentDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { useUnifiedRentHistory, groupUnifiedByAddress, type UnifiedRentEntry } from '@/hooks/useUnifiedRentHistory';
import { useTenantRentals, useCreateTenantRental, useUpdateTenantRental, useDeleteTenantRental, TenantRental } from '@/hooks/useTenantRentals';
import { useLogRentPayment } from '@/hooks/useLogRentPayment';
import { useDeleteSelfReportedRent } from '@/hooks/useSelfReportedRent';
import { useUserBankAccounts } from '@/hooks/useUserBankAccounts';
import { useTenantBankSync } from '@/hooks/useTenantBankSync';
import { supabase } from '@/integrations/supabase/client';
import AddRentalDialog from './AddRentalDialog';
import LogPaymentDialog from './LogPaymentDialog';
import RentTimeline, { inferPointsBadge } from './RentTimeline';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RentalTemplate {
  address_text: string;
  landlord_name: string;
  monthly_rent: number;
  currency_code: string;
  start_month?: number;
  start_year?: number;
  end_month?: number;
  end_year?: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const isCurrentRental = (rental: TenantRental): boolean => {
  if (!rental.end_year || !rental.end_month) return true;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (rental.end_year > currentYear) return true;
  if (rental.end_year === currentYear && rental.end_month >= currentMonth) return true;
  return false;
};

function getTrackingStats(rental: TenantRental | undefined, entries: UnifiedRentEntry[]) {
  if (!rental?.start_month || !rental?.start_year) return null;
  const startVal = rental.start_year * 12 + rental.start_month;
  const now = new Date();
  const nowVal = now.getFullYear() * 12 + (now.getMonth() + 1);
  const endVal = (rental.end_year && rental.end_month) ? rental.end_year * 12 + rental.end_month : nowVal;
  const total = Math.max(1, endVal - startVal + 1);

  // Count unique tracked months
  const trackedSet = new Set<number>();
  let bankCount = 0;
  let fileCount = 0;
  let platformCount = 0;
  for (const e of entries) {
    const key = e.year * 12 + e.month;
    if (!trackedSet.has(key)) {
      trackedSet.add(key);
      if (e.source === 'platform') platformCount++;
      else if (e.plaid_transaction_id) bankCount++;
      else if (e.proof_url) fileCount++;
      else fileCount++; // manual entries count as uploaded
    }
  }
  return { tracked: trackedSet.size, total, bankCount, fileCount, platformCount };
}

const getMostRecentPayment = (entries: UnifiedRentEntry[]): string | null => {
  if (!entries || entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });
  const latest = sorted[0];
  return `${MONTH_NAMES[latest.month - 1]} ${latest.year}`;
};

const RentHistoryTab = () => {
  const { user } = useAuth();
  const { data: entries = [], isLoading: entriesLoading } = useUnifiedRentHistory();
  const { data: rentals = [], isLoading: rentalsLoading } = useTenantRentals();
  const { data: bankAccounts = [] } = useUserBankAccounts();
  const createRental = useCreateTenantRental();
  const updateRental = useUpdateTenantRental();
  const deleteRental = useDeleteTenantRental();
  const logPayment = useLogRentPayment();
  const deletePayment = useDeleteSelfReportedRent();

  const hasLinkedBank = bankAccounts.length > 0;
  const bankSync = useTenantBankSync();

  const [addRentalOpen, setAddRentalOpen] = useState(false);
  const [logPaymentOpen, setLogPaymentOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<RentalTemplate | null>(null);
  const [editingRental, setEditingRental] = useState<TenantRental | null>(null);
  const [deletingRentalId, setDeletingRentalId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());

  // Fetch actual awarded points from points_history
  const { data: pointsHistoryData = [] } = useQuery({
    queryKey: ['rent-points-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_history')
        .select('related_entity_id, points_change, event_type')
        .eq('user_id', user!.id)
        .like('event_type', 'rent_proof_%');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Build a map: rent_entry_id -> actual points awarded
  const actualPointsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const ph of pointsHistoryData) {
      if (ph.related_entity_id) {
        map.set(ph.related_entity_id, (map.get(ph.related_entity_id) || 0) + Number(ph.points_change));
      }
    }
    return map;
  }, [pointsHistoryData]);

  // Auto-backfill: run once per session to award missing points
  const queryClient = useQueryClient();
  const backfillRan = useRef(false);
  useEffect(() => {
    if (!user || backfillRan.current || entries.length === 0) return;
    // Check if any entries with proof are missing from actualPointsMap
    const hasMissing = entries.some(e =>
      e.source !== 'platform' && !e.plaid_transaction_id && e.proof_url && !actualPointsMap.has(e.id)
    );
    if (!hasMissing) return;
    backfillRan.current = true;
    supabase.functions.invoke('backfill-rent-points').then(({ data, error }) => {
      if (error) {
        console.error('[backfill-rent-points] error:', error);
        return;
      }
      if (data?.backfilled > 0) {
        queryClient.invalidateQueries({ queryKey: ['user-rent-points'] });
        queryClient.invalidateQueries({ queryKey: ['user-points-summary'] });
        toast({ title: `${data.total_points} points awarded`, description: `Synced ${data.backfilled} past payments` });
      }
    });
  }, [user, entries, actualPointsMap, queryClient]);

  const isLoading = entriesLoading || rentalsLoading;
  const grouped = groupUnifiedByAddress(entries);

  const allAddresses = new Set([
    ...Object.keys(grouped),
    ...rentals.map(r => r.address_text),
  ]);

  const getRentalInfo = (address: string): RentalTemplate => {
    const rental = rentals.find(r => r.address_text === address);
    if (rental) return {
      address_text: rental.address_text,
      landlord_name: rental.landlord_name || '',
      monthly_rent: Number(rental.monthly_rent),
      currency_code: rental.currency_code,
    };
    const first = grouped[address]?.[0];
    return {
      address_text: address,
      landlord_name: first?.landlord_name || '',
      monthly_rent: Number(first?.monthly_rent) || 0,
      currency_code: first?.currency_code || 'USD',
    };
  };

  const isPlatformOnly = (address: string) => {
    const addrEntries = grouped[address] || [];
    return addrEntries.length > 0 && addrEntries.every(e => e.source === 'platform');
  };

  const handleAddRental = (rental: RentalTemplate) => {
    createRental.mutate({
      address_text: rental.address_text,
      landlord_name: rental.landlord_name,
      monthly_rent: rental.monthly_rent,
      currency_code: rental.currency_code,
      start_month: rental.start_month,
      start_year: rental.start_year,
      end_month: rental.end_month,
      end_year: rental.end_year,
    });
  };

  const handleEditRental = (id: string, rental: RentalTemplate) => {
    updateRental.mutate({
      id,
      address_text: rental.address_text,
      landlord_name: rental.landlord_name,
      monthly_rent: rental.monthly_rent,
      currency_code: rental.currency_code,
      start_month: rental.start_month,
      start_year: rental.start_year,
      end_month: rental.end_month,
      end_year: rental.end_year,
    });
  };

  const handleConfirmDelete = () => {
    if (deletingRentalId) {
      deleteRental.mutate(deletingRentalId);
      setDeletingRentalId(null);
    }
  };

  const handleLogPayment = (address: string) => {
    const info = getRentalInfo(address);
    setSelectedRental(info);
    setLogPaymentOpen(true);
  };

  const handleSubmitPayment = async (data: LogPaymentSubmitData) => {
    if (!selectedRental) return;
    if (!user) {
      toast({ title: 'Not signed in', description: 'Please sign in to log payments.', variant: 'destructive' });
      return;
    }
    const amount = (data.plaid_transaction_data?.amount as number) ?? selectedRental.monthly_rent;

    // Upload proof file ONCE using signed URL (bypasses DB connection pool)
    let uploadedProofUrl: string | undefined;
    if (data.proofFile && user) {
      const ext = data.proofFile.name.split('.').pop() || 'pdf';
      const { data: signedUrls, error: urlError } = await getSignedUploadUrls([ext], undefined, 'rent-proof');
      if (urlError || !signedUrls?.[0]) {
        toast({ title: 'Upload failed', description: urlError?.message || 'Could not get upload URL', variant: 'destructive' });
        return;
      }
      const { path, token } = signedUrls[0];
      const { success, error: uploadError } = await uploadToSignedUrl(data.proofFile, path, token, 'rent-proof');
      if (!success) {
        toast({ title: 'Upload failed', description: uploadError?.message || 'File upload failed', variant: 'destructive' });
        return;
      }
      uploadedProofUrl = path;
    }

    // Process months in parallel batches of 5 for speed
    const monthsList = data.months;
    for (let i = 0; i < monthsList.length; i += 5) {
      const batch = monthsList.slice(i, i + 5);
      await Promise.all(batch.map(({ month, year }) =>
        logPayment.mutateAsync({
          address_text: selectedRental.address_text,
          landlord_name: selectedRental.landlord_name,
          monthly_rent: amount,
          currency_code: selectedRental.currency_code,
          month,
          year,
          payment_date: data.payment_date,
          notes: data.notes,
          proofFile: monthsList.length === 1 ? data.proofFile : undefined,
          proof_url: uploadedProofUrl,
          plaid_transaction_id: data.plaid_transaction_id,
          plaid_transaction_data: data.plaid_transaction_data ? { ...data.plaid_transaction_data } as Record<string, unknown> : undefined,
        })
      ));
    }
  };



  if (isLoading) {
    return (
      <CardEnhanced variant="elevated" className="max-w-2xl mx-auto">
        <CardEnhancedContent className="py-8 text-center text-muted-foreground">Loading...</CardEnhancedContent>
      </CardEnhanced>
    );
  }

  if (allAddresses.size === 0) {
    return (
      <>
        <CardEnhanced variant="elevated" className="max-w-2xl mx-auto">
          <CardEnhancedHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <History className="w-6 h-6 text-primary" />
              </div>
              <CardEnhancedTitle>Rent History</CardEnhancedTitle>
            </div>
          </CardEnhancedHeader>
          <CardEnhancedContent className="text-center py-8 space-y-4">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">Start tracking your rent payments to build your rental reputation.</p>
            <Button onClick={() => setAddRentalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Rental
            </Button>
          </CardEnhancedContent>
        </CardEnhanced>
        <AddRentalDialog open={addRentalOpen} onOpenChange={setAddRentalOpen} onSave={handleAddRental} />
      </>
    );
  }

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <History className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Rent History</h2>
          </div>
          <div className="flex items-center gap-2">
            {hasLinkedBank && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => bankSync.mutate()}
                disabled={bankSync.isPending}
                title="Sync full bank history"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${bankSync.isPending ? 'animate-spin' : ''}`} />
                Sync Bank
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setAddRentalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Rental
            </Button>
          </div>
        </div>

        {Array.from(allAddresses).map(address => {
          const info = getRentalInfo(address);
          const addressEntries = grouped[address] || [];
          const platformOnly = isPlatformOnly(address);
          const rentalRecord = rentals.find(r => r.address_text === address);
          const current = rentalRecord ? isCurrentRental(rentalRecord) : true;
          const lastPayment = getMostRecentPayment(addressEntries);
          return (
            <CardEnhanced key={address} variant="elevated">
              <CardEnhancedHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardEnhancedTitle className="text-base">{address}</CardEnhancedTitle>
                      <Badge variant={current ? 'success' : 'neutral'} className="text-[10px] px-1.5 py-0">
                        {current ? 'Current' : 'Past'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {info.currency_code} {info.monthly_rent.toLocaleString()}/mo
                      {info.landlord_name ? ` · ${info.landlord_name}` : ''}
                      {platformOnly && (
                        <span className="ml-2 inline-flex items-center text-xs font-medium text-[hsl(var(--chart-2))]">
                          · Paid via OpenKey
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lastPayment ? `Last payment: ${lastPayment}` : 'No payments logged'}
                    </p>
                    {(() => {
                      const stats = getTrackingStats(rentalRecord, addressEntries);
                      const totalPoints = addressEntries.reduce((sum, e) => {
                        const actual = actualPointsMap.get(e.id);
                        if (actual != null) return sum + actual;
                        // Estimate for unprocessed entries
                        const isPlatform = e.source === 'platform';
                        if (isPlatform) return sum;
                        const badge = inferPointsBadge(e as any);
                        return sum + (badge?.pts || 0);
                      }, 0);
                      if (!stats && totalPoints === 0) return null;
                      if (!stats) return (
                        <p className="text-xs mt-1.5 inline-flex items-center gap-1 text-[hsl(var(--chart-2))]">
                          <Star className="h-3 w-3" /> {totalPoints} pts earned
                        </p>
                      );
                      const pct = Math.round((stats.tracked / stats.total) * 100);
                      const parts: string[] = [];
                      if (stats.bankCount > 0) parts.push(`${stats.bankCount} bank`);
                      if (stats.fileCount > 0) parts.push(`${stats.fileCount} uploaded`);
                      if (stats.platformCount > 0) parts.push(`${stats.platformCount} platform`);
                      return (
                        <div className="mt-1.5 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Tracked: {stats.tracked} of {stats.total} months
                            {parts.length > 0 && ` (${parts.join(', ')})`}
                            {totalPoints > 0 && (
                              <span className="inline-flex items-center gap-1 ml-2 text-[hsl(var(--chart-2))] font-medium">
                                · <Star className="h-3 w-3" /> {totalPoints} pts earned
                              </span>
                            )}
                          </p>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-1">
                    {rentalRecord && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRental(rentalRecord); setAddRentalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingRentalId(rentalRecord.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {!platformOnly && (
                      <Button size="sm" onClick={() => handleLogPayment(address)}>
                        <Plus className="h-4 w-4 mr-1" /> Log Payment
                      </Button>
                    )}
                  </div>
                </div>
              </CardEnhancedHeader>
              <CardEnhancedContent>
                <RentTimeline
                  entries={addressEntries}
                  actualPointsMap={actualPointsMap}
                  onDelete={(id) => setDeletingPaymentId(id)}
                  collapsed={!expandedAddresses.has(address)}
                  onToggle={() => setExpandedAddresses(prev => {
                    const next = new Set(prev);
                    next.has(address) ? next.delete(address) : next.add(address);
                    return next;
                  })}
                />
              </CardEnhancedContent>
            </CardEnhanced>
          );
        })}
      </div>

      <AddRentalDialog
        open={addRentalOpen}
        onOpenChange={(v) => { setAddRentalOpen(v); if (!v) setEditingRental(null); }}
        onSave={handleAddRental}
        onEdit={handleEditRental}
        initialData={editingRental}
      />
      {selectedRental && (() => {
        const rentalRecord = rentals.find(r => r.address_text === selectedRental.address_text);
        const addressEntries = grouped[selectedRental.address_text] || [];
        const tracked = new Set<string>();
        for (const e of addressEntries) {
          tracked.add(`${e.year}-${String(e.month).padStart(2, '0')}`);
        }
        return (
          <LogPaymentDialog
            open={logPaymentOpen}
            onOpenChange={setLogPaymentOpen}
            rentalAddress={selectedRental.address_text}
            defaultRent={selectedRental.monthly_rent}
            defaultCurrency={selectedRental.currency_code}
            defaultLandlord={selectedRental.landlord_name}
            onSubmit={handleSubmitPayment}
            isPending={logPayment.isPending}
            hasLinkedBank={hasLinkedBank}
            trackingStats={getTrackingStats(rentalRecord, addressEntries)}
            rentalStartMonth={rentalRecord?.start_month ?? undefined}
            rentalStartYear={rentalRecord?.start_year ?? undefined}
            rentalEndMonth={rentalRecord?.end_month ?? undefined}
            rentalEndYear={rentalRecord?.end_year ?? undefined}
            trackedMonths={tracked}
          />
        );
      })()}

      <AlertDialog open={!!deletingRentalId} onOpenChange={(v) => { if (!v) setDeletingRentalId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rental</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rental? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingPaymentId} onOpenChange={(v) => { if (!v) setDeletingPaymentId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this logged payment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingPaymentId) { deletePayment.mutate(deletingPaymentId); setDeletingPaymentId(null); } }}
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

export default RentHistoryTab;
