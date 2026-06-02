import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Eye, ExternalLink, Search } from 'lucide-react';
import {
  useContentList,
  useDeleteContent,
  useBulkUpdateContentStatus,
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
} from '@/hooks/useContent';
import { ContentEditor } from './ContentEditor';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-warning/20 text-warning',
  published: 'bg-success/20 text-success',
};

export const ContentManager: React.FC = () => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: items = [], isLoading } = useContentList({
    contentType: filterType || undefined,
    status: filterStatus || undefined,
    search: search || undefined,
  });

  const deleteMutation = useDeleteContent();
  const bulkUpdate = useBulkUpdateContentStatus();

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selected.length === items.length) {
      setSelected([]);
    } else {
      setSelected(items.map((p) => p.id));
    }
  };

  if (editingId || creating) {
    return (
      <ContentEditor
        contentId={editingId}
        onClose={() => {
          setEditingId(null);
          setCreating(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-52"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CONTENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {CONTENT_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Content
          </Button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="flex gap-2 items-center text-sm">
          <span className="text-muted-foreground">{selected.length} selected</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkUpdate.mutate({ ids: selected, status: 'published' })}
          >
            Publish
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkUpdate.mutate({ ids: selected, status: 'draft' })}
          >
            Unpublish
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No content yet.</p>
          <Button className="mt-4" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create First Content
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left w-8">
                  <Checkbox
                    checked={selected.length === items.length && items.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="p-2 text-left">Title</th>
                <th className="p-2 text-left hidden md:table-cell">Type</th>
                <th className="p-2 text-left hidden lg:table-cell">Location</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left hidden md:table-cell">Date</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t hover:bg-muted/20">
                  <td className="p-2">
                    <Checkbox
                      checked={selected.includes(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  </td>
                  <td className="p-2">
                    <button
                      className="text-left hover:underline font-medium text-foreground"
                      onClick={() => setEditingId(item.id)}
                    >
                      {item.title}
                    </button>
                    <div className="text-xs text-muted-foreground">/{item.slug}</div>
                  </td>
                  <td className="p-2 hidden md:table-cell">
                    <Badge variant="secondary" className="text-xs">
                      {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
                    </Badge>
                    {item.template && (
                      <Badge variant="outline" className="text-xs ml-1">
                        {item.template}
                      </Badge>
                    )}
                  </td>
                  <td className="p-2 hidden lg:table-cell text-muted-foreground">
                    {[item.city, item.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="p-2">
                    <Badge className={STATUS_COLORS[item.status] || ''}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="p-2 hidden md:table-cell text-muted-foreground">
                    {format(new Date(item.publish_date || item.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="p-2 text-right space-x-1">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const cleanSlug = item.slug.replace(/^\/+/, '');
                          if (item.status !== 'published') {
                            navigate(`/${cleanSlug}?preview=true`);
                          } else {
                            const publishedUrl = item.content_type === 'blog_post'
                              ? `/blog/${cleanSlug}`
                              : `/${cleanSlug}`;
                            navigate(publishedUrl);
                          }
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingId(item.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
