import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronDown, 
  ChevronRight, 
  Check, 
  X, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  HelpCircle,
  Lock,
  Copy,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { CommandMatch, MatchBreakdown } from '@/hooks/useMatchCommandCenter';
import { getTierLabel, getFactorColor, normalizeBreakdown } from '@/hooks/useMatchCommandCenter';
import TenantProfileModal from '@/components/TenantProfileModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PushStatusBadge } from '@/components/admin/matchmaker/SubStageBadge';
import { PreviousPushMarker } from '@/components/admin/matchmaker/PreviousPushMarker';
import { fetchAndCopyTenantInfo } from '@/utils/copyTenantInfo';

// Relative time helper
const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export type ViewMode = 'tenant' | 'property';

interface TenantGroup {
  tenantId: string;
  tenantName: string;
  tenantEmail: string | null;
  tenantPhone: string | null;
  tenantBudget: number | null;
  tenantBedrooms: (number | string)[] | null;
  tenantCity: string | null;
  tenantState: string | null;
  tenantVoucher: boolean;
  bestScore: number;
  allMatches: CommandMatch[];
  totalMatches: number;
}

interface PropertyGroup {
  unitId: string;
  propertyId: string;
  propertyAddress: string;
  propertyUnitNumber: string | null;
  propertyRent: number | null;
  propertyBedrooms: number | null;
  propertyCity: string | null;
  propertyState: string | null;
  propertyPhotos: string[];
  listedDate: string | null;
  daysOnMarket: number | null;
  bestScore: number;
  allMatches: CommandMatch[];
  totalMatches: number;
  activePushCount: number;  // Count of active pushes for this property
  unitCount?: number;  // Number of units in this building (for multi-unit)
  propertyBedroomsDisplay?: number | string | null; // Display string for bedroom range
}

interface GroupedMatchTableProps {
  viewMode: ViewMode;
  tenantGroups: TenantGroup[];
  propertyGroups: PropertyGroup[];
  onMatchClick: (match: CommandMatch) => void;
  onApprove: (match: CommandMatch) => void;
  onReject: (match: CommandMatch) => void;
}

// Helper: Score badge with percentage and tier label
const ScoreBadge = ({ score, match }: { score: number; match?: CommandMatch }) => {
  const tier = getTierLabel(score);
  
  // Calculate confidence based on data completeness
  const getConfidenceIndicator = () => {
    if (!match) return null;
    let missingFields = 0;
    if (!match.tenant_budget) missingFields++;
    if (!match.tenant_bedrooms?.length) missingFields++;
    if (!match.drive_time_minutes) missingFields++;
    
    if (missingFields === 0) return null;
    if (missingFields === 1) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground ml-0.5">~</span>
          </TooltipTrigger>
          <TooltipContent>Some data missing - confidence may vary</TooltipContent>
        </Tooltip>
      );
    }
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="w-3 h-3 text-orange-500 ml-0.5 inline" />
        </TooltipTrigger>
        <TooltipContent>Low confidence - missing budget, beds, or drive time</TooltipContent>
      </Tooltip>
    );
  };
  
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono font-medium">{score}%</span>
      <span className={cn("text-xs font-medium", tier.className)}>{tier.label}</span>
      {getConfidenceIndicator()}
    </span>
  );
};

// Match drivers - horizontal factor strip showing ALL factors
const MatchDrivers = ({ breakdown, hasVoucher }: { breakdown: MatchBreakdown; hasVoucher?: boolean }) => {
  // Normalize breakdown to handle legacy point-based data
  const b = normalizeBreakdown(breakdown);
  
  // Show ALL factors in fixed order (not sorted)
  const factors: { label: string; value: number }[] = [
    { label: 'Loc', value: b.location },
    { label: 'Budget', value: b.budget },
    { label: 'Beds', value: b.bedrooms },
    { label: 'Timing', value: b.move_in },
  ];
  
  // Add voucher factor if tenant has voucher
  if (hasVoucher) {
    factors.push({ label: 'Voucher', value: 100 });
  }
  
  return (
    <div className="flex items-center gap-0.5 flex-nowrap">
      {factors.map((f) => (
        <span
          key={f.label}
          className={cn(
            "inline-flex items-center text-[9px] px-1 py-0 rounded font-medium whitespace-nowrap",
            getFactorColor(f.value)
          )}
        >
          {f.label} {f.value}%
        </span>
      ))}
    </div>
  );
};

