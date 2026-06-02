import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { CardDescription } from '@/components/ui/card';
import { 
  Plus, 
  LineChart, 
  CreditCard, 
  Users, 
  FileText, 
  Settings,
  Zap,
  Building2,
  Heart,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  variant: 'blue' | 'gold' | 'default';
  onClick: () => void;
}

interface QuickActionsBentoProps {
  onAddProperty: () => void;
  onAddAsset: () => void;
  onManagePayments: () => void;
  onManageRoles: () => void;
  onViewApplications: () => void;
  onOpenSettings: () => void;
  onViewProperties?: () => void;
  onViewMatches?: () => void;
  onImportCsv?: () => void;
  /** 'pm' shows the full set; 'listing' shows a simplified posting-focused set */
  mode?: 'pm' | 'listing';
  className?: string;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
};

/**
 * Premium Quick Actions component with 2x3 bento grid layout.
 * Matches the "Billion Dollar SaaS" Command Center aesthetic.
 */
export const QuickActionsBento: React.FC<QuickActionsBentoProps> = ({
  onAddProperty,
  onAddAsset,
  onManagePayments,
  onManageRoles,
  onViewApplications,
  onOpenSettings,
  onViewProperties,
  onViewMatches,
  onImportCsv,
  mode = 'pm',
  className,
}) => {
  const pmActions: QuickAction[] = [
    { id: 'add-property', icon: Plus, label: 'Add Property', description: 'New unit', variant: 'blue', onClick: onAddProperty },
    { id: 'import-csv', icon: Upload, label: 'Import CSV', description: 'Bulk upload', variant: 'default', onClick: onImportCsv ?? (() => {}) },
    { id: 'add-asset', icon: LineChart, label: 'Add Asset', description: 'Track wealth', variant: 'gold', onClick: onAddAsset },
    { id: 'payments', icon: CreditCard, label: 'Payments', description: 'Rent & fees', variant: 'default', onClick: onManagePayments },
    { id: 'roles', icon: Users, label: 'Team Roles', description: 'Permissions', variant: 'default', onClick: onManageRoles },
    { id: 'applications', icon: FileText, label: 'Applications', description: 'Review', variant: 'default', onClick: onViewApplications },
  ];

  const listingActions: QuickAction[] = [
    { id: 'add-property', icon: Plus, label: 'Add Property', description: 'Post a unit', variant: 'blue', onClick: onAddProperty },
    { id: 'import-csv', icon: Upload, label: 'Import CSV', description: 'Bulk upload', variant: 'gold', onClick: onImportCsv ?? (() => {}) },
    { id: 'view-properties', icon: Building2, label: 'My Listings', description: 'Manage units', variant: 'default', onClick: onViewProperties ?? (() => {}) },
    { id: 'matches', icon: Heart, label: 'Tenant Matches', description: 'See fits', variant: 'default', onClick: onViewMatches ?? onViewApplications },
    { id: 'applications', icon: FileText, label: 'Applications', description: 'Review', variant: 'default', onClick: onViewApplications },
    { id: 'settings', icon: Settings, label: 'Profile', description: 'Configure', variant: 'default', onClick: onOpenSettings },
  ];

  const actions = mode === 'listing' ? listingActions : pmActions;

  const getButtonClasses = (variant: QuickAction['variant']) => {
    switch (variant) {
      case 'blue':
        return 'bg-gradient-blue hover:shadow-lg hover:shadow-openkey-blue/20';
      case 'gold':
        return 'bg-gradient-gold hover:shadow-lg hover:shadow-openkey-gold/20';
      default:
        return 'bg-muted hover:bg-muted/80';
    }
  };

  const getTextClasses = (variant: QuickAction['variant']) => {
    switch (variant) {
      case 'blue':
      case 'gold':
        return 'text-white';
      default:
        return 'text-foreground';
    }
  };

  return (
    <CardEnhanced 
      variant="command" 
      hover 
      className={cn("command-bento-card relative overflow-hidden flex flex-col h-full", className)}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220_100%_50%/0.03)] to-transparent pointer-events-none" />
      
      <CardEnhancedHeader className="relative z-10 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-blue-gold">
            <Zap className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <CardEnhancedTitle className="text-lg font-bold text-openkey-blue">Quick Actions</CardEnhancedTitle>
            <CardDescription className="text-xs">Common tasks & shortcuts</CardDescription>
          </div>
        </div>
      </CardEnhancedHeader>
      
      <CardEnhancedContent className="relative z-10 flex-1 pt-0">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3 h-full"
        >
          {actions.map((action) => (
            <motion.div key={action.id} variants={staggerItem}>
              <Button
                variant="ghost"
                onClick={action.onClick}
                className={cn(
                  "w-full h-full min-h-[80px] flex flex-col items-center justify-center gap-2 rounded-xl",
                  "transition-all duration-300 hover:scale-[1.02]",
                  getButtonClasses(action.variant)
                )}
              >
                <action.icon 
                  className={cn("w-5 h-5", getTextClasses(action.variant))} 
                  strokeWidth={1.5} 
                />
                <div className="text-center">
                  <p className={cn("text-sm font-semibold", getTextClasses(action.variant))}>
                    {action.label}
                  </p>
                  <p className={cn(
                    "text-xs opacity-70",
                    action.variant === 'default' ? 'text-muted-foreground' : 'text-white/70'
                  )}>
                    {action.description}
                  </p>
                </div>
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default QuickActionsBento;
