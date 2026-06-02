import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAgentApiKeys, AgentApiKey } from '@/hooks/useAgentApiKeys';
import { CreateApiKeyDialog } from './CreateApiKeyDialog';
import { Plus, MoreHorizontal, Trash2, Copy, Key, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const SUPABASE_BASE = 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1';

const getEndpointForKey = (permissions: string[] | null): string[] => {
  const perms = permissions || [];
  const hasContent = perms.includes('content:write');
  const hasAgent = perms.includes('all') || perms.some(p => ['read', 'assign', 'push', 'advance', 'regress'].includes(p));

  const urls: string[] = [];
  if (hasContent) urls.push(`${SUPABASE_BASE}/content-api`);
  if (hasAgent) urls.push(`${SUPABASE_BASE}/agent-matchmaker-api`);
  if (urls.length === 0) urls.push(`${SUPABASE_BASE}/agent-matchmaker-api`);
  return urls;
};

const PERMISSION_COLORS: Record<string, string> = {
  read: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  assign: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  push: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  advance: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  regress: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  all: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'content:write': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
};

export const ApiKeysManager: React.FC = () => {
  const { keys, isLoading, toggleKey, deleteKey, isDeleting, recycleKey, isRecycling } = useAgentApiKeys();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<AgentApiKey | null>(null);
  const [recycleConfirmKey, setRecycleConfirmKey] = useState<AgentApiKey | null>(null);
  const [recycledKeyData, setRecycledKeyData] = useState<{ rawKey: string; name: string; permissions: string[] | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const forcePointerUnlock = useCallback(() => {
    document.body.style.pointerEvents = 'auto';
  }, []);

  useEffect(() => {
    if (!deleteConfirmKey && !recycleConfirmKey) {
      const interval = setInterval(forcePointerUnlock, 50);
      const timeout = setTimeout(() => clearInterval(interval), 500);
      return () => { clearInterval(interval); clearTimeout(timeout); };
    }
  }, [deleteConfirmKey, recycleConfirmKey, forcePointerUnlock]);

  useEffect(() => () => { document.body.style.pointerEvents = 'auto'; }, []);

  const handleCopyKeyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('Key ID copied to clipboard');
  };

  const handleCopyRawKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    toast.success('API key copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmKey) {
      try { await deleteKey(deleteConfirmKey.id); } catch {} finally {
        setDeleteConfirmKey(null);
        forcePointerUnlock();
      }
    }
  };

  const handleRecycleConfirm = async () => {
    if (recycleConfirmKey) {
      try {
        const result = await recycleKey(recycleConfirmKey.id);
        setRecycledKeyData({ rawKey: result.rawKey, name: result.name, permissions: recycleConfirmKey.permissions });
      } catch {} finally {
        setRecycleConfirmKey(null);
        forcePointerUnlock();
      }
    }
  };

  const maskKeyHash = (hash: string) => {
    if (!hash) return '•••••••';
    return '•••••••' + hash.slice(-8);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Manage API keys for programmatic access to the matchmaker system
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="w-12 h-12 text-muted-foreground mb-4" />
              <h4 className="text-lg font-medium">No API Keys</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Create an API key to enable programmatic access
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{key.name}</p>
                        {key.description && (
                          <p className="text-xs text-muted-foreground">{key.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {maskKeyHash(key.api_key_hash)}
                        </code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyKeyId(key.id)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(key.permissions || []).map((perm) => (
                          <Badge key={perm} variant="secondary" className={`text-xs ${PERMISSION_COLORS[perm] || ''}`}>
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getEndpointForKey(key.permissions).map((url) => (
                          <code key={url} className="text-xs bg-muted px-2 py-1 rounded break-all max-w-[200px] block">
                            {url}
                          </code>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{key.rate_limit_per_minute || 60}/min</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{(key.request_count || 0).toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {key.last_used_at ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true }) : 'Never'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch checked={key.is_active ?? true} onCheckedChange={(checked) => toggleKey({ id: key.id, isActive: checked })} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setRecycleConfirmKey(key)}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Recycle Key
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteConfirmKey(key)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateApiKeyDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmKey} onOpenChange={(open) => {
        if (!open && !isDeleting) { setDeleteConfirmKey(null); forcePointerUnlock(); }
      }}>
        <AlertDialogContent onCloseAutoFocus={(e) => { e.preventDefault(); forcePointerUnlock(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the API key "{deleteConfirmKey?.name}"? This action
              cannot be undone and any integrations using this key will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recycle Confirmation */}
      <AlertDialog open={!!recycleConfirmKey} onOpenChange={(open) => {
        if (!open && !isRecycling) { setRecycleConfirmKey(null); forcePointerUnlock(); }
      }}>
        <AlertDialogContent onCloseAutoFocus={(e) => { e.preventDefault(); forcePointerUnlock(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Recycle API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new key for "{recycleConfirmKey?.name}". The old key will <strong>stop working immediately</strong>. Name, permissions, and rate limit will be preserved. Request count will reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRecycling}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleRecycleConfirm(); }} disabled={isRecycling}>
              {isRecycling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {isRecycling ? 'Recycling...' : 'Recycle Key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recycled Key Reveal Dialog */}
      <Dialog open={!!recycledKeyData} onOpenChange={(open) => {
        if (!open) { setRecycledKeyData(null); setCopied(false); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Key Recycled Successfully
            </DialogTitle>
            <DialogDescription>
              Copy the new API key below. It will only be shown once.
            </DialogDescription>
          </DialogHeader>
          {recycledKeyData && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">New API Key</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded border break-all">
                    {recycledKeyData.rawKey}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => handleCopyRawKey(recycledKeyData.rawKey)}>
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Endpoint URL</label>
                <div className="space-y-1 mt-1">
                  {getEndpointForKey(recycledKeyData.permissions).map((url) => (
                    <code key={url} className="text-xs bg-muted px-3 py-2 rounded border break-all block">
                      {url}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
