import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { EyeOff } from 'lucide-react';

/**
 * Admin-only toggle that flips the `as_new_pha=1` URL flag.
 * Pages that respect this flag should hide is_demo: true rows for the session.
 * Pure URL-state — never mutates data.
 */
export function ViewAsNewPHAToggle() {
  const [params, setParams] = useSearchParams();
  const enabled = params.get('as_new_pha') === '1';

  const handleToggle = (v: boolean) => {
    const next = new URLSearchParams(params);
    if (v) {
      next.set('as_new_pha', '1');
    } else {
      next.delete('as_new_pha');
    }
    setParams(next, { replace: true });
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <EyeOff className="w-4 h-4 text-muted-foreground" />
      <Label htmlFor="view-as-new-pha" className="text-muted-foreground cursor-pointer">
        View as new PHA
      </Label>
      <Switch id="view-as-new-pha" checked={enabled} onCheckedChange={handleToggle} />
    </div>
  );
}
