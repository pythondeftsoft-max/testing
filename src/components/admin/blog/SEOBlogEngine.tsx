import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { Switch } from '@/components/ui/switch';
import { 
  Bot, Clock, Target, Zap, Settings, Play, FileText, 
  TrendingUp, Users, Building, BarChart3, CheckCircle2, 
  XCircle, Loader2, RefreshCw, BookOpen, Globe, ExternalLink, Pause
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useBlogPillars, useGenerateBlogPost, useUpdateBlogPillar, BlogPillar } from '@/hooks/useBlogPillars';
import { useBlogGenerationLogs, useBlogGenerationStats } from '@/hooks/useBlogGenerationLogs';
import { useContentKnowledgeBase } from '@/hooks/useContentKnowledgeBase';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOAutoPostRules } from './SEOAutoPostRules';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const pillarIcons: Record<string, React.ReactNode> = {
  tenants: <Users className="h-5 w-5" />,
  landlords: <Building className="h-5 w-5" />,
  'property-managers': <Settings className="h-5 w-5" />,
  'real-estate': <TrendingUp className="h-5 w-5" />,
};

const pillarColors: Record<string, string> = {
  tenants: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  landlords: 'bg-green-500/10 text-green-600 border-green-500/20',
  'property-managers': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'real-estate': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

export const SEOBlogEngine = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedPillarId, setSelectedPillarId] = useState<string>('');
  const [topicOverride, setTopicOverride] = useState('');
  const [locationState, setLocationState] = useState('');
  const [locationCity, setLocationCity] = useState('');

  const { data: pillars, isLoading: pillarsLoading } = useBlogPillars();
  const { data: logs, isLoading: logsLoading } = useBlogGenerationLogs(20);
  const { data: stats } = useBlogGenerationStats();
  const { data: knowledgeFacts } = useContentKnowledgeBase();
  const { data: posts } = useBlogPosts();
  const generatePost = useGenerateBlogPost();
  const updatePillar = useUpdateBlogPillar();
  const queryClient = useQueryClient();

  const aiGeneratedPosts = posts?.filter((p: any) => p.ai_generated) || [];

  // Real-time subscription for log updates
  useEffect(() => {
    const channel = supabase
      .channel('blog-generation-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blog_generation_logs',
        },
        () => {
          // Refetch logs when any change occurs
          queryClient.invalidateQueries({ queryKey: ['blog-generation-logs'] });
          queryClient.invalidateQueries({ queryKey: ['blog-generation-stats'] });
          queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
          queryClient.invalidateQueries({ queryKey: ['blog-pillars'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleGeneratePost = () => {
    generatePost.mutate({
      pillar_id: selectedPillarId || undefined,
      topic_override: topicOverride || undefined,
      location_state: locationState || undefined,
      location_city: locationCity || undefined,
    });
    setIsGenerateDialogOpen(false);
    setSelectedPillarId('');
    setTopicOverride('');
    setLocationState('');
    setLocationCity('');
  };

  // Get next pillar in rotation (only active pillars)
  const getNextPillar = (): BlogPillar | undefined => {
    if (!pillars?.length) return undefined;
    const activePillars = pillars.filter(p => p.active);
    if (!activePillars.length) return undefined;
    const sorted = [...activePillars].sort((a, b) => {
      if (!a.last_published_at) return -1;
      if (!b.last_published_at) return 1;
      return new Date(a.last_published_at).getTime() - new Date(b.last_published_at).getTime();
    });
    return sorted[0];
  };

  const handleToggleActive = (pillar: BlogPillar) => {
    updatePillar.mutate({ id: pillar.id, active: !pillar.active });
  };

  const nextPillar = getNextPillar();

  const logColumns = [
    {
      accessorKey: 'pillar',
      header: 'Pillar',
      cell: ({ row }: any) => {
        const pillar = row.original.pillar;
        return pillar ? (
          <Badge className={pillarColors[pillar.slug] || 'bg-muted'}>
            {pillar.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'topic_seed',
      header: 'Topic',
      cell: ({ row }: any) => (
        <div className="max-w-[200px] truncate">
          {row.getValue('topic_seed') || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.getValue('status');
        const statusConfig: Record<string, { icon: React.ReactNode; className: string }> = {
          success: { icon: <CheckCircle2 className="h-3 w-3" />, className: 'bg-green-500/10 text-green-600' },
          failed: { icon: <XCircle className="h-3 w-3" />, className: 'bg-red-500/10 text-red-600' },
          rate_limited: { icon: <XCircle className="h-3 w-3" />, className: 'bg-orange-500/10 text-orange-600' },
          generating: { icon: <Loader2 className="h-3 w-3 animate-spin" />, className: 'bg-blue-500/10 text-blue-600' },
          researching: { icon: <Loader2 className="h-3 w-3 animate-spin" />, className: 'bg-purple-500/10 text-purple-600' },
          pending: { icon: <Clock className="h-3 w-3" />, className: 'bg-muted text-muted-foreground' },
        };
        const config = statusConfig[status as string] || statusConfig.pending;
        return (
          <Badge className={config.className}>
            {config.icon}
            <span className="ml-1">{status}</span>
          </Badge>
        );
      },
    },
    {
      accessorKey: 'triggered_at',
      header: 'Time',
      cell: ({ row }: any) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.getValue('triggered_at')), { addSuffix: true })}
        </span>
      ),
    },
    {
      accessorKey: 'post',
      header: 'Generated Post',
      cell: ({ row }: any) => {
        const post = row.original.post;
        return post ? (
          <a 
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate max-w-[150px] flex items-center gap-1"
          >
            {post.title}
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'error_message',
      header: 'Error',
      cell: ({ row }: any) => {
        const error = row.getValue('error_message');
        return error ? (
          <span className="text-xs text-red-500 truncate max-w-[150px] block">
            {error}
          </span>
        ) : null;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gradient-blue-gold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            SEO Blog Engine
          </h2>
          <p className="text-muted-foreground">
            Automated content generation across 4 pillars • 1 post/day rotation
          </p>
        </div>
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-openkey-blue to-openkey-gold text-white"
              disabled={generatePost.isPending}
            >
              {generatePost.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Generate Now
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Blog Post</DialogTitle>
              <DialogDescription>
                Generate a new SEO blog post. Leave fields empty to use automatic rotation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Pillar (optional)</Label>
                <Select value={selectedPillarId || "auto"} onValueChange={(val) => setSelectedPillarId(val === "auto" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Auto-rotate (next: ${nextPillar?.name || 'None'})`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-rotate (next: {nextPillar?.name || 'None'})</SelectItem>
                    {pillars?.map((pillar) => (
                      <SelectItem key={pillar.id} value={pillar.id}>
                        {pillar.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic Override (optional)</Label>
                <Input
                  value={topicOverride}
                  onChange={(e) => setTopicOverride(e.target.value)}
                  placeholder="Leave empty for auto-selection"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>State (for tenant posts)</Label>
                  <Input
                    value={locationState}
                    onChange={(e) => setLocationState(e.target.value)}
                    placeholder="e.g., Texas"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City (optional)</Label>
                  <Input
                    value={locationCity}
                    onChange={(e) => setLocationCity(e.target.value)}
                    placeholder="e.g., Dallas"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGeneratePost} disabled={generatePost.isPending}>
                {generatePost.isPending ? 'Generating...' : 'Generate Post'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{stats?.thisWeek.success || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.thisWeek.failed || 0} failed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{stats?.thisMonth.success || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.thisMonth.failed || 0} failed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Knowledge Facts</p>
                <p className="text-2xl font-bold">{knowledgeFacts?.length || 0}</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For AI context
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Posts</p>
                <p className="text-2xl font-bold">{aiGeneratedPosts.length}</p>
              </div>
              <Bot className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total generated
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <Target className="h-4 w-4 mr-2" />
            Pillars
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Clock className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <BookOpen className="h-4 w-4 mr-2" />
            Knowledge
          </TabsTrigger>
          <TabsTrigger value="location-pages">
            <Globe className="h-4 w-4 mr-2" />
            Location Pages
          </TabsTrigger>
        </TabsList>

        {/* Pillars Overview */}
        <TabsContent value="overview" className="space-y-4">
          {pillarsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {pillars?.map((pillar) => (
                <Card 
                  key={pillar.id} 
                  className={`border-2 transition-opacity ${nextPillar?.id === pillar.id ? 'border-primary' : 'border-transparent'} ${!pillar.active ? 'opacity-60' : ''}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <span className={`p-2 rounded-lg ${pillarColors[pillar.slug]}`}>
                          {pillarIcons[pillar.slug]}
                        </span>
                        {pillar.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {!pillar.active && (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            <Pause className="h-3 w-3 mr-1" />
                            Paused
                          </Badge>
                        )}
                        {nextPillar?.id === pillar.id && pillar.active && (
                          <Badge variant="outline" className="border-primary text-primary">
                            Next in rotation
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription>{pillar.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Posts published</span>
                        <span className="font-medium">{pillar.posts_count}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last published</span>
                        <span className="font-medium">
                          {pillar.last_published_at 
                            ? formatDistanceToNow(new Date(pillar.last_published_at), { addSuffix: true })
                            : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">CTA type</span>
                        <Badge variant="secondary">{pillar.cta_type.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Auto-posting</span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pillar.active}
                            onCheckedChange={() => handleToggleActive(pillar)}
                            disabled={updatePillar.isPending}
                          />
                          <span className={`text-xs font-medium ${pillar.active ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {pillar.active ? 'On' : 'Off'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pillar.content_focus.slice(0, 4).map((topic) => (
                          <Badge key={topic} variant="outline" className="text-xs">
                            {topic.replace(/-/g, ' ')}
                          </Badge>
                        ))}
                        {pillar.content_focus.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{pillar.content_focus.length - 4} more
                          </Badge>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => {
                          setSelectedPillarId(pillar.id);
                          setIsGenerateDialogOpen(true);
                        }}
                        disabled={generatePost.isPending}
                      >
                        <Play className="h-3 w-3 mr-2" />
                        Generate for {pillar.name}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Generation Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Generation Activity
              </CardTitle>
              <CardDescription>
                History of automated and manual blog post generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : logs?.length ? (
                <DataTable columns={logColumns} data={logs} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No generation logs yet</p>
                  <p className="text-sm">Generate your first post to see activity here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Base */}
        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Content Knowledge Base
              </CardTitle>
              <CardDescription>
                Verified facts used to ground AI-generated content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {knowledgeFacts?.length ? (
                <div className="space-y-3">
                  {knowledgeFacts.slice(0, 10).map((fact) => (
                    <div key={fact.id} className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{fact.fact_title}</span>
                        <Badge variant="outline" className="text-xs">
                          {fact.topic_category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {fact.fact_content}
                      </p>
                      {fact.source_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Source: {fact.source_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No knowledge facts yet</p>
                  <p className="text-sm">Add verified facts to improve AI content accuracy</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location Pages (SEO Auto Post) */}
        <TabsContent value="location-pages" className="space-y-4">
          <SEOAutoPostRules />
        </TabsContent>
      </Tabs>
    </div>
  );
};
