import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Eye, ExternalLink } from 'lucide-react';
import {
  useStructuredPages,
  useDeleteStructuredPage,
  useBulkUpdateStatus,
  PAGE_TYPES,
} from '@/hooks/useStructuredPages';
import { StructuredPageEditor } from './StructuredPageEditor';

const TYPE_LABELS: Record<string, string> = {
  section8_city: 'Section 8 (City)',
  section8_state: 'Section 8 (State)',
  landlord_city: 'Landlord (City)',
  property_management_city: 'Property Mgmt (City)',
  software_comparison: 'Software Comparison',
  rent_data_city: 'Rent Data (City)',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-warning/20 text-warning',
  published: 'bg-success/20 text-success',
};

export const StructuredPagesManager: React.FC = () => {
  const [filterType, setFilterType] = useState<string>('');
  const [filterState, setFilterState] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: pages = [], isLoading } = useStructuredPages({
    pageType: filterType || undefined,
    state: filterState || undefined,
    status: filterStatus || undefined,
    search: search || undefined,
  });

  const deleteMutation = useDeleteStructuredPage();
  const bulkUpdate = useBulkUpdateStatus();

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selected.length === pages.length) {
      setSelected([]);
    } else {
      setSelected(pages.map((p) => p.id));
    }
  };

  if (editingPageId || creating) {
    return (
      <StructuredPageEditor
        pageId={editingPageId}
        onClose={() => {
          setEditingPageId(null);
          setCreating(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PAGE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABELS[t]}
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
        <Input
          placeholder="Filter state..."
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="w-36"
        />
        <div className="ml-auto">
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Page
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
      ) : pages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No structured pages yet.</p>
          <Button className="mt-4" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create First Page
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left w-8">
                  <Checkbox
                    checked={selected.length === pages.length && pages.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="p-2 text-left">Title</th>
                <th className="p-2 text-left hidden md:table-cell">Type</th>
                <th className="p-2 text-left hidden lg:table-cell">Location</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id} className="border-t hover:bg-muted/20">
                  <td className="p-2">
                    <Checkbox
                      checked={selected.includes(page.id)}
                      onCheckedChange={() => toggleSelect(page.id)}
                    />
                  </td>
                  <td className="p-2">
                    <button
                      className="text-left hover:underline font-medium text-foreground"
                      onClick={() => setEditingPageId(page.id)}
                    >
                      {page.title}
                    </button>
                    <div className="text-xs text-muted-foreground">/{page.slug}</div>
                  </td>
                  <td className="p-2 hidden md:table-cell">
                    <Badge variant="secondary" className="text-xs">
                      {TYPE_LABELS[page.page_type] || page.page_type}
                    </Badge>
                  </td>
                  <td className="p-2 hidden lg:table-cell text-muted-foreground">
                    {[page.city, page.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="p-2">
                    <Badge className={STATUS_COLORS[page.status] || ''}>
                      {page.status}
                    </Badge>
                  </td>
                  <td className="p-2 text-right space-x-1">
                    {page.status === 'published' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => window.open(`/${page.slug}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingPageId(page.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(page.id)}
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
