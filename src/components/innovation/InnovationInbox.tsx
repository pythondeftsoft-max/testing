import React, { useState } from 'react';
import { Lightbulb, Filter, Search, RefreshCw, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IdeaCard } from './IdeaCard';
import { QuickCaptureWidget } from './QuickCaptureWidget';
import { 
  useInnovationIdeas, 
  useUpdateInnovationIdea, 
  useDeleteInnovationIdea,
  useApproveIdea 
} from '@/hooks/useInnovationIdeas';
import { InnovationIdea, STATUS_OPTIONS, CATEGORY_OPTIONS } from '@/types/innovation';

export function InnovationInbox() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<InnovationIdea | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskCategory, setTaskCategory] = useState('feature');
  const [taskPriority, setTaskPriority] = useState('medium');

  const { data: ideas, isLoading, refetch } = useInnovationIdeas(statusFilter);
  const updateIdea = useUpdateInnovationIdea();
  const deleteIdea = useDeleteInnovationIdea();
  const approveIdea = useApproveIdea();

  const filteredIdeas = ideas?.filter(idea => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      idea.tool_name?.toLowerCase().includes(query) ||
      idea.raw_description?.toLowerCase().includes(query) ||
      idea.applicability?.toLowerCase().includes(query)
    );
  });

  const handleApprove = (idea: InnovationIdea) => {
    setSelectedIdea(idea);
    setTaskTitle(idea.tool_name ? `Implement ${idea.tool_name}` : 'New Implementation Task');
    setTaskDescription(idea.applicability || idea.raw_description || '');
    setTaskCategory(idea.category === 'ai_sales' || idea.category === 'ai_tools' ? 'ai' : 'feature');
    setApproveDialogOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedIdea) return;
    
    await approveIdea.mutateAsync({
      ideaId: selectedIdea.id,
      taskData: {
        title: taskTitle,
        description: taskDescription,
        category: taskCategory,
        priority: taskPriority,
      },
    });
    
    setApproveDialogOpen(false);
    setSelectedIdea(null);
  };

  const handleReject = async (idea: InnovationIdea) => {
    await updateIdea.mutateAsync({
      id: idea.id,
      updates: { status: 'rejected' },
    });
  };

  const handleDelete = async (idea: InnovationIdea) => {
    if (confirm('Are you sure you want to delete this idea?')) {
      await deleteIdea.mutateAsync(idea.id);
    }
  };

  const handleViewDetails = (idea: InnovationIdea) => {
    // Could open a detail modal/drawer here
    console.log('View details:', idea);
  };

  const statusCounts = ideas?.reduce((acc, idea) => {
    acc[idea.status] = (acc[idea.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            Innovation Inbox
          </h1>
          <p className="text-muted-foreground">
            Capture and evaluate ideas from social media for OpenKey improvements
          </p>
        </div>
        <QuickCaptureWidget />
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setStatusFilter('all')}
        >
          All ({ideas?.length || 0})
        </Badge>
        {STATUS_OPTIONS.map(status => (
          <Badge
            key={status.value}
            variant={statusFilter === status.value ? 'default' : 'outline'}
            className={`cursor-pointer ${statusFilter === status.value ? '' : status.color}`}
            onClick={() => setStatusFilter(status.value)}
          >
            {status.label} ({statusCounts[status.value] || 0})
          </Badge>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Ideas Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredIdeas?.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No ideas yet</h3>
          <p className="text-muted-foreground mb-4">
            Start capturing ideas from TikTok, Instagram, or YouTube
          </p>
          <QuickCaptureWidget />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIdeas?.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Implementation Task</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={taskCategory} onValueChange={setTaskCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="ai">AI</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                    <SelectItem value="ui">UI/UX</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                    <SelectItem value="automation">Automation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmApprove} disabled={approveIdea.isPending}>
              {approveIdea.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
