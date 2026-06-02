import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Sparkles, Heart, ListChecks } from 'lucide-react';
import SuggestionsQueueTab from '@/components/admin/matchmaker/push-hub/SuggestionsQueueTab';
import LivePushesTab from '@/components/admin/matchmaker/push-hub/LivePushesTab';
import InterestedTenantsTab from '@/components/admin/matchmaker/push-hub/InterestedTenantsTab';
import { usePushActivityRealtime, useSuggestedPushes, useInterestedPushes } from '@/hooks/usePushActivity';

const PushActivityHub: React.FC = () => {
  usePushActivityRealtime();
  const { data: suggestions } = useSuggestedPushes();
  const { data: interested } = useInterestedPushes();

  return (
    <div className="container mx-auto p-6 space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin?tab=house-hunter">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Property Finder
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Send className="w-6 h-6 text-primary" /> Push Activity Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Operator cockpit for property pushes — Quo SMS, suggestions queue, and interested tenant follow-up.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="suggestions">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl">
              <TabsTrigger value="suggestions" className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Suggestions
                {suggestions && suggestions.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {suggestions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="live" className="gap-1.5">
                <ListChecks className="w-3.5 h-3.5" /> Live Pushes
              </TabsTrigger>
              <TabsTrigger value="interested" className="gap-1.5">
                <Heart className="w-3.5 h-3.5" /> Interested
                {interested && interested.length > 0 && (
                  <span className="ml-1 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {interested.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="suggestions" className="mt-4">
              <SuggestionsQueueTab />
            </TabsContent>
            <TabsContent value="live" className="mt-4">
              <LivePushesTab />
            </TabsContent>
            <TabsContent value="interested" className="mt-4">
              <InterestedTenantsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PushActivityHub;
