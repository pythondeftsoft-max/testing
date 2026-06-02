import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SettingsRailItem {
  value: string;
  label: string;
  icon?: LucideIcon;
}

export interface SettingsRailGroup {
  label: string;
  items: SettingsRailItem[];
}

interface Props {
  groups: SettingsRailGroup[];
  value: string;
  onValueChange: (v: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  children: React.ReactNode;
}

/**
 * Vertical category rail for dense settings/operations screens.
 * Replaces the "17 tabs jammed in one row" pattern with a left-rail navigator
 * + content panel. Collapses to a Select dropdown on mobile.
 *
 * The rail itself does NOT render content — the parent supplies the matching
 * content (typically <TabsContent value="..."> blocks) as children. Item
 * `value`s must match the parent's content `value`s exactly so deep-links keep
 * working.
 */
export const SettingsRail: React.FC<Props> = ({
  groups, value, onValueChange, searchable = true, searchPlaceholder = 'Find a setting…', children,
}) => {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return groups;
    return groups
      .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q)) }))
      .filter(g => g.items.length);
  }, [groups, q]);

  const allItems = useMemo(() => groups.flatMap(g => g.items), [groups]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
      {/* Mobile: dropdown */}
      <div className="md:hidden">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {groups.map(g => (
              <React.Fragment key={g.label}>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</div>
                {g.items.map(i => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: rail */}
      <aside className="hidden md:block">
        <div className="sticky top-2 space-y-3">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-7 h-8 text-sm"
              />
            </div>
          )}
          <nav className="space-y-4">
            {filtered.map(group => (
              <div key={group.label}>
                <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const active = item.value === value;
                    return (
                      <li key={item.value}>
                        <button
                          type="button"
                          onClick={() => onValueChange(item.value)}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors',
                            active
                              ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                              : 'text-foreground/80 hover:bg-muted hover:text-foreground border-l-2 border-transparent',
                          )}
                        >
                          {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-2 text-xs text-muted-foreground italic">
                No settings match "{query}".
              </p>
            )}
          </nav>
          {searchable && allItems.length > 8 && (
            <p className="px-2 text-[10px] text-muted-foreground">
              {allItems.length} settings
            </p>
          )}
        </div>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
};

export default SettingsRail;
