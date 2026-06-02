import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Calendar, Clock, Plus, Edit, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';

export const BlogScheduler = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: scheduledPosts, isLoading } = useQuery({
    queryKey: ['scheduled-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_schedules')
        .select(`
          *,
          blog_posts(title, slug, status),
          blog_topics(title)
        `)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: draftPosts } = useQuery({
    queryKey: ['draft-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, created_at')
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      published: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const columns = [
    {
      accessorKey: 'scheduled_for',
      header: 'Scheduled For',
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">
            {format(new Date(row.getValue('scheduled_for')), 'PPP')}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(row.getValue('scheduled_for')), 'p')}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'blog_posts.title',
      header: 'Post',
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.blog_posts?.title || row.original.blog_topics?.title}</p>
          <p className="text-sm text-muted-foreground">
            {row.original.blog_posts?.slug || 'Auto-generated'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'schedule_type',
      header: 'Type',
      cell: ({ row }: any) => (
        <Badge variant="outline">
          {row.getValue('schedule_type')}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge className={getStatusBadge(row.getValue('status'))}>
          {row.getValue('status')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Content Scheduler</h2>
          <p className="text-muted-foreground">Schedule and manage automatic blog publishing</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Post
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Posts */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Scheduled Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading scheduled posts...</div>
              ) : scheduledPosts && scheduledPosts.length > 0 ? (
                <DataTable columns={columns} data={scheduledPosts} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No scheduled posts</p>
                  <p className="text-sm">Schedule content to automate your publishing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Draft Posts & Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Draft Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {draftPosts && draftPosts.length > 0 ? (
                <div className="space-y-3">
                  {draftPosts.slice(0, 5).map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{post.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Calendar className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {draftPosts.length > 5 && (
                    <p className="text-center text-sm text-muted-foreground">
                      +{draftPosts.length - 5} more drafts
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No draft posts</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publishing Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">This Week</span>
                  <span className="font-medium">0 posts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Week</span>
                  <span className="font-medium">{scheduledPosts?.length || 0} scheduled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Publishing Frequency</span>
                  <span className="font-medium">Manual</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calendar View Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Publishing Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Calendar view will be implemented here</p>
            <p className="text-sm">Visual timeline of scheduled and published content</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};