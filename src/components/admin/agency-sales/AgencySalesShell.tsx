import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import PipelineListView from './PipelineListView';
import HandoffTab from './HandoffTab';

const ProspectingTab = React.lazy(() => import('@/components/admin/agency-management/ProspectingTab'));

const SUB_TABS = ['pipeline', 'prospects', 'handoff'] as const;
type SubTab = typeof SUB_TABS[number];

// Aliases keep old bookmarks/links working after the tab cleanup.
const SUB_ALIASES: Record<string, SubTab> = {
  leads: 'pipeline',
  followups: 'pipeline',
  quotes: 'pipeline',
};

export default function AgencySalesShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('sub') || 'pipeline';
  const aliased = SUB_ALIASES[raw] ?? raw;
  const sub: SubTab = (SUB_TABS as readonly string[]).includes(aliased)
    ? (aliased as SubTab)
    : 'pipeline';

  const setSub = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'agency-sales');
    params.set('sub', next);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agency Sales</h1>
        <p className="text-sm text-muted-foreground">
          Three-step funnel: prospect → work the pipeline → onboard the deal. Everything you need
          to track and advance a PHA from cold to live.
        </p>
      </div>

      <Tabs value={sub} onValueChange={setSub} className="w-full">
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="prospects">1. Prospects</TabsTrigger>
          <TabsTrigger value="pipeline">2. Pipeline</TabsTrigger>
          <TabsTrigger value="handoff">3. Live Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="prospects" className="mt-4">
          <React.Suspense
            fallback={
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                Loading prospecting…
              </div>
            }
          >
            <ProspectingTab />
          </React.Suspense>
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4 space-y-3">
          <PipelineListView />
        </TabsContent>

        <TabsContent value="handoff" className="mt-4">
          <HandoffTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
