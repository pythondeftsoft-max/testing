import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useAgentReports, AgentReport } from '@/hooks/useAgentReports';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const REPORT_TYPE_LABELS: Record<string, string> = {
  morning_brief: '☀️ Morning Brief',
  evening_digest: '🌙 Evening Digest',
  market_research: '📊 Market Research',
};

const CATEGORY_ICONS: Record<string, string> = {
  housing: '🏠',
  section8: '📜',
  aitech: '🤖',
  stocks: '📈',
  world: '🌍',
};

export const AgentReportsTab = () => {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const { data: reports, isLoading } = useAgentReports(filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={!filter ? 'gradient' : 'outline'} onClick={() => setFilter(undefined)}>All</Button>
        <Button size="sm" variant={filter === 'morning_brief' ? 'gradient' : 'outline'} onClick={() => setFilter('morning_brief')}>Morning Briefs</Button>
        <Button size="sm" variant={filter === 'evening_digest' ? 'gradient' : 'outline'} onClick={() => setFilter('evening_digest')}>Evening Digests</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !reports || reports.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No reports yet. Billy will save full reports here after the next run.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
};

const ReportCard = ({ report }: { report: AgentReport }) => {
  const [expanded, setExpanded] = useState(false);
  const content = report.content || {};
  const date = new Date(report.created_at).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <Card>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">{report.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                </Badge>
                <span className="text-xs text-muted-foreground">{date}</span>
              </div>
            </div>
            {report.summary && !expanded && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 ml-8">{report.summary}</p>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Site metrics */}
            {content.metrics && (
              <div className="mb-4 p-3 rounded-lg bg-muted/50">
                <h4 className="text-xs font-semibold mb-2">📊 SITE METRICS</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {content.metrics.newTenants !== undefined && (
                    <div><span className="text-muted-foreground">New Tenants:</span> <strong>{content.metrics.newTenants}</strong></div>
                  )}
                  {content.metrics.newLandlords !== undefined && (
                    <div><span className="text-muted-foreground">New Landlords:</span> <strong>{content.metrics.newLandlords}</strong></div>
                  )}
                  {content.metrics.propertiesAdded !== undefined && (
                    <div><span className="text-muted-foreground">Properties:</span> <strong>{content.metrics.propertiesAdded}</strong></div>
                  )}
                  {content.metrics.applications !== undefined && (
                    <div><span className="text-muted-foreground">Applications:</span> <strong>{content.metrics.applications}</strong></div>
                  )}
                </div>
              </div>
            )}

            {/* Research categories */}
            {content.categories && Array.isArray(content.categories) && (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-4">
                  {content.categories.map((cat: any, i: number) => (
                    <div key={i} className="border-l-2 border-primary/30 pl-3">
                      <h4 className="text-sm font-semibold mb-1">
                        {CATEGORY_ICONS[cat.id] || '📋'} {cat.title}
                      </h4>
                      {cat.bullets && (
                        <div className="text-xs text-foreground whitespace-pre-wrap mb-2">{cat.bullets}</div>
                      )}
                      {cat.analysis && (
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap">{cat.analysis}</div>
                      )}
                      {cat.sources && (
                        <div className="text-xs text-primary mt-1">{cat.sources}</div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
