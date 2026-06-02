import { Flame, AlertTriangle, Users, TrendingUp, Send } from 'lucide-react';
import type { CommandMatch } from '@/hooks/useMatchCommandCenter';

interface PropertyGroup {
  unitId: string;
  propertyId: string;
  daysOnMarket: number | null;
  bestScore: number;
  totalMatches: number;
  allMatches: CommandMatch[];
}

interface HeroMetricsBarProps {
  propertyGroups: PropertyGroup[];
  filteredMatches: CommandMatch[];
}

export const HeroMetricsBar = ({ propertyGroups, filteredMatches }: HeroMetricsBarProps) => {
  // Calculate actionable metrics
  const hotMatchCount = propertyGroups.filter(g => g.bestScore >= 80).length;
  const urgentProperties = propertyGroups.filter(g => g.daysOnMarket && g.daysOnMarket > 21).length;
  const readyToAssign = filteredMatches.filter(m => m.score >= 70 && m.tenant_voucher).length;
  const totalProperties = propertyGroups.length;
  
  // Pick the most motivating stat
  const getHeroContent = () => {
    if (hotMatchCount > 0) {
      return {
        icon: Flame,
        text: `${hotMatchCount} ${hotMatchCount === 1 ? 'property has' : 'properties have'} hot matches ready`,
        variant: 'hot' as const,
      };
    }
    
    if (urgentProperties > 0) {
      return {
        icon: AlertTriangle,
        text: `${urgentProperties} ${urgentProperties === 1 ? 'unit needs' : 'units need'} attention (21+ days vacant)`,
        variant: 'urgent' as const,
      };
    }
    
    if (readyToAssign > 0) {
      return {
        icon: Users,
        text: `${readyToAssign} voucher-ready ${readyToAssign === 1 ? 'match' : 'matches'} available`,
        variant: 'ready' as const,
      };
    }
    
    return {
      icon: TrendingUp,
      text: `${totalProperties} ${totalProperties === 1 ? 'property' : 'properties'} with tenant matches`,
      variant: 'default' as const,
    };
  };
  
  const hero = getHeroContent();
  const Icon = hero.icon;
  
  const variantStyles = {
    hot: 'bg-orange-50 border-orange-200 text-orange-700',
    urgent: 'bg-red-50 border-red-200 text-red-700',
    ready: 'bg-green-50 border-green-200 text-green-700',
    default: 'bg-primary/5 border-primary/20 text-primary',
  };
  
  if (totalProperties === 0) return null;
  
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${variantStyles[hero.variant]}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-base font-semibold">{hero.text}</span>
      
      {/* Secondary stats */}
      <div className="ml-auto flex items-center gap-4 text-sm opacity-75">
        {hotMatchCount > 0 && hero.variant !== 'hot' && (
          <span className="flex items-center gap-1">
            <Flame className="w-4 h-4" /> {hotMatchCount} hot
          </span>
        )}
        {urgentProperties > 0 && hero.variant !== 'urgent' && (
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> {urgentProperties} urgent
          </span>
        )}
        {filteredMatches.filter(m => m.push_status).length > 0 && (
          <span className="flex items-center gap-1">
            <Send className="w-4 h-4" /> {filteredMatches.filter(m => m.push_status).length} pushed
          </span>
        )}
      </div>
    </div>
  );
};