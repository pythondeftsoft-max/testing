import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, MapPin, Building } from 'lucide-react';
import {
  useAutoPusherTerritories,
  useAddTerritory,
  useToggleTerritory,
  useDeleteTerritory,
} from '@/hooks/useAutoPusherSettings';
import { US_STATES } from '@/lib/stateUtils';

export const TerritoryAllowList: React.FC = () => {
  const { data: territories = [], isLoading } = useAutoPusherTerritories();
  const addMut = useAddTerritory();
  const toggleMut = useToggleTerritory();
  const deleteMut = useDeleteTerritory();

  const [type, setType] = useState<'state' | 'city' | 'pha'>('state');
  const [stateValue, setStateValue] = useState('');
  const [cityValue, setCityValue] = useState('');
  const [phaId, setPhaId] = useState('');

  const { data: phas = [] } = useQuery({
    queryKey: ['housing-authorities-list-min'],
    queryFn: async () => {
      const { data } = await supabase
        .from('housing_authorities')
        .select('id, name, state')
        .order('name')
        .limit(500);
      return data || [];
    },
  });

  const handleAdd = async () => {
    if (type === 'state' && stateValue) {
      await addMut.mutateAsync({ state: stateValue, label: stateValue });
      setStateValue('');
    } else if (type === 'city' && cityValue && stateValue) {
      await addMut.mutateAsync({
        city: cityValue,
        state: stateValue,
        label: `${cityValue}, ${stateValue}`,
      });
      setCityValue('');
    } else if (type === 'pha' && phaId) {
      const pha = phas.find((p: any) => p.id === phaId);
      await addMut.mutateAsync({
        housing_authority_id: phaId,
        label: pha?.name || 'PHA',
      });
      setPhaId('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Territory allow-list
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Auto-pusher only acts on tenants/units in these areas. Add states, cities, or specific
          housing authorities. Anything outside stays manual.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        <div className="grid grid-cols-1 md:grid-cols-[140px,1fr,1fr,auto] gap-2 items-end">
          <div>
            <Label className="text-xs">Scope</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="state">State</SelectItem>
                <SelectItem value="city">City</SelectItem>
                <SelectItem value="pha">Housing Authority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'pha' ? (
            <>
              <div className="md:col-span-2">
                <Label className="text-xs">Housing Authority</Label>
                <Select value={phaId} onValueChange={setPhaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a PHA" />
                  </SelectTrigger>
                  <SelectContent>
                    {phas.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.state ? `(${p.state})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-xs">State</Label>
                <Select value={stateValue} onValueChange={setStateValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {type === 'city' && (
                <div>
                  <Label className="text-xs">City</Label>
                  <Input
                    value={cityValue}
                    onChange={(e) => setCityValue(e.target.value)}
                    placeholder="e.g. Logan"
                  />
                </div>
              )}
              {type === 'state' && <div />}
            </>
          )}

          <Button size="sm" onClick={handleAdd} disabled={addMut.isPending} className="gap-1">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        {/* Existing list */}
        <div className="space-y-1">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : territories.length === 0 ? (
            <div className="text-xs text-muted-foreground p-4 border rounded-md bg-muted/30">
              No territories yet. Auto-pusher will not act anywhere until at least one is added.
            </div>
          ) : (
            territories.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 px-3 py-2 border rounded-md"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {t.housing_authority_id ? (
                    <Building className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate">{t.label || '—'}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {t.housing_authority_id ? 'PHA' : t.city ? 'city' : 'state'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={t.enabled}
                    onCheckedChange={(checked) =>
                      toggleMut.mutate({ id: t.id, enabled: checked })
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => deleteMut.mutate(t.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
