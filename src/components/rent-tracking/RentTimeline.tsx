import React from 'react';
import { FileText, ExternalLink, Building2, CheckCircle, Trash2, Clock, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { SelfReportedRentEntry } from '@/hooks/useSelfReportedRent';
import type { UnifiedRentEntry } from '@/hooks/useUnifiedRentHistory';
import { generateReceiptPDF, type ReceiptData } from '@/utils/receiptGenerator';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function inferPointsBadge(entry: SelfReportedRentEntry): { pts: number; label: string } | null {
  if (!entry.plaid_transaction_id && !entry.proof_url) return null;

  if (entry.plaid_transaction_id) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const isCurrentMonth = entry.month === currentMonth && entry.year === currentYear;
    return isCurrentMonth
      ? { pts: 50, label: 'Bank verified' }
      : { pts: 25, label: 'Bank verified' };
  }

  if (entry.proof_url) {
    return { pts: 15, label: 'File proof' };
  }

  return null;
}

const RentTimeline = ({ entries, actualPointsMap, onDelete, collapsed = true, maxPreview = 1, onToggle, propertyName }: {
  entries: (SelfReportedRentEntry | UnifiedRentEntry)[];
  actualPointsMap?: Map<string, number>;
  onDelete?: (id: string) => void;
  collapsed?: boolean;
  maxPreview?: number;
  onToggle?: () => void;
  propertyName?: string;
}) => {
  const handleDownloadReceipt = (entry: SelfReportedRentEntry | UnifiedRentEntry) => {
    const receipt: ReceiptData = {
      transactionId: entry.id.slice(0, 8).toUpperCase(),
      propertyName: propertyName || 'Rental Property',
      amount: Number(entry.monthly_rent),
      currency: entry.currency_code || 'USD',
      date: `${entry.year}-${String(entry.month).padStart(2, '0')}-01`,
      paymentMethod: entry.plaid_transaction_id ? 'Bank Transfer' : entry.proof_url ? 'Manual (with proof)' : 'Self-reported',
    };
    generateReceiptPDF(receipt);
  };
  const openProof = async (proofUrl: string) => {
    const { data } = await supabase.storage.from('rent-proof').createSignedUrl(proofUrl, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No payments logged yet.</p>;
  }

  const visibleEntries = collapsed ? entries.slice(0, maxPreview) : entries;
  const hiddenCount = entries.length - maxPreview;

  return (
    <div className="space-y-3">
      {visibleEntries.map((entry) => {
        const isPlatform = (entry as UnifiedRentEntry).source === 'platform' || 
                           entry.verification_status === ('platform_verified' as any);
        const txData = entry.plaid_transaction_data as Record<string, unknown> | null;
        const txAmount = txData ? Number(txData.amount) : null;
        const txDate = txData ? String(txData.date ?? '') : null;
        const isMatch = txAmount !== null && Math.abs(txAmount - Number(entry.monthly_rent)) <= 1;
        const actualPts = actualPointsMap?.get(entry.id);
        const estimateBadge = isPlatform ? null : inferPointsBadge(entry as SelfReportedRentEntry);

        return (
          <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium min-w-[70px]">
                {MONTH_NAMES[entry.month - 1]} {entry.year}
              </div>
              <span className="text-sm font-semibold">
                {entry.currency_code} {Number(entry.monthly_rent).toLocaleString()}
              </span>
              {isPlatform ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[hsl(var(--chart-2)/0.12)] text-[hsl(var(--chart-2))]">
                  <CheckCircle className="h-3 w-3" />
                  Paid via OpenKey
                </span>
              ) : actualPts != null && actualPts > 0 ? (
                <span className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full bg-[hsl(var(--chart-2)/0.12)] text-[hsl(var(--chart-2))]">
                  +{actualPts} pts
                </span>
              ) : estimateBadge && !actualPts ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  ~{estimateBadge.pts} pts
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {!isPlatform && entry.proof_url && (
                <button
                  onClick={() => openProof(entry.proof_url!)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <FileText className="h-3 w-3" />
                  Proof
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
              {!isPlatform && entry.plaid_transaction_id && (
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  isMatch
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <Building2 className="h-3 w-3" />
                  {isMatch ? 'Bank Matched' : 'Bank Linked'}
                  {txDate && <span className="opacity-70 ml-1">· {txDate}</span>}
                </span>
              )}
              {!isPlatform && onDelete && (
                <button
                  onClick={() => onDelete(entry.id)}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete payment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => handleDownloadReceipt(entry)}
                className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                title="Download receipt"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
      {hiddenCount > 0 && onToggle && (
        <button
          onClick={onToggle}
          className="w-full text-center text-xs text-primary hover:underline py-1"
        >
          {collapsed ? `View all ${entries.length} payments` : 'Show less'}
        </button>
      )}
    </div>
  );
};

export default RentTimeline;
