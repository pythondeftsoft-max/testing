import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Home, Building2, Shield, Zap, Wrench, Building } from 'lucide-react';

export type HousingProgramType = 'all' | 'hcv' | 'public_housing' | 'vash' | 'ehv' | 'mod_rehab' | 'project_based';

export const PROGRAM_LABELS: Record<Exclude<HousingProgramType, 'all'>, string> = {
  hcv: 'HCV (Section 8)',
  public_housing: 'Public Housing',
  vash: 'VASH',
  ehv: 'EHV',
  mod_rehab: 'Mod Rehab',
  project_based: 'Project-Based',
};

const PROGRAM_ICONS: Record<Exclude<HousingProgramType, 'all'>, React.ComponentType<any>> = {
  hcv: Home,
  public_housing: Building2,
  vash: Shield,
  ehv: Zap,
  mod_rehab: Wrench,
  project_based: Building,
};

interface ProgramFilterProps {
  value: HousingProgramType;
  onChange: (v: HousingProgramType) => void;
  enabledPrograms?: HousingProgramType[];
  className?: string;
}

const ProgramFilter: React.FC<ProgramFilterProps> = ({ value, onChange, enabledPrograms, className }) => {
  const allOptions: HousingProgramType[] = ['all', 'hcv', 'public_housing', 'vash', 'ehv', 'mod_rehab', 'project_based'];
  const visible = enabledPrograms && enabledPrograms.length > 0
    ? ['all', ...enabledPrograms.filter(p => p !== 'all')] as HousingProgramType[]
    : allOptions;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className || ''}`}>
      <span className="text-xs text-muted-foreground mr-1">Program:</span>
      {visible.map(opt => {
        const isActive = value === opt;
        const label = opt === 'all' ? 'All' : PROGRAM_LABELS[opt as Exclude<HousingProgramType, 'all'>];
        const Icon = opt === 'all' ? null : PROGRAM_ICONS[opt as Exclude<HousingProgramType, 'all'>];
        return (
          <Badge
            key={opt}
            variant={isActive ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-accent transition-colors text-xs h-7 px-2.5 flex items-center gap-1"
            onClick={() => onChange(opt)}
          >
            {Icon && <Icon className="h-3 w-3" />}
            {label}
          </Badge>
        );
      })}
    </div>
  );
};

export default ProgramFilter;
