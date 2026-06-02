import { Badge } from '@/components/ui/badge';
import { Globe, CreditCard } from 'lucide-react';

interface Props {
  software?: string[] | null;
  paymentMethod?: string | null;
  hasOnlinePortal?: boolean | null;
  portalVendor?: string | null;
  compact?: boolean;
}

const VENDOR_COLORS: Record<string, string> = {
  HAPPY: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  Emphasys: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  Yardi: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  Tenmast: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  MRI: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30',
  RentCafe: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  Partner: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  Nelnet: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  Checkbook: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
};

export function TechStackChips({
  software,
  paymentMethod,
  hasOnlinePortal,
  portalVendor,
  compact,
}: Props) {
  const list = software ?? [];
  const hasAnything =
    list.length > 0 || paymentMethod || hasOnlinePortal != null || portalVendor;

  if (!hasAnything) {
    return (
      <span className="text-xs italic text-muted-foreground">No web data yet</span>
    );
  }

  const items = compact ? list.slice(0, 2) : list;
  const overflow = compact ? list.length - items.length : 0;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((s) => (
        <Badge
          key={s}
          variant="outline"
          className={`text-[10px] ${VENDOR_COLORS[s] ?? ''}`}
        >
          {s}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge variant="outline" className="text-[10px]">
          +{overflow}
        </Badge>
      )}
      {portalVendor === 'none-detected' && (
        <Badge
          variant="outline"
          className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
          title="Deep-scanned multiple pages — no known vendor fingerprints. Likely homegrown or static site."
        >
          <Globe className="mr-0.5 h-2.5 w-2.5" />
          Likely homegrown
        </Badge>
      )}
      {portalVendor !== 'none-detected' && hasOnlinePortal === false && (
        <Badge
          variant="outline"
          className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
        >
          <Globe className="mr-0.5 h-2.5 w-2.5" />
          No portal
        </Badge>
      )}
      {hasOnlinePortal === true && portalVendor && portalVendor !== 'none-detected' && (
        <Badge variant="outline" className="text-[10px]">
          <Globe className="mr-0.5 h-2.5 w-2.5" />
          {portalVendor}
        </Badge>
      )}
      {paymentMethod && !compact && (
        <Badge variant="outline" className="text-[10px]">
          <CreditCard className="mr-0.5 h-2.5 w-2.5" />
          {paymentMethod}
        </Badge>
      )}
    </div>
  );
}
