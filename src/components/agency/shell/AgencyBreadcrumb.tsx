import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { AgencyNavItem } from './agencyNavConfig';

interface Props {
  items: AgencyNavItem[];
  activeTab: string;
  activeSub: string;
  onSelect: (tab: string, sub?: string) => void;
}

export const AgencyBreadcrumb: React.FC<Props> = ({ items, activeTab, activeSub, onSelect }) => {
  const parent = items.find((i) => i.value === activeTab);
  if (!parent || !parent.children?.length) return null;

  const sub = parent.children.find((c) => c.value === activeSub) ?? parent.children.find((c) => c.value === parent.defaultSub);
  const ParentIcon = parent.icon;
  const SubIcon = sub?.icon;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
      <button
        type="button"
        onClick={() => onSelect(parent.value, parent.defaultSub)}
        className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
      >
        <ParentIcon className="w-3.5 h-3.5" />
        <span>{parent.label}</span>
      </button>
      {sub && (
        <>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
            {SubIcon && <SubIcon className="w-3.5 h-3.5" />}
            {sub.label}
          </span>
        </>
      )}
    </nav>
  );
};