// Days on market urgency indicator
const DaysOnMarketBadge = ({ days }: { days: number | null }) => {
  if (days === null) {
    return <Badge variant="secondary" className="text-xs font-mono">Vacant</Badge>;
  }
  
  if (days > 30) {
    return (
      <Badge variant="destructive" className="text-xs font-mono">
        {days}d ⚠️
      </Badge>
    );
  }
  
  if (days > 14) {
    return (
      <Badge variant="warning" className="text-xs font-mono">
        {days}d
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className="text-xs font-mono">
      {days}d
    </Badge>
  );
};

// Time seeking indicator - shows how long tenant has been searching
const DaysSeekingBadge = ({ seekingSince }: { seekingSince: string | null }) => {
  if (!seekingSince) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  
  const days = Math.floor((Date.now() - new Date(seekingSince).getTime()) / (1000 * 60 * 60 * 24));
  
  // Longer search = more urgent to place
  if (days > 60) {
    return (
      <span 
        className="text-xs text-red-600 font-medium" 
        title={`Searching since ${new Date(seekingSince).toLocaleDateString()}`}
      >
        {days}d 🔥
      </span>
    );
  }
  
  if (days > 30) {
    return (
      <span 
        className="text-xs text-orange-600" 
        title={`Searching since ${new Date(seekingSince).toLocaleDateString()}`}
      >
        {days}d
      </span>
    );
  }
  
  return (
    <span 
      className="text-xs text-muted-foreground" 
      title={`Searching since ${new Date(seekingSince).toLocaleDateString()}`}
    >
      {days}d
    </span>
  );
};

// Helper: Budget fit indicator - show budget value even if rent is unknown
const BudgetFit = ({ rent, budget }: { rent: number | null; budget: number | null }) => {
  if (!budget) return <span className="text-muted-foreground">—</span>;
  
  // If no rent to compare, just show the budget
  if (!rent) {
    return <span className="text-muted-foreground">{formatCurrency(budget)}</span>;
  }
  
  const fits = budget >= rent;
  const marginal = budget >= rent * 0.9 && budget < rent;
  
  return (
    <span className={fits ? 'text-green-600' : marginal ? 'text-orange-500' : 'text-red-500'}>
      {fits ? '✓' : marginal ? '⚠️' : '✕'} {formatCurrency(budget)}
    </span>
  );
};

// Helper: Bedrooms fit indicator - handle both number[] and string[] formats
const BedsFit = ({ required, approved }: { required: number | null; approved: (number | string)[] | null }) => {
  if (!required || !approved?.length) return <span className="text-muted-foreground">—</span>;
  
  // Parse approved bedrooms - handle formats like "2BR", "5BR+", or plain numbers
  const parsedApproved = approved.map(br => {
    if (typeof br === 'number') return br;
    const match = String(br).match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }).filter((n): n is number => n !== null);
  
  if (!parsedApproved.length) return <span className="text-muted-foreground">—</span>;
  
  const fits = parsedApproved.includes(required);
  const displayText = approved.map(br => 
    typeof br === 'number' ? `${br}BR` : String(br).replace(/BR/i, 'BR')
  ).join('/');
  
  return (
    <span className={fits ? 'text-green-600' : 'text-orange-500'}>
      {fits ? '✓' : '⚠️'} {displayText}
    </span>
  );
};

// Property row with horizontal layout
const PropertyGroupRow = ({
  group,
  onMatchClick,
  onApprove,
  onReject,
}: {
  group: PropertyGroup;
  onMatchClick: (match: CommandMatch) => void;
  onApprove: (match: CommandMatch) => void;
  onReject: (match: CommandMatch) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewingTenantId, setViewingTenantId] = useState<string | null>(null);
  const [showAllTenants, setShowAllTenants] = useState(false);
  
  // Determine which matches to display based on expand state
  const displayedMatches = showAllTenants 
    ? group.allMatches 
    : group.allMatches.slice(0, 5);
  
  const address = group.propertyUnitNumber 
    ? `${group.propertyAddress} #${group.propertyUnitNumber}`
    : group.propertyAddress;
    
  const location = group.propertyCity && group.propertyState 
    ? `${group.propertyCity}, ${group.propertyState}`
    : group.propertyState || '—';
  
  const bedsDisplay = group.propertyBedroomsDisplay ?? group.propertyBedrooms ?? '?';
  const rentBeds = `${group.propertyRent ? formatCurrency(group.propertyRent) : '—'} / ${bedsDisplay}BR`;
  
  
  const displayedCount = Math.min(5, group.allMatches.length);
  const candidatesLabel = `Top ${displayedCount} of ${group.totalMatches}`;

  return (
    <>
      {/* Property Header Row */}
      <TableRow 
        className="cursor-pointer hover:bg-muted/50 h-14 group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="w-10 px-3">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          )}
        </TableCell>
        <TableCell className="w-[200px] font-medium truncate">
          <span className="flex items-center gap-1.5">
            {address}
            {(group.unitCount ?? 0) > 1 && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 font-mono">
                {group.unitCount} units
              </Badge>
            )}
          </span>
        </TableCell>
        <TableCell className="w-[100px] text-sm">
          {rentBeds}
        </TableCell>
        <TableCell className="w-[120px] text-sm text-muted-foreground">
          {location}
        </TableCell>
        <TableCell className="w-[70px]">
          <DaysOnMarketBadge days={group.daysOnMarket} />
        </TableCell>
        <TableCell className="w-[80px]">
          <ScoreBadge score={group.bestScore} />
        </TableCell>
        <TableCell className="w-[100px] text-sm">
          {candidatesLabel}
        </TableCell>
        <TableCell className="w-[120px]">
          <div className="flex flex-col gap-0.5">
            <Badge
              variant={group.activePushCount === 0 ? 'outline' : group.activePushCount >= 3 ? 'secondary' : 'default'}
              className="text-[10px] w-fit"
            >
              {group.activePushCount}/3 pushed
            </Badge>
            {/* Show pushed tenant names with timing */}
            {group.allMatches
              .filter(m => m.push_status)
              .slice(0, 3)
              .map(m => (
                <span key={m.tenant_id} className="text-[10px] text-muted-foreground truncate max-w-[110px]" title={m.tenant_name}>
                  {m.tenant_name} · {m.push_date ? timeAgo(m.push_date) : ''}
                </span>
              ))}
          </div>
        </TableCell>
      </TableRow>
      
      {/* Expanded Tenant Section */}
      {isOpen && (
        <>
          {/* Sub-header row for tenant columns */}
          <TableRow className="bg-muted/40 h-7 border-0">
            <TableCell className="w-10 px-3"></TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">
              Tenant
            </TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">
              Status
            </TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">
              Seeking
            </TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">
              Score
            </TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">
              Drive
            </TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">
              Why
            </TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">
              Budget / Beds
            </TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">
              Action
            </TableCell>
          </TableRow>
          
          {/* Tenant decision rows */}
          {displayedMatches.map((match) => (
            <TableRow 
              key={`${match.tenant_id}-${match.unit_id}`}
              className="bg-muted/20 h-9 cursor-pointer hover:bg-muted/40 border-0"
              onClick={() => onMatchClick(match)}
            >
              <TableCell className="w-10 px-3"></TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm truncate">{match.tenant_name}</span>
                  <PreviousPushMarker
                    tenantId={match.tenant_id}
                    unitId={match.unit_id}
                    tenantName={match.tenant_name}
                    propertyAddress={match.property_address}
                  />
                </div>
              </TableCell>
              <TableCell>
                {match.push_status ? (
                  <PushStatusBadge status={match.push_status} size="sm" />
                ) : match.tenant_has_other_push ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-600">
                        <Lock className="w-3 h-3 mr-1" />
                        Committed
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Active push to another property</TooltipContent>
                  </Tooltip>
                ) : null}
              </TableCell>
              <TableCell>
                <DaysSeekingBadge seekingSince={match.tenant_seeking_since} />
              </TableCell>
              <TableCell>
                <ScoreBadge score={match.score} match={match} />
              </TableCell>
              <TableCell>
                {match.drive_time_minutes != null ? (
                  <span className={cn(
                    "text-xs font-mono",
                    match.drive_time_minutes <= 15 ? "text-green-600" :
                    match.drive_time_minutes <= 30 ? "text-foreground" :
                    match.drive_time_minutes <= 45 ? "text-orange-500" :
                    "text-red-500"
                  )}>
                    {match.drive_time_source === 'estimated' ? '~' : ''}{match.drive_time_minutes}m
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <MatchDrivers breakdown={match.breakdown} hasVoucher={match.tenant_voucher} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-xs">
                  <BudgetFit rent={group.propertyRent} budget={match.tenant_budget} />
                  <span className="text-muted-foreground">|</span>
                  <BedsFit required={group.propertyBedrooms} approved={match.tenant_bedrooms} />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                    onClick={() => setViewingTenantId(match.tenant_id)}
                    title="View tenant profile"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  {!match.push_status && !match.tenant_has_other_push && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                      onClick={() => onApprove(match)}
                      title="Approve match"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-100"
                    onClick={() => onReject(match)}
                    title="Reject match"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          
          {/* Show more button - collapsed state */}
          {group.totalMatches > 5 && !showAllTenants && (
            <TableRow className="bg-muted/10 h-8 border-0">
              <TableCell colSpan={9} className="text-center">
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs text-primary hover:underline h-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllTenants(true);
                  }}
                >
                  +{group.totalMatches - 5} more candidates — Click to show all
                </Button>
              </TableCell>
            </TableRow>
          )}
          
          {/* Show less button - expanded state */}
          {showAllTenants && group.totalMatches > 5 && (
            <TableRow className="bg-muted/10 h-8 border-0">
              <TableCell colSpan={9} className="text-center">
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-primary h-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllTenants(false);
                  }}
                >
                  Show less
                </Button>
              </TableCell>
            </TableRow>
          )}
        </>
      )}
      
      {/* Tenant Profile Modal */}
      {viewingTenantId && (
        <TenantProfileModal
          isOpen={!!viewingTenantId}
          onClose={() => setViewingTenantId(null)}
          tenantId={viewingTenantId}
          propertyId={group.propertyId}
        />
      )}
    </>
  );
};

// =====================================================================
// TenantGroupRow — header per tenant, expanded rows are property matches
// =====================================================================
interface TenantGroupRowProps {
  group: TenantGroup;
  onMatchClick: (match: CommandMatch) => void;
  onApprove: (match: CommandMatch) => void;
  onReject: (match: CommandMatch) => void;
}

const TenantGroupRow = ({ group, onMatchClick, onApprove, onReject }: TenantGroupRowProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [viewingTenantId, setViewingTenantId] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  const displayedMatches = showAll ? group.allMatches : group.allMatches.slice(0, 5);

  const location = group.tenantCity && group.tenantState
    ? `${group.tenantCity}, ${group.tenantState}`
    : group.tenantState || '—';

  const budget = group.tenantBudget ? formatCurrency(group.tenantBudget) : '—';
  const beds = group.tenantBedrooms?.length ? group.tenantBedrooms.join(', ') + 'BR' : '?';

  const displayedCount = Math.min(5, group.allMatches.length);
  const propertiesLabel = `Top ${displayedCount} of ${group.totalMatches}`;

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50 h-14 group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="w-10 px-3">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          )}
        </TableCell>
        <TableCell className="w-[200px] font-medium truncate">
          <div className="flex flex-col gap-0.5">
            <span className="truncate">{group.tenantName}</span>
            {group.tenantEmail && (
              <span className="text-[10px] text-muted-foreground truncate">{group.tenantEmail}</span>
            )}
          </div>
        </TableCell>
        <TableCell className="w-[120px] text-sm">
          {budget} / {beds}
        </TableCell>
        <TableCell className="w-[140px] text-sm text-muted-foreground">
          {location}
        </TableCell>
        <TableCell className="w-[80px]">
          {group.tenantVoucher ? (
            <Badge variant="default" className="text-[10px]">Voucher</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">—</Badge>
          )}
        </TableCell>
        <TableCell className="w-[90px]">
          <ScoreBadge score={group.bestScore} />
        </TableCell>
        <TableCell className="w-[110px] text-sm">
          {propertiesLabel}
        </TableCell>
        <TableCell className="w-[80px]">
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setViewingTenantId(group.tenantId)}
              title="View tenant profile"
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={isCopying}
              onClick={async () => {
                setIsCopying(true);
                try {
                  await fetchAndCopyTenantInfo(group.tenantId);
                } catch (err) {
                  console.error('Copy tenant info failed', err);
                  toast.error('Failed to load tenant info');
                } finally {
                  setIsCopying(false);
                }
              }}
              title="Copy tenant info"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {isOpen && (
        <>
          <TableRow className="bg-muted/40 h-7 border-0">
            <TableCell className="w-10 px-3"></TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Property</TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Rent / Beds</TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Location</TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Score</TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Drive</TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Why</TableCell>
            <TableCell className="text-xs uppercase text-muted-foreground font-medium tracking-wide">Action</TableCell>
          </TableRow>

          {displayedMatches.map((match) => (
            <TableRow
              key={`${match.tenant_id}-${match.unit_id}`}
              className="bg-muted/20 h-9 cursor-pointer hover:bg-muted/40 border-0"
              onClick={() => onMatchClick(match)}
            >
              <TableCell className="w-10 px-3"></TableCell>
              <TableCell className="font-medium text-sm truncate">
                {match.property_address}
              </TableCell>
              <TableCell className="text-xs">
                {match.property_rent ? formatCurrency(match.property_rent) : '—'} / {match.property_bedrooms ?? '?'}BR
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {match.property_city && match.property_state
                  ? `${match.property_city}, ${match.property_state}`
                  : match.property_state || '—'}
              </TableCell>
              <TableCell>
                <ScoreBadge score={match.score} match={match} />
              </TableCell>
              <TableCell>
                {match.drive_time_minutes != null ? (
                  <span className={cn(
                    "text-xs font-mono",
                    match.drive_time_minutes <= 15 ? "text-green-600" :
                    match.drive_time_minutes <= 30 ? "text-foreground" :
                    match.drive_time_minutes <= 45 ? "text-orange-500" :
                    "text-red-500"
                  )}>
                    {match.drive_time_source === 'estimated' ? '~' : ''}{match.drive_time_minutes}m
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <MatchDrivers breakdown={match.breakdown} hasVoucher={match.tenant_voucher} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {!match.push_status && !match.tenant_has_other_push && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                      onClick={() => onApprove(match)}
                      title="Approve match"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-100"
                    onClick={() => onReject(match)}
                    title="Reject match"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}

          {group.totalMatches > 5 && (
            <TableRow className="bg-muted/10 h-8 border-0">
              <TableCell colSpan={8} className="text-center">
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs h-6"
                  onClick={(e) => { e.stopPropagation(); setShowAll(!showAll); }}
                >
                  {showAll ? 'Show less' : `+${group.totalMatches - 5} more properties — Click to show all`}
                </Button>
              </TableCell>
            </TableRow>
          )}
        </>
      )}

      {viewingTenantId && (
        <TenantProfileModal
          isOpen={!!viewingTenantId}
          onClose={() => setViewingTenantId(null)}
          tenantId={viewingTenantId}
          propertyId={group.allMatches[0]?.unit_id || ''}
        />
      )}
    </>
  );
};

export const GroupedMatchTable = ({
  viewMode,
  tenantGroups,
  propertyGroups,
  onMatchClick,
  onApprove,
  onReject,
}: GroupedMatchTableProps) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const isTenantView = viewMode === 'tenant';
  const groups: Array<TenantGroup | PropertyGroup> = isTenantView ? tenantGroups : propertyGroups;
  const totalPages = Math.ceil(groups.length / pageSize);
  const paginatedGroups = groups.slice(page * pageSize, (page + 1) * pageSize);
  
  // Pagination display values
  const startItem = groups.length > 0 ? page * pageSize + 1 : 0;
  const endItem = Math.min((page + 1) * pageSize, groups.length);
  
  // Handle page size change - reset to first page
  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="command-table-container">
        <Table className="table-compact">
          <TableHeader>
            {isTenantView ? (
              <TableRow className="bg-muted/50">
                <TableHead className="w-10 px-3"></TableHead>
                <TableHead className="w-[200px]">Tenant</TableHead>
                <TableHead className="w-[120px]">Budget / Beds</TableHead>
                <TableHead className="w-[140px]">Location</TableHead>
                <TableHead className="w-[80px]">Voucher</TableHead>
                <TableHead className="w-[90px]">Best Match</TableHead>
                <TableHead className="w-[110px]">Properties</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            ) : (
              <TableRow className="bg-muted/50">
                <TableHead className="w-10 px-3"></TableHead>
                <TableHead className="w-[200px]">Property</TableHead>
                <TableHead className="w-[100px]">Rent / Beds</TableHead>
                <TableHead className="w-[120px]">Location</TableHead>
                <TableHead className="w-[70px]">Days</TableHead>
                <TableHead className="w-[80px]">Best Match</TableHead>
                <TableHead className="w-[100px]">Candidates</TableHead>
                <TableHead className="w-[120px]">Pushes</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {paginatedGroups.map((group) =>
              isTenantView ? (
                <TenantGroupRow
                  key={(group as TenantGroup).tenantId}
                  group={group as TenantGroup}
                  onMatchClick={onMatchClick}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ) : (
                <PropertyGroupRow
                  key={(group as PropertyGroup).unitId}
                  group={group as PropertyGroup}
                  onMatchClick={onMatchClick}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              )
            )}
            {paginatedGroups.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No matches found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        {/* Left side: Page size selector + showing indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-[110px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            Showing {startItem}-{endItem} of {groups.length} {isTenantView ? 'tenants' : 'properties'}
          </span>
        </div>
        
        {/* Right side: Page navigation */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};