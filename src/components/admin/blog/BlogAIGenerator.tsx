import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DataTable } from '@/components/ui/data-table';
import { Bot, Clock, Target, Zap, Calendar as CalendarIcon, Settings, Play, Pause, Plus, Trash2, Edit, Wand2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface Topic {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  targetAudience: string;
  contentAngle: string;
  preferredTimes: string[];
  frequency: string;
  contentLength: string;
  tone: string;
  priority: 'high' | 'medium' | 'low';
  isActive: boolean;
  createdAt: string;
}

interface GenerationTask {
  id: string;
  topicId: string;
  topicTitle: string;
  status: 'pending' | 'generating' | 'completed' | 'scheduled';
  scheduledFor: string;
  createdAt: string;
  completedAt?: string;
}

export const BlogAIGenerator = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('topics');
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Sample data - in real implementation, these would come from hooks
  const [topics, setTopics] = useState<Topic[]>([
    {
      id: '1',
      title: 'Property Investment Tips',
      description: 'Educational content about real estate investment strategies',
      keywords: ['real estate', 'investment', 'property', 'ROI'],
      targetAudience: 'New investors',
      contentAngle: 'Educational',
      preferredTimes: ['09:00', '14:00'],
      frequency: 'weekly',
      contentLength: 'medium',
      tone: 'professional',
      priority: 'high',
      isActive: true,
      createdAt: '2024-01-15'
    }
  ]);

  const [generationQueue, setGenerationQueue] = useState<GenerationTask[]>([
    {
      id: '1',
      topicId: '1',
      topicTitle: 'Property Investment Tips',
      status: 'pending',
      scheduledFor: '2024-01-20T09:00:00Z',
      createdAt: '2024-01-19'
    }
  ]);

  const [newTopic, setNewTopic] = useState({
    title: '',
    description: '',
    keywords: '',
    targetAudience: '',
    contentAngle: '',
    preferredTimes: ['09:00'],
    frequency: 'weekly',
    contentLength: 'medium',
    tone: 'professional',
    priority: 'medium' as const
  });

  const handleCreateTopic = () => {
    const topic: Topic = {
      id: Date.now().toString(),
      ...newTopic,
      keywords: newTopic.keywords.split(',').map(k => k.trim()),
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    setTopics([...topics, topic]);
    setNewTopic({
      title: '',
      description: '',
      keywords: '',
      targetAudience: '',
      contentAngle: '',
      preferredTimes: ['09:00'],
      frequency: 'weekly',
      contentLength: 'medium',
      tone: 'professional',
      priority: 'medium'
    });
    setIsTopicDialogOpen(false);
    
    toast({
      title: "Topic Created",
      description: "New content topic has been added successfully."
    });
  };

  const handleGenerateContent = async (topicIds: string[]) => {
    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      const newTasks = topicIds.map(topicId => {
        const topic = topics.find(t => t.id === topicId);
        return {
          id: Date.now().toString() + Math.random(),
          topicId,
          topicTitle: topic?.title || '',
          status: 'generating' as const,
          scheduledFor: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        };
      });
      
      setGenerationQueue([...generationQueue, ...newTasks]);
      setIsGenerating(false);
      
      toast({
        title: "Generation Started",
        description: `Started generating content for ${topicIds.length} topic(s).`
      });
    }, 2000);
  };

  const topicColumns = [
    {
      accessorKey: 'title',
      header: 'Topic',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.getValue('title')}</div>
          <div className="text-sm text-muted-foreground">{row.original.description}</div>
        </div>
      )
    },
    {
      accessorKey: 'keywords',
      header: 'Keywords',
      cell: ({ row }: any) => (
        <div className="flex flex-wrap gap-1">
          {row.getValue('keywords').slice(0, 3).map((keyword: string, i: number) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {keyword}
            </Badge>
          ))}
          {row.getValue('keywords').length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{row.getValue('keywords').length - 3}
            </Badge>
          )}
        </div>
      )
    },
    {
      accessorKey: 'frequency',
      header: 'Frequency',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue('frequency')}</Badge>
      )
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }: any) => {
        const priority = row.getValue('priority');
        const variants = {
          high: 'destructive' as const,
          medium: 'default' as const,
          low: 'secondary' as const
        };
        return (
          <Badge variant={variants[priority as keyof typeof variants]}>
            {priority}
          </Badge>
        );
      }
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge variant={row.getValue('isActive') ? 'default' : 'secondary'}>
          {row.getValue('isActive') ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleGenerateContent([row.original.id])}
            disabled={isGenerating}
          >
            <Wand2 className="h-3 w-3 mr-1" />
            Generate
          </Button>
          <Button size="sm" variant="ghost">
            <Edit className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  const queueColumns = [
    {
      accessorKey: 'topicTitle',
      header: 'Topic',
      cell: ({ row }: any) => (
        <div className="font-medium">{row.getValue('topicTitle')}</div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.getValue('status');
        const variants = {
          pending: 'secondary' as const,
          generating: 'default' as const,
          completed: 'default' as const,
          scheduled: 'outline' as const
        };
        return (
          <Badge variant={variants[status as keyof typeof variants]}>
            {status}
          </Badge>
        );
      }
    },
    {
      accessorKey: 'scheduledFor',
      header: 'Scheduled For',
      cell: ({ row }: any) => (
        <div className="text-sm">
          {format(new Date(row.getValue('scheduledFor')), 'MMM dd, yyyy HH:mm')}
        </div>
      )
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }: any) => (
        <div className="text-sm text-muted-foreground">
          {format(new Date(row.getValue('createdAt')), 'MMM dd, yyyy')}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gradient-blue-gold">AI Content Generator</h2>
          <p className="text-muted-foreground">
            Create topics and automatically generate scheduled blog content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => handleGenerateContent(topics.filter(t => t.isActive).map(t => t.id))}
            disabled={isGenerating}
            className="bg-gradient-to-r from-openkey-blue to-openkey-gold text-white"
          >
            <Zap className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Bulk Generate'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="topics">
            <Target className="h-4 w-4 mr-2" />
            Topics
          </TabsTrigger>
          <TabsTrigger value="queue">
            <Clock className="h-4 w-4 mr-2" />
            Generation Queue
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Topics Tab */}
        <TabsContent value="topics" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Content Topics</h3>
            <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Topic
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Content Topic</DialogTitle>
                  <DialogDescription>
                    Define a new topic for AI content generation
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Topic Title</Label>
                      <Input
                        id="title"
                        value={newTopic.title}
                        onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                        placeholder="e.g., Property Investment Tips"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newTopic.priority} onValueChange={(value: any) => setNewTopic({ ...newTopic, priority: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newTopic.description}
                      onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                      placeholder="Describe what this topic should cover..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                    <Input
                      id="keywords"
                      value={newTopic.keywords}
                      onChange={(e) => setNewTopic({ ...newTopic, keywords: e.target.value })}
                      placeholder="real estate, investment, property, ROI"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="audience">Target Audience</Label>
                      <Input
                        id="audience"
                        value={newTopic.targetAudience}
                        onChange={(e) => setNewTopic({ ...newTopic, targetAudience: e.target.value })}
                        placeholder="e.g., New investors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="angle">Content Angle</Label>
                      <Select value={newTopic.contentAngle} onValueChange={(value) => setNewTopic({ ...newTopic, contentAngle: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="educational">Educational</SelectItem>
                          <SelectItem value="promotional">Promotional</SelectItem>
                          <SelectItem value="news">News</SelectItem>
                          <SelectItem value="opinion">Opinion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Frequency</Label>
                      <Select value={newTopic.frequency} onValueChange={(value) => setNewTopic({ ...newTopic, frequency: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="length">Content Length</Label>
                      <Select value={newTopic.contentLength} onValueChange={(value) => setNewTopic({ ...newTopic, contentLength: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">Short (300-500 words)</SelectItem>
                          <SelectItem value="medium">Medium (500-1000 words)</SelectItem>
                          <SelectItem value="long">Long (1000+ words)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tone">Tone</Label>
                      <Select value={newTopic.tone} onValueChange={(value) => setNewTopic({ ...newTopic, tone: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="authoritative">Authoritative</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsTopicDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTopic}>
                    Create Topic
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <DataTable columns={topicColumns} data={topics} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generation Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Generation Queue</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {generationQueue.filter(t => t.status === 'pending').length} Pending
              </Badge>
              <Badge variant="default">
                {generationQueue.filter(t => t.status === 'generating').length} Generating
              </Badge>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <DataTable columns={queueColumns} data={generationQueue} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Calendar</CardTitle>
              <CardDescription>
                View and manage your scheduled content pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const firstDay = new Date(year, month, 1).getDay();
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                
                // Map scheduled tasks to day numbers
                const scheduledDays = new Set(
                  generationQueue
                    .filter(t => t.status === 'scheduled' || t.status === 'pending')
                    .map(t => new Date(t.scheduledFor).getDate())
                );
                
                return (
                  <div>
                    <h4 className="text-sm font-medium mb-3">{format(now, 'MMMM yyyy')}</h4>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {dayNames.map(d => (
                        <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
                      ))}
                      {Array.from({ length: firstDay }, (_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const isToday = day === now.getDate();
                        const hasPost = scheduledDays.has(day);
                        return (
                          <div
                            key={day}
                            className={cn(
                              "text-sm py-2 rounded-md relative",
                              isToday && "bg-primary text-primary-foreground font-bold",
                              hasPost && !isToday && "bg-primary/10 font-medium",
                              !isToday && !hasPost && "hover:bg-muted"
                            )}
                          >
                            {day}
                            {hasPost && (
                              <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        Today
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary/40" />
                        Scheduled Post
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Generation Settings</CardTitle>
              <CardDescription>
                Configure AI behavior and generation preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-scheduling</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically schedule generated content
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Smart timing</Label>
                  <p className="text-sm text-muted-foreground">
                    Use AI to optimize posting times
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="space-y-2">
                <Label>Default content length</Label>
                <Select defaultValue="medium">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (300-500 words)</SelectItem>
                    <SelectItem value="medium">Medium (500-1000 words)</SelectItem>
                    <SelectItem value="long">Long (1000+ words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};