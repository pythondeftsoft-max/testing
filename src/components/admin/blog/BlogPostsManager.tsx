import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search } from 'lucide-react';
import { useDeleteBlogPost } from '@/hooks/useBlogPosts';
import { useBlogPostsWithTranslations } from '@/hooks/useBlogPostsWithTranslations';
import { BlogPostEditor } from './BlogPostEditor';
import { BlogPostAnalyticsSheet } from './BlogPostAnalyticsSheet';
import { PostRowGroup } from './PostRowGroup';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export const BlogPostsManager = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [analyticsPost, setAnalyticsPost] = useState<any>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  
  const { data: posts = [], isLoading } = useBlogPostsWithTranslations();
  const deleteBlogPost = useDeleteBlogPost();

  const handleViewAnalytics = (post: any) => {
    setAnalyticsPost(post);
    setIsAnalyticsOpen(true);
  };

  const handleView = (slug: string) => {
    window.open(`/blog/${slug.replace(/^\//, '')}`, '_blank');
  };

  const handleEdit = async (post: any) => {
    // If it's a child translation, fetch full post data
    if (!post.content && !post.content_structure) {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', post.id)
        .single();
      setEditingPost(data);
    } else {
      setEditingPost(post);
    }
    setIsEditorOpen(true);
  };

  const handleDelete = (postId: string) => {
    deleteBlogPost.mutate(postId);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingPost(null);
  };

  const toggleExpanded = (postId: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  // Filter posts by search query (searches title and slug across parent and children)
  const filteredPosts = posts.filter(post => {
    const searchLower = searchQuery.toLowerCase();
    const matchesParent = 
      post.title.toLowerCase().includes(searchLower) ||
      post.slug.toLowerCase().includes(searchLower);
    const matchesChild = post.translations.some(
      t => t.title.toLowerCase().includes(searchLower) || t.slug.toLowerCase().includes(searchLower)
    );
    return matchesParent || matchesChild;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Blog Posts</h2>
          <p className="text-muted-foreground">Manage your blog content and publishing</p>
        </div>
        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPost(null)}>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editingPost ? 'Edit Post' : 'Create New Post'}
              </DialogTitle>
              <DialogDescription>
                {editingPost ? 'Update your blog post' : 'Create a new blog post with rich content'}
              </DialogDescription>
            </DialogHeader>
            <BlogPostEditor 
              post={editingPost} 
              onClose={handleCloseEditor}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Posts Overview
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No posts match your search.' : 'No posts yet. Create your first post!'}
            </div>
          ) : (
            <div className="command-table-container overflow-hidden">
              <Table className="table-compact w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Title</TableHead>
                    <TableHead className="w-16">Lang</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-24">Created</TableHead>
                    <TableHead className="w-16">Views</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.map(post => (
                    <PostRowGroup
                      key={post.id}
                      post={post}
                      isExpanded={expandedPosts.has(post.id)}
                      onToggle={() => toggleExpanded(post.id)}
                      onView={handleView}
                      onAnalytics={handleViewAnalytics}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <BlogPostAnalyticsSheet 
        open={isAnalyticsOpen}
        onOpenChange={setIsAnalyticsOpen}
        post={analyticsPost}
      />
    </div>
  );
};
