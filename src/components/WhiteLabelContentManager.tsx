import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Eye, Globe, FileText } from 'lucide-react';

interface ContentItem {
  id: string;
  page_slug: string;
  title: string;
  content: any;
  meta_tags: any;
  is_published: boolean;
  content_type: string;
  created_at: string;
  updated_at: string;
}

interface WhiteLabelContentManagerProps {
  configId: string;
}

const WhiteLabelContentManager = ({ configId }: WhiteLabelContentManagerProps) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch content items
  const { data: contentItems, isLoading } = useQuery({
    queryKey: ['white-label-content', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_content')
        .select('*')
        .eq('config_id', configId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContentItem[];
    },
  });

  // Create content mutation
  const createContentMutation = useMutation({
    mutationFn: async (contentData: { page_slug: string; title?: string; content?: any; meta_tags?: any; is_published?: boolean; content_type?: string }) => {
      const { data, error } = await supabase
        .from('white_label_content')
        .insert({
          config_id: configId,
          page_slug: contentData.page_slug,
          title: contentData.title,
          content: contentData.content,
          meta_tags: contentData.meta_tags,
          is_published: contentData.is_published,
          content_type: contentData.content_type,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['white-label-content', configId] });
      setIsAddModalOpen(false);
      toast({
        title: 'Success',
        description: 'Content created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create content',
        variant: 'destructive',
      });
    },
  });

  // Update content mutation
  const updateContentMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContentItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('white_label_content')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['white-label-content', configId] });
      setEditingContent(null);
      toast({
        title: 'Success',
        description: 'Content updated successfully',
      });
    },
  });

  // Delete content mutation
  const deleteContentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('white_label_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['white-label-content', configId] });
      toast({
        title: 'Success',
        description: 'Content deleted successfully',
      });
    },
  });

  const handleCreateContent = (data: FormData) => {
    const formData = Object.fromEntries(data.entries());
    
    createContentMutation.mutate({
      page_slug: formData.page_slug as string,
      title: formData.title as string,
      content_type: formData.content_type as string,
      content: {
        body: formData.content as string,
        sections: []
      },
      meta_tags: {
        description: formData.meta_description as string,
        keywords: formData.meta_keywords as string,
      },
      is_published: formData.is_published === 'on',
    });
  };

  const handleUpdateContent = (data: FormData) => {
    if (!editingContent) return;

    const formData = Object.fromEntries(data.entries());
    
    updateContentMutation.mutate({
      id: editingContent.id,
      title: formData.title as string,
      content: {
        body: formData.content as string,
        sections: editingContent.content.sections || []
      },
      meta_tags: {
        description: formData.meta_description as string,
        keywords: formData.meta_keywords as string,
      },
      is_published: formData.is_published === 'on',
    });
  };

  const togglePublishStatus = (content: ContentItem) => {
    updateContentMutation.mutate({
      id: content.id,
      is_published: !content.is_published,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content Management</h2>
          <p className="text-muted-foreground">
            Manage custom pages and content for your white-label site
          </p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Content
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Content</DialogTitle>
              <DialogDescription>
                Add a new page or content section to your white-label site
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateContent(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="page_slug">Page Slug</Label>
                  <Input
                    id="page_slug"
                    name="page_slug"
                    placeholder="about-us"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="content_type">Content Type</Label>
                  <Input
                    id="content_type"
                    name="content_type"
                    placeholder="page"
                    defaultValue="page"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="About Us"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  placeholder="Enter your content here..."
                  rows={6}
                />
              </div>
              
              <div>
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  name="meta_description"
                  placeholder="SEO description for this page"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="meta_keywords">Meta Keywords</Label>
                <Input
                  id="meta_keywords"
                  name="meta_keywords"
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="is_published" name="is_published" />
                <Label htmlFor="is_published">Publish immediately</Label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createContentMutation.isPending}>
                  {createContentMutation.isPending ? 'Creating...' : 'Create Content'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Content Pages
          </CardTitle>
          <CardDescription>
            Manage all content pages and sections
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : contentItems && contentItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contentItems.map((content) => (
                  <TableRow key={content.id}>
                    <TableCell className="font-medium">{content.title}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-1 py-0.5 rounded">
                        /{content.page_slug}
                      </code>
                    </TableCell>
                    <TableCell>{content.content_type}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={content.is_published ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => togglePublishStatus(content)}
                      >
                        {content.is_published ? (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            Published
                          </>
                        ) : (
                          'Draft'
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(content.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingContent(content)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteContentMutation.mutate(content.id)}
                          disabled={deleteContentMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No content pages created yet</p>
              <p className="text-sm text-muted-foreground">
                Click "Add Content" to create your first page
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Content Modal */}
      <Dialog open={!!editingContent} onOpenChange={() => setEditingContent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Update the content and settings for this page
            </DialogDescription>
          </DialogHeader>
          {editingContent && (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateContent(new FormData(e.currentTarget)); }} className="space-y-4">
              <div>
                <Label htmlFor="edit_title">Title</Label>
                <Input
                  id="edit_title"
                  name="title"
                  defaultValue={editingContent.title}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit_content">Content</Label>
                <Textarea
                  id="edit_content"
                  name="content"
                  defaultValue={editingContent.content.body || ''}
                  rows={6}
                />
              </div>
              
              <div>
                <Label htmlFor="edit_meta_description">Meta Description</Label>
                <Textarea
                  id="edit_meta_description"
                  name="meta_description"
                  defaultValue={editingContent.meta_tags?.description || ''}
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="edit_meta_keywords">Meta Keywords</Label>
                <Input
                  id="edit_meta_keywords"
                  name="meta_keywords"
                  defaultValue={editingContent.meta_tags?.keywords || ''}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="edit_is_published" 
                  name="is_published"
                  defaultChecked={editingContent.is_published}
                />
                <Label htmlFor="edit_is_published">Published</Label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateContentMutation.isPending}>
                  {updateContentMutation.isPending ? 'Updating...' : 'Update Content'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingContent(null)}
                >
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

export default WhiteLabelContentManager;