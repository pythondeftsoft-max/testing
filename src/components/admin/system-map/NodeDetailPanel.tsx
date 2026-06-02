import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ExternalLink } from 'lucide-react';
import type { SystemNode } from '@/data/systemArchitecture';

interface Props {
  node: SystemNode | null;
  onClose: () => void;
}

const layerColors: Record<string, string> = {
  frontend: 'bg-primary/10 text-primary border-primary/30',
  database: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  'edge-function': 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  external: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  workflow: 'bg-green-500/10 text-green-600 border-green-500/30',
  storage: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  auth: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  cron: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
};

export function NodeDetailPanel({ node, onClose }: Props) {
  if (!node) return null;

  return (
    <Card className="w-96 h-full overflow-hidden flex flex-col border-l rounded-none">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3 border-b">
        <div>
          <Badge variant="outline" className={layerColors[node.layer] ?? ''}>
            {node.layer}
          </Badge>
          <CardTitle className="mt-2 text-lg">{node.label}</CardTitle>
          {node.group && (
            <p className="text-xs text-muted-foreground mt-1">Group: {node.group}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="space-y-4 pt-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Purpose</h4>
            <p className="text-sm leading-relaxed">{node.description}</p>
          </div>

          {node.url && (
            <div>
              <Button variant="outline" size="sm" asChild className="w-full">
                <a href={node.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-2" />
                  Open dashboard
                </a>
              </Button>
            </div>
          )}

          {node.tables && node.tables.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                DB Tables ({node.tables.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {node.tables.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs font-mono">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {node.files && node.files.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Files / Functions ({node.files.length})
              </h4>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {node.files.map((f) => (
                  <div key={f} className="text-xs font-mono bg-muted/50 px-2 py-1 rounded">
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {node.secrets && node.secrets.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Secrets Used
              </h4>
              <div className="flex flex-wrap gap-1">
                {node.secrets.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs font-mono">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {node.calledFrom && node.calledFrom.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Called From
              </h4>
              <div className="flex flex-wrap gap-1">
                {node.calledFrom.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
