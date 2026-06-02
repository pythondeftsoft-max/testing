import { useMemo, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RefreshCw, Download, Map as MapIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  allNodes,
  systemEdges,
  type LayerType,
  type SystemNode,
  ARCHITECTURE_VERSION,
  ARCHITECTURE_LAST_UPDATED,
} from '@/data/systemArchitecture';
import { NodeDetailPanel } from '@/components/admin/system-map/NodeDetailPanel';
import { exportSystemMapPDF } from '@/utils/systemMapExport';

const LAYERS: { value: LayerType; label: string; color: string }[] = [
  { value: 'frontend', label: 'Frontend', color: 'hsl(var(--primary))' },
  { value: 'database', label: 'Database', color: 'hsl(217 91% 60%)' },
  { value: 'edge-function', label: 'Edge Fns', color: 'hsl(38 92% 50%)' },
  { value: 'external', label: 'External', color: 'hsl(271 81% 56%)' },
  { value: 'auth', label: 'Auth', color: 'hsl(346 77% 49%)' },
  { value: 'storage', label: 'Storage', color: 'hsl(189 94% 43%)' },
  { value: 'cron', label: 'Cron', color: 'hsl(24 95% 53%)' },
];

const layerColorMap: Record<string, string> = Object.fromEntries(
  LAYERS.map((l) => [l.value, l.color])
);

// Position nodes in horizontal columns by layer
function buildLayout(activeLayers: Set<LayerType>): { nodes: Node[]; edges: Edge[] } {
  const visible = allNodes.filter((n) => activeLayers.has(n.layer));
  const byLayer: Record<string, SystemNode[]> = {};
  visible.forEach((n) => {
    byLayer[n.layer] ??= [];
    byLayer[n.layer].push(n);
  });

  const layerOrder: LayerType[] = ['frontend', 'auth', 'edge-function', 'database', 'storage', 'cron', 'external'];
  const nodes: Node[] = [];
  let xPos = 0;
  const X_GAP = 320;
  const Y_GAP = 90;

  layerOrder.forEach((layer) => {
    const items = byLayer[layer];
    if (!items || items.length === 0) return;
    items.forEach((n, i) => {
      nodes.push({
        id: n.id,
        type: 'default',
        position: { x: xPos, y: i * Y_GAP },
        data: { label: n.label },
        style: {
          background: 'hsl(var(--card))',
          border: `2px solid ${layerColorMap[n.layer]}`,
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 500,
          color: 'hsl(var(--card-foreground))',
          width: 240,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        },
      });
    });
    xPos += X_GAP;
  });

  const visibleIds = new Set(nodes.map((n) => n.id));
  const edges: Edge[] = systemEdges
    .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: false,
      style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5 },
      labelStyle: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
    }));

  return { nodes, edges };
}

export default function SystemMap() {
  const [activeLayers, setActiveLayers] = useState<Set<LayerType>>(
    new Set(LAYERS.map((l) => l.value))
  );
  const [selectedNode, setSelectedNode] = useState<SystemNode | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { nodes, edges } = useMemo(() => buildLayout(activeLayers), [activeLayers]);

  const handleNodeClick: NodeMouseHandler = useCallback((_, node) => {
    const found = allNodes.find((n) => n.id === node.id);
    setSelectedNode(found ?? null);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('system-map-scan');
      if (error) throw error;
      if (data?.success) {
        toast.success(
          `Scan complete: ${data.edgeFunctionCount} edge functions, ${data.tableCount} tables`,
          {
            description: data.diff ? `Changes: ${data.diff}` : 'No changes since last scan.',
          }
        );
      } else {
        toast.warning('Scan returned no data — using seeded manifest.');
      }
    } catch (err: any) {
      toast.error('Refresh failed', { description: err?.message ?? 'Edge function unavailable.' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSystemMapPDF();
      toast.success('PDF exported successfully.');
    } catch (err: any) {
      toast.error('Export failed', { description: err?.message });
    } finally {
      setExporting(false);
    }
  };

  const toggleLayer = (layer: LayerType) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="border-b bg-card px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <MapIcon className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">System Architecture Map</h1>
            <p className="text-xs text-muted-foreground">
              v{ARCHITECTURE_VERSION} · {ARCHITECTURE_LAST_UPDATED} · {nodes.length} nodes visible
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ToggleGroup type="multiple" size="sm" value={Array.from(activeLayers)}>
            {LAYERS.map((l) => (
              <ToggleGroupItem
                key={l.value}
                value={l.value}
                onClick={() => toggleLayer(l.value)}
                className="text-xs"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5"
                  style={{ background: l.color }}
                />
                {l.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-1.5">Refresh Inventory</span>
          </Button>

          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="ml-1.5">Export PDF</span>
          </Button>
        </div>
      </div>

      {/* Main: graph + side panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-muted/20">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="hsl(var(--border))" gap={20} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const node = allNodes.find((x) => x.id === n.id);
                return node ? layerColorMap[node.layer] : 'hsl(var(--muted))';
              }}
              maskColor="hsl(var(--background) / 0.6)"
              style={{ background: 'hsl(var(--card))' }}
            />
          </ReactFlow>
        </div>

        {selectedNode && (
          <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </div>

      {/* Empty-state hint */}
      {!selectedNode && (
        <div className="absolute bottom-6 right-6 pointer-events-none">
          <Card className="px-4 py-2 text-xs text-muted-foreground bg-card/80 backdrop-blur">
            💡 Click any node to see details
          </Card>
        </div>
      )}
    </div>
  );
}
