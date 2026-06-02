import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface MenuItem {
  name: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface MobileTabNavProps {
  menuItems: MenuItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const MobileTabNav = ({ menuItems, activeTab, onTabChange }: MobileTabNavProps) => {
  return (
    <Card className="command-tabs mb-8 overflow-x-auto md:overflow-hidden max-w-full">
      <nav className="flex overflow-x-auto min-w-max md:min-w-0 p-1">
        {menuItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => onTabChange(item.name)}
              className={`
                flex-shrink-0 
                flex items-center justify-center gap-1 sm:gap-2 
                px-3 sm:px-4 py-3 
                text-sm font-medium rounded-lg 
                min-w-[56px] sm:min-w-0 sm:flex-1
                transition-all duration-200 
                ${activeTab === item.name
                  ? 'bg-gradient-blue-gold text-white shadow-sm'
                  : 'text-foreground hover:bg-muted'
                } 
                ${index > 0 ? 'ml-1' : ''}
              `}
            >
              <IconComponent className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{item.label}</span>
              {item.count && item.count > 0 && (
                <Badge variant="secondary" className="ml-1 bg-openkey-gold text-white h-5 px-2 text-xs hidden sm:flex">
                  {item.count > 99 ? '99+' : item.count}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>
    </Card>
  );
};

export default MobileTabNav;
