import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useImplementationTasks, useCreateImplementationTask } from '@/hooks/useImplementationTasks';
import { useBulkImportTasks } from '@/hooks/useBulkImportTasks';
import { TaskList } from '@/components/implementation/TaskList';
import { TaskTableView } from '@/components/implementation/TaskTableView';
import { ViewToggle } from '@/components/implementation/ViewToggle';
import { SearchAndFilters } from '@/components/implementation/SearchAndFilters';
import { BulkActionsToolbar } from '@/components/implementation/BulkActionsToolbar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TaskWithProgress, Subtask } from '@/types/implementation';
import { SuggestedTasksPanel } from '@/components/implementation/SuggestedTasksPanel';
import { SuggestedTask } from '@/components/implementation/SuggestionCard';
import { useGenerateTaskSuggestions, usePrioritizeTasks } from '@/hooks/useTaskSuggestions';
import { useUpdateImplementationTask } from '@/hooks/useImplementationTasks';

export default function ImplementationCenterPage() {
  const { data: rawTasks, isLoading: isLoadingTasks } = useImplementationTasks();
  const createTask = useCreateImplementationTask();
  const bulkImport = useBulkImportTasks();
  const generateSuggestions = useGenerateTaskSuggestions();
  const prioritizeTasks = usePrioritizeTasks();
  const updateTask = useUpdateImplementationTask();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [view, setView] = useState<'card' | 'table'>(() => {
    return (localStorage.getItem('implementation-view') as 'card' | 'table') || 'table';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState<'all' | 'hide' | 'only'>(() => {
    return (localStorage.getItem('show-completed') as 'all' | 'hide' | 'only') || 'all';
  });
  const [moveCompletedToBottom, setMoveCompletedToBottom] = useState(() => {
    return localStorage.getItem('move-completed-bottom') === 'true';
  });
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Feature',
    priority: 'Medium',
    estimated_time: '',
  });

  // Transform tasks to include progress information
  const tasks: TaskWithProgress[] = useMemo(() => {
    if (!rawTasks) return [];
    return rawTasks.map((task) => {
      const subtasks = (task.subtasks as unknown as Subtask[]) || [];
      const completedSubtasks = subtasks.filter((st) => st.completed).length;
      const totalSubtasks = subtasks.length;
      const completionPercentage = totalSubtasks > 0 
        ? Math.round((completedSubtasks / totalSubtasks) * 100)
        : 0;

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        status: task.status,
        previous_status: task.previous_status || null,
        estimated_time: task.estimated_time,
        actual_time: task.actual_time,
        created_by: task.created_by,
        assigned_to: task.assigned_to,
        created_at: task.created_at,
        updated_at: task.updated_at,
        completed_at: task.completed_at,
        source: task.source,
        ai_reasoning: task.ai_reasoning,
        order_index: task.order_index,
        dependencies: task.dependencies,
        subtasks,
        completedSubtasks,
        totalSubtasks,
        completionPercentage,
      };
    });
  }, [rawTasks]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.category.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(task => selectedCategories.includes(task.category));
    }
    if (selectedPriorities.length > 0) {
      filtered = filtered.filter(task => selectedPriorities.includes(task.priority));
    }
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(task => selectedStatuses.includes(task.status || 'Backlog'));
    }

    // Apply completed filter
    if (showCompleted === 'hide') {
      filtered = filtered.filter(task => task.status !== 'Done');
    } else if (showCompleted === 'only') {
      filtered = filtered.filter(task => task.status === 'Done');
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        let aVal: any = a[sortColumn as keyof TaskWithProgress];
        let bVal: any = b[sortColumn as keyof TaskWithProgress];

        if (sortColumn === 'title') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (sortColumn === 'priority') {
          const priorityOrder = { Low: 1, Medium: 2, High: 3, Critical: 4 };
          aVal = priorityOrder[aVal as keyof typeof priorityOrder] || 0;
          bVal = priorityOrder[bVal as keyof typeof priorityOrder] || 0;
        }

        if (sortColumn === 'completionPercentage') {
          aVal = a.completionPercentage;
          bVal = b.completionPercentage;
        }

        if (sortColumn === 'completed_at') {
          aVal = a.completed_at ? new Date(a.completed_at).getTime() : 0;
          bVal = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        }

        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    // Auto-sort completed to bottom if enabled
    if (moveCompletedToBottom && showCompleted === 'all') {
      const active = filtered.filter(task => task.status !== 'Done');
      const completed = filtered.filter(task => task.status === 'Done');
      filtered = [...active, ...completed];
    }

    return filtered;
  }, [tasks, searchQuery, selectedCategories, selectedPriorities, selectedStatuses, showCompleted, moveCompletedToBottom, sortColumn, sortDirection]);

  const handleViewChange = (newView: 'card' | 'table') => {
    setView(newView);
    localStorage.setItem('implementation-view', newView);
  };

  const handleShowCompletedChange = (value: 'all' | 'hide' | 'only') => {
    setShowCompleted(value);
    localStorage.setItem('show-completed', value);
  };

  const handleMoveCompletedToggle = () => {
    const newValue = !moveCompletedToBottom;
    setMoveCompletedToBottom(newValue);
    localStorage.setItem('move-completed-bottom', String(newValue));
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const uniqueCategories = useMemo(() => [...new Set(tasks.map(t => t.category))], [tasks]);
  const uniquePriorities = ['Low', 'Medium', 'High', 'Critical'];
  const uniqueStatuses = ['Backlog', 'In Progress', 'Done', 'Blocked'];

  // Handler functions wrapped in useCallback for stable references
  // Sort suggestions by priority: high → medium → low
  const sortSuggestionsByPriority = (suggestions: SuggestedTask[]) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...suggestions].sort((a, b) => {
      const aPriority = priorityOrder[a.priority?.toLowerCase() as keyof typeof priorityOrder] ?? 99;
      const bPriority = priorityOrder[b.priority?.toLowerCase() as keyof typeof priorityOrder] ?? 99;
      return aPriority - bPriority;
    });
  };

  const loadPrioritizedSuggestions = useCallback(() => {
    if (!tasks || tasks.length === 0) return;
    
    prioritizeTasks.mutate(tasks, {
      onSuccess: (data) => {
        const filtered = data.filter(s => !dismissedSuggestions.includes(s.id || s.title));
        const sorted = sortSuggestionsByPriority(filtered);
        setSuggestions(sorted);
      },
      onError: (error) => {
        console.error('Failed to load suggestions:', error);
      }
    });
  }, [tasks, dismissedSuggestions, prioritizeTasks]);

  const handleGenerateNewSuggestions = useCallback(() => {
    if (!tasks) return;
    
    generateSuggestions.mutate(
      { existingTasks: tasks, type: 'suggest' },
      {
        onSuccess: (data) => {
          const filtered = data.filter(s => !dismissedSuggestions.includes(s.id || s.title));
          const sorted = sortSuggestionsByPriority(filtered);
          setSuggestions(sorted);
        },
        onError: (error) => {
          console.error('Failed to generate suggestions:', error);
        }
      }
    );
  }, [tasks, dismissedSuggestions, generateSuggestions]);

  const handleStartTask = useCallback((id: string) => {
    updateTask.mutate(
      { id, updates: { status: 'In Progress' } },
      {
        onSuccess: () => {
          setSuggestions(prev => prev.filter(s => s.id !== id));
        }
      }
    );
  }, [updateTask]);

  const handleAddTaskFromSuggestion = useCallback((task: Omit<SuggestedTask, 'id' | 'isExisting' | 'isReady'>) => {
    createTask.mutate({
      title: task.title,
      description: task.reasoning,
      category: task.category,
      priority: task.priority,
      estimated_time: task.estimated_time || '',
    }, {
      onSuccess: () => {
        setSuggestions(prev => prev.filter(s => s.title !== task.title));
      }
    });
  }, [createTask]);

  const handleDismissSuggestion = useCallback((id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id && s.title !== id));
    setDismissedSuggestions(prev => [...prev, id]);
  }, []);

  // Persist dismissed suggestions to localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dismissed-suggestions');
    if (stored) {
      setDismissedSuggestions(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dismissed-suggestions', JSON.stringify(dismissedSuggestions));
  }, [dismissedSuggestions]);

  // Auto-load prioritized suggestions when tasks are loaded
  useEffect(() => {
    if (tasks && tasks.length > 0 && suggestions.length === 0 && !prioritizeTasks.isPending) {
      loadPrioritizedSuggestions();
    }
  }, [tasks, suggestions.length, loadPrioritizedSuggestions, prioritizeTasks.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTask.mutate(formData, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({
          title: '',
          description: '',
          category: 'Feature',
          priority: 'Medium',
          estimated_time: '',
        });
      },
    });
  };

  const stats = filteredTasks ? {
    total: filteredTasks.length,
    backlog: filteredTasks.filter(t => t.status === 'Backlog').length,
    inProgress: filteredTasks.filter(t => t.status === 'In Progress').length,
    done: filteredTasks.filter(t => t.status === 'Done').length,
    totalSteps: filteredTasks.reduce((acc, t) => acc + t.totalSubtasks, 0),
    completedSteps: filteredTasks.reduce((acc, t) => acc + t.completedSubtasks, 0),
  } : { total: 0, backlog: 0, inProgress: 0, done: 0, totalSteps: 0, completedSteps: 0 };

  const completionPercentage = stats.totalSteps > 0 
    ? Math.round((stats.completedSteps / stats.totalSteps) * 100)
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Implementation Center</h1>
          <p className="text-muted-foreground">
            Manage your development roadmap and track implementation tasks
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => bulkImport.mutate()}
            disabled={bulkImport.isPending || (tasks && tasks.length > 0)}
          >
            {bulkImport.isPending ? 'Importing...' : 'Import 87 Tasks'}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Feature">Feature</SelectItem>
                      <SelectItem value="Bug Fix">Bug Fix</SelectItem>
                      <SelectItem value="Enhancement">Enhancement</SelectItem>
                      <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="estimated_time">Estimated Time</Label>
                <Input
                  id="estimated_time"
                  placeholder="e.g., 2 hours, 3 days, 1 week"
                  value={formData.estimated_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_time: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createTask.isPending}>
                {createTask.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Tasks</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">{stats.done}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Overall Progress</CardDescription>
            <CardTitle className="text-3xl">{completionPercentage}%</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedSteps}/{stats.totalSteps} steps
            </p>
          </CardHeader>
        </Card>
      </div>

      {showSuggestions && (
        <SuggestedTasksPanel
          suggestions={suggestions}
          onStartTask={handleStartTask}
          onAddTask={handleAddTaskFromSuggestion}
          onDismiss={handleDismissSuggestion}
          onGenerate={handleGenerateNewSuggestions}
          isGenerating={generateSuggestions.isPending || prioritizeTasks.isPending}
        />
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SearchAndFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategories={selectedCategories}
          selectedPriorities={selectedPriorities}
          selectedStatuses={selectedStatuses}
          onCategoryToggle={(cat) => {
            setSelectedCategories(prev =>
              prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
            );
          }}
          onPriorityToggle={(pri) => {
            setSelectedPriorities(prev =>
              prev.includes(pri) ? prev.filter(p => p !== pri) : [...prev, pri]
            );
          }}
          onStatusToggle={(status) => {
            setSelectedStatuses(prev =>
              prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
            );
          }}
          onClearFilters={() => {
            setSearchQuery('');
            setSelectedCategories([]);
            setSelectedPriorities([]);
            setSelectedStatuses([]);
            setShowCompleted('all');
          }}
          categories={uniqueCategories}
          priorities={uniquePriorities}
          statuses={uniqueStatuses}
          showCompleted={showCompleted}
          onShowCompletedChange={handleShowCompletedChange}
        />
        <div className="flex items-center gap-4">
          {showCompleted === 'all' && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={moveCompletedToBottom}
                onChange={handleMoveCompletedToggle}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-muted-foreground">Move completed to bottom</span>
            </label>
          )}
          <ViewToggle view={view} onViewChange={handleViewChange} />
        </div>
      </div>

      {isLoadingTasks ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredTasks && filteredTasks.length > 0 ? (
        view === 'table' ? (
          <TaskTableView
            tasks={filteredTasks}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        ) : (
          <TaskList tasks={filteredTasks} />
        )
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {tasks.length === 0 
                ? 'No tasks yet. Create your first task to get started!'
                : 'No tasks match your filters.'}
            </p>
          </CardContent>
        </Card>
      )}

      <BulkActionsToolbar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
      />
    </div>
  );
}
