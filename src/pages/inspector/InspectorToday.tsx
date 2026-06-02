import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/providers/AuthProvider';
import { useOfflineInspections } from '@/hooks/useOfflineInspections';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2, ClipboardList, ChevronRight, AlertCircle } from 'lucide-react';
import InspectorLayout from '@/components/inspector/InspectorLayout';
import InstallPWAPrompt from '@/components/inspector/InstallPWAPrompt';

const InspectorToday: React.FC = () => {
  const { user } = useAuth();
  const { inspections, loading, fromCache } = useOfflineInspections(user?.id);

  return (
    <InspectorLayout>
      <Helmet><title>Today's Inspections | Inspector</title></Helmet>
      <div className="p-4 space-y-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Today's Inspections
          </h1>
          <p className="text-xs text-muted-foreground">
            {fromCache ? 'Showing cached list — connect to refresh' : `${inspections.length} scheduled`}
          </p>
        </div>

        <InstallPWAPrompt />

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : inspections.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
              No inspections scheduled for today.
            </CardContent>
          </Card>
        ) : (
          inspections.map(i => (
            <Link key={i.id} to={`/inspector/inspection/${i.id}`}>
              <Card className="hover:bg-accent/30 transition">
                <CardContent className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm capitalize">{i.inspection_type.replace('_', ' ')}</span>
                      <Badge variant="outline" className="text-xs">{i.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {i.scheduled_date ? new Date(i.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unscheduled'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))
        )}

        <p className="text-[11px] text-muted-foreground text-center pt-4">
          Tip: install to home screen on your published domain for full offline use.
        </p>
      </div>
    </InspectorLayout>
  );
};

export default InspectorToday;
