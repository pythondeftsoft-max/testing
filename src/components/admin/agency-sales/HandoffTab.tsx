import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Search } from 'lucide-react';
import { usePipelineCards } from './usePipelineData';
import { LiveCustomerRow } from './LiveCustomerRow';

export default function HandoffTab() {
  const { data: cards = [], isLoading } = usePipelineCards();
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');

  const live = useMemo(() => cards.filter((c) => c.stage === 'live'), [cards]);

  const states = useMemo(() => {
    const s = new Set<string>();
    live.forEach((c) => c.agency_state && s.add(c.agency_state));
    return Array.from(s).sort();
  }, [live]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return live.filter((c) => {
      if (stateFilter !== 'all' && c.agency_state !== stateFilter) return false;
      if (q && !c.agency_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [live, query, stateFilter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold text-base">Live customers</h3>
              <p className="text-sm text-muted-foreground">
                Every agency that's gone live. Expand a row to manage their contract, billing, people, and admin links.
                In-progress onboarding lives in the Pipeline tab.
              </p>
            </div>
            <Badge variant="secondary">{live.length} live</Badge>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search agency…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-7 h-9"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="h-9 w-32"><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">
          <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {live.length === 0
              ? 'No live customers yet. Mark a deal Live in the Pipeline once provisioning is done.'
              : 'No matches for your filter.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <LiveCustomerRow key={`${c.source}:${c.id}`} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
