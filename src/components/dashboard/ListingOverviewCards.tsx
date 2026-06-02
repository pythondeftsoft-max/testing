import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Heart, FileText, CheckCircle2 } from 'lucide-react';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { cn } from '@/lib/utils';

interface ListingOverviewCardsProps {
  totalListings: number;
  activeListings: number;
  newMatches: number;
  pendingApplications: number;
  className?: string;
}

interface MetricTile {
  id: string;
  label: string;
  value: number;
  icon: React.ElementType;
  accent: 'blue' | 'gold' | 'green' | 'muted';
  hint: string;
}

const accentClasses: Record<MetricTile['accent'], string> = {
  blue: 'from-[hsl(220_100%_50%/0.08)] to-transparent text-openkey-blue',
  gold: 'from-[hsl(45_100%_50%/0.08)] to-transparent text-openkey-gold',
  green: 'from-[hsl(142_71%_45%/0.08)] to-transparent text-success',
  muted: 'from-muted/40 to-transparent text-foreground',
};

/**
 * Simplified 4-card dashboard for landlords in Listing mode.
 * Shows posting + matching metrics — no NOI, no cash flow, no occupancy %
 * (those only matter once you actually own units under management).
 */
export const ListingOverviewCards: React.FC<ListingOverviewCardsProps> = ({
  totalListings,
  activeListings,
  newMatches,
  pendingApplications,
  className,
}) => {
  const tiles: MetricTile[] = [
    {
      id: 'active',
      label: 'Active Listings',
      value: activeListings,
      icon: CheckCircle2,
      accent: 'green',
      hint: 'On market right now',
    },
    {
      id: 'total',
      label: 'Units Posted',
      value: totalListings,
      icon: Building2,
      accent: 'blue',
      hint: 'Total in your portfolio',
    },
    {
      id: 'matches',
      label: 'Tenant Matches',
      value: newMatches,
      icon: Heart,
      accent: 'gold',
      hint: 'Strong fits this week',
    },
    {
      id: 'applications',
      label: 'Pending Applications',
      value: pendingApplications,
      icon: FileText,
      accent: 'muted',
      hint: 'Waiting on your review',
    },
  ];

  return (
    <motion.div
      className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8', className)}
      data-tour="dashboard-metrics"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } },
      }}
    >
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <motion.div
            key={tile.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0 },
            }}
          >
            <CardEnhanced variant="command" hover className="relative overflow-hidden h-full">
              <div className={cn('absolute inset-0 bg-gradient-to-br pointer-events-none', accentClasses[tile.accent].split(' ').slice(0, 2).join(' '))} />
              <CardEnhancedContent className="relative z-10 p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {tile.label}
                  </span>
                  <Icon className={cn('w-5 h-5', accentClasses[tile.accent].split(' ').slice(2).join(' '))} strokeWidth={1.75} />
                </div>
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  {tile.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{tile.hint}</p>
              </CardEnhancedContent>
            </CardEnhanced>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default ListingOverviewCards;
