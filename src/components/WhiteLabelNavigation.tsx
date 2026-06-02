import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Menu, Search, GripVertical } from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  url: string;
  order_index: number;
  is_external: boolean;
  parent_id?: string;
  children?: NavigationItem[];
}

interface NavigationProps {
  configId: string;
}

const WhiteLabelNavigation = ({ configId }: NavigationProps) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mock navigation data for now - will be replaced with real data once tables are created
  const navItems: NavigationItem[] = [
    { id: '1', label: 'Home', url: '/', order_index: 0, is_external: false },
    { id: '2', label: 'About', url: '/about', order_index: 1, is_external: false },
    { id: '3', label: 'Contact', url: '/contact', order_index: 2, is_external: false },
  ];
  const isLoading = false;

  // Mock mutations for now - will be replaced with real mutations once tables are created
  const createNavMutation = useMutation({
    mutationFn: async (navData: Partial<NavigationItem>) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: Date.now().toString(), ...navData };
    },
    onSuccess: () => {
      setIsAddModalOpen(false);
      toast({
        title: 'Success',
        description: 'Navigation item created successfully',
      });
    },
  });

  const updateNavMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NavigationItem> & { id: string }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id, ...updates };
    },
    onSuccess: () => {
      setEditingItem(null);
      toast({
        title: 'Success',
        description: 'Navigation item updated successfully',
      });
    },
  });

  const deleteNavMutation = useMutation({
    mutationFn: async (id: string) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Navigation item deleted successfully',
      });
    },
  });

  // Handle drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(navItems || []);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order indexes
    items.forEach((item, index) => {
      updateNavMutation.mutate({ id: item.id, order_index: index });
    });
  };

  const handleCreateNav = (data: FormData) => {
    const formData = Object.fromEntries(data.entries());
    
    createNavMutation.mutate({
      label: formData.label as string,
      url: formData.url as string,
      is_external: formData.is_external === 'on',
      order_index: navItems?.length || 0,
    });
  };

  const handleUpdateNav = (data: FormData) => {
    if (!editingItem) return;

    const formData = Object.fromEntries(data.entries());
    
    updateNavMutation.mutate({
      id: editingItem.id,
      label: formData.label as string,
      url: formData.url as string,
      is_external: formData.is_external === 'on',
    });
  };

  const filteredItems = navItems?.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.url.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Navigation Management</h2>
          <p className="text-muted-foreground">
            Manage the navigation menu for your white-label site
          </p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Menu Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Navigation Item</DialogTitle>
              <DialogDescription>
                Add a new item to your navigation menu
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateNav(new FormData(e.currentTarget)); }} className="space-y-4">
              <div>
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  name="label"
                  placeholder="Home"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  name="url"
                  placeholder="/home or https://example.com"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_external"
                  name="is_external"
                  className="rounded"
                />
                <Label htmlFor="is_external">External link</Label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createNavMutation.isPending}>
                  {createNavMutation.isPending ? 'Creating...' : 'Create Item'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search navigation items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Navigation Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Menu className="h-5 w-5" />
            Navigation Items
          </CardTitle>
          <CardDescription>
            Drag and drop to reorder menu items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredItems.length > 0 ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="navigation">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {filteredItems.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                              snapshot.isDragging ? 'bg-muted' : 'hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{item.label}</p>
                                <p className="text-sm text-muted-foreground">{item.url}</p>
                              </div>
                              {item.is_external && (
                                <Badge variant="outline" className="text-xs">
                                  External
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingItem(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteNavMutation.mutate(item.id)}
                                disabled={deleteNavMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="text-center py-8">
              <Menu className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No navigation items created yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Navigation Modal */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Navigation Item</DialogTitle>
            <DialogDescription>
              Update the navigation item details
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateNav(new FormData(e.currentTarget)); }} className="space-y-4">
              <div>
                <Label htmlFor="edit_label">Label</Label>
                <Input
                  id="edit_label"
                  name="label"
                  defaultValue={editingItem.label}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit_url">URL</Label>
                <Input
                  id="edit_url"
                  name="url"
                  defaultValue={editingItem.url}
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_is_external"
                  name="is_external"
                  defaultChecked={editingItem.is_external}
                  className="rounded"
                />
                <Label htmlFor="edit_is_external">External link</Label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateNavMutation.isPending}>
                  {updateNavMutation.isPending ? 'Updating...' : 'Update Item'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhiteLabelNavigation;