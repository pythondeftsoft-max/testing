import React, { useState } from 'react';
import { useStructuredPages } from '@/hooks/useStructuredPages';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
  excludeId?: string;
}

export const InternalLinkPicker: React.FC<Props> = ({ selected, onChange, excludeId }) => {
  const [search, setSearch] = useState('');
  const { data: pages = [] } = useStructuredPages({ search: search || undefined });

  const filteredPages = pages.filter(
    (p) => p.id !== excludeId && !selected.includes(p.id)
  );

  const selectedPages = pages.filter((p) => selected.includes(p.id));

  return (
    <div className="space-y-2">
      {/* Selected links */}
      {selectedPages.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedPages.map((p) => (
            <Badge key={p.id} variant="secondary" className="flex items-center gap-1">
              {p.title}
              <button onClick={() => onChange(selected.filter((id) => id !== p.id))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search + add */}
      <Input
        placeholder="Search pages to link..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search && filteredPages.length > 0 && (
        <div className="border rounded-md max-h-40 overflow-y-auto">
          {filteredPages.slice(0, 10).map((p) => (
            <button
              key={p.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b last:border-b-0"
              onClick={() => {
                onChange([...selected, p.id]);
                setSearch('');
              }}
            >
              <span className="font-medium">{p.title}</span>
              <span className="text-xs text-muted-foreground ml-2">/{p.slug}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
