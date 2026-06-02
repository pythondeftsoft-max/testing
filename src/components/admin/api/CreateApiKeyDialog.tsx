import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAgentApiKeys } from '@/hooks/useAgentApiKeys';
import { Key, Copy, Check, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUPABASE_BASE = 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1';

const getEndpointUrls = (permissions: string[]): { label: string; url: string }[] => {
  const urls: { label: string; url: string }[] = [];
  const hasContent = permissions.includes('content:write');
  const hasMatchmaker = permissions.some(p => ['read', 'assign', 'push', 'advance', 'regress', 'all'].includes(p));

  if (hasContent || permissions.includes('all')) {
    urls.push({ label: 'Content API', url: `${SUPABASE_BASE}/content-api` });
  }
  if (hasMatchmaker || permissions.includes('all')) {
    urls.push({ label: 'Agent Matchmaker API', url: `${SUPABASE_BASE}/agent-matchmaker-api` });
  }
  if (urls.length === 0) {
    urls.push({ label: 'Agent Matchmaker API', url: `${SUPABASE_BASE}/agent-matchmaker-api` });
  }
  return urls;
};

const AVAILABLE_PERMISSIONS = [
  { value: 'read', label: 'Read', description: 'View pipeline, queue, and territory data' },
  { value: 'assign', label: 'Assign', description: 'Assign/unassign entities to workers' },
  { value: 'push', label: 'Push', description: 'Create, update, and delete property pushes' },
  { value: 'advance', label: 'Advance', description: 'Move entities forward in pipeline' },
  { value: 'regress', label: 'Regress', description: 'Move entities backward in pipeline' },
  { value: 'content:write', label: 'Content', description: 'Create and publish blog posts via API' },
  { value: 'all', label: 'All Access', description: 'Full access to all API endpoints' },
];

export const CreateApiKeyDialog: React.FC<CreateApiKeyDialogProps> = ({ open, onOpenChange }) => {
  const { createKey, isCreating } = useAgentApiKeys();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['read']);
  const [rateLimit, setRateLimit] = useState(60);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePermissionToggle = (permission: string) => {
    if (permission === 'all') {
      setPermissions(['all']);
    } else {
      setPermissions((prev) => {
        const filtered = prev.filter((p) => p !== 'all');
        if (filtered.includes(permission)) {
          return filtered.filter((p) => p !== permission);
        }
        return [...filtered, permission];
      });
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    if (permissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    try {
      const result = await createKey({
        name: name.trim(),
        description: description.trim() || undefined,
        permissions,
        rateLimitPerMinute: rateLimit,
      });

      setCreatedKey(result.rawKey);
    } catch (error) {
      console.error('Failed to create key:', error);
    }
  };

  const handleCopyKey = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      toast.success('API key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setPermissions(['read']);
    setRateLimit(60);
    setCreatedKey(null);
    setCopied(false);
    onOpenChange(false);
  };

  // Show key display after creation
  if (createdKey) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-success" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Your API key has been created successfully. Make sure to copy it now - you won't be
              able to see it again!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Important</p>
                  <p className="text-sm text-muted-foreground">
                    This key will only be shown once. Store it securely.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>Your API Key</Label>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 bg-muted p-3 rounded-lg text-sm font-mono break-all">
                  {createdKey}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopyKey}>
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label>Endpoint URL{getEndpointUrls(permissions).length > 1 ? 's' : ''}</Label>
              {getEndpointUrls(permissions).map((ep) => (
                <div key={ep.url} className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">{ep.label}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted p-2 rounded-lg text-xs font-mono break-all">
                      {ep.url}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(ep.url);
                        toast.success('Endpoint URL copied');
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Create API Key
          </DialogTitle>
          <DialogDescription>
            Create a new API key for programmatic access to the matchmaker system
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="key-name">Name *</Label>
            <Input
              id="key-name"
              placeholder="e.g., Production API Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="key-description">Description</Label>
            <Textarea
              id="key-description"
              placeholder="What is this key used for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Permissions */}
          <div>
            <Label>Permissions *</Label>
            <div className="mt-2 space-y-2">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <div key={perm.value} className="flex items-start gap-3">
                  <Checkbox
                    id={`perm-${perm.value}`}
                    checked={permissions.includes(perm.value)}
                    onCheckedChange={() => handlePermissionToggle(perm.value)}
                    disabled={perm.value !== 'all' && permissions.includes('all')}
                  />
                  <div className="grid gap-0.5">
                    <label
                      htmlFor={`perm-${perm.value}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {perm.label}
                    </label>
                    <p className="text-xs text-muted-foreground">{perm.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rate Limit */}
          <div>
            <Label htmlFor="rate-limit">Rate Limit (requests per minute)</Label>
            <Input
              id="rate-limit"
              type="number"
              min={1}
              max={1000}
              value={rateLimit}
              onChange={(e) => setRateLimit(parseInt(e.target.value) || 60)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum number of requests allowed per minute
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Create Key
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
