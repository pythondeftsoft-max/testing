import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, Mail, Search, Filter, Clock, Shield, Key, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { useEmailQueue, EmailQueueItem } from '@/hooks/useEmailQueue';
import { useUserEmail } from '@/hooks/useUserEmail';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

interface EmailQueueTableProps {
  className?: string;
}

const EmailQueueTable = ({ className }: EmailQueueTableProps) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [templateFilter, setTemplateFilter] = useState<string>('all-types');
  const [previewEmail, setPreviewEmail] = useState<EmailQueueItem | null>(null);

  const { data: emails = [], isLoading } = useEmailQueue({
    status: statusFilter,
    search: searchTerm,
    templateSlug: templateFilter,
    limit: 500
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'sent':
        return <Badge variant="success">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEmailTypeIcon = (type?: EmailQueueItem['email_type']) => {
    if (!type || type === 'custom') return <Mail className="w-3 h-3" />;
    
    switch (type) {
      case 'auth_confirmation':
        return <Shield className="w-3 h-3" />;
      case 'auth_password_reset':
        return <Key className="w-3 h-3" />;
      case 'auth_magic_link':
      case 'auth_invite':
        return <UserPlus className="w-3 h-3" />;
      default:
        return <Mail className="w-3 h-3" />;
    }
  };

  const getEmailTypeLabel = (type?: EmailQueueItem['email_type']) => {
    if (!type || type === 'custom') return 'Custom';
    
    switch (type) {
      case 'auth_confirmation':
        return 'Auth';
      case 'auth_password_reset':
        return 'Reset';
      case 'auth_magic_link':
        return 'Magic';
      case 'auth_invite':
        return 'Invite';
      default:
        return 'Custom';
    }
  };

  const getEmailTypeBadgeVariant = (type?: EmailQueueItem['email_type']) => {
    return type && type.startsWith('auth_') ? 'secondary' : 'default';
  };

  const columns: ColumnDef<EmailQueueItem>[] = [
    {
      accessorKey: 'sent_at',
      header: 'Date',
      cell: ({ row }) => {
        const status = row.original.status;
        const sentAt = row.original.sent_at;
        const createdAt = row.original.created_at;
        
        if (status === 'sent' && sentAt) {
          return (
            <div className="text-sm">
              <div className="font-medium">
                {format(new Date(sentAt), 'MMM dd, HH:mm')}
              </div>
              <div className="text-xs text-muted-foreground">Sent</div>
            </div>
          );
        }
        
        return (
          <div className="text-sm">
            <div className="font-medium">
              {format(new Date(createdAt), 'MMM dd, HH:mm')}
            </div>
            <div className="text-xs text-muted-foreground">Queued</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'email_type',
      header: 'Category',
      cell: ({ row }) => {
        const emailType = row.original.email_type;
        return (
          <Badge 
            variant={getEmailTypeBadgeVariant(emailType)}
            className="flex items-center gap-1 w-fit"
          >
            {getEmailTypeIcon(emailType)}
            {getEmailTypeLabel(emailType)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ row }) => (
        <div className="max-w-xs truncate font-medium">
          {row.getValue('subject')}
        </div>
      ),
    },
    {
      accessorKey: 'to_email',
      header: 'Recipient',
      cell: ({ row }) => {
        const toEmail = row.getValue('to_email') as string | null;
        const userId = row.original.user_id;
        
        // Use hook to fetch user email if to_email is null
        const { data: userEmail } = useUserEmail(!toEmail ? userId : null);
        
        const displayEmail = toEmail || userEmail;
        
        if (!displayEmail) {
          return <span className="text-xs text-muted-foreground">Loading...</span>;
        }
        
        return (
          <div className="max-w-[180px] truncate text-sm" title={displayEmail}>
            {displayEmail}
          </div>
        );
      },
    },
    {
      accessorKey: 'template_slug',
      header: 'Type',
      cell: ({ row }) => {
        const slug = row.getValue('template_slug') as string | null;
        if (!slug) return <Badge variant="outline" className="text-xs">Legacy</Badge>;
        
        const typeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'occupied' | 'neutral' }> = {
          'maintenance_request_update': { label: 'Maintenance', variant: 'warning' },
          'lease_renewal_reminder': { label: 'Lease Renewal', variant: 'occupied' },
          'housing_contract_available': { label: 'Contract', variant: 'success' },
          'asset_reminder_immediate': { label: 'Asset Reminder', variant: 'warning' },
          'asset_digest_weekly': { label: 'Digest', variant: 'secondary' },
          'welcome_new_user': { label: 'Welcome', variant: 'success' },
          'account_invitation': { label: 'Account Invite', variant: 'secondary' },
          'account_invitation_resend': { label: 'Account Invite (Resend)', variant: 'secondary' },
          'payment_confirmation': { label: 'Payment', variant: 'success' },
          'payment_notification': { label: 'Payment Alert', variant: 'success' },
          'tenant_property_match': { label: 'Property Match', variant: 'default' },
          'system_admin_invitation': { label: 'Admin Invitation', variant: 'secondary' },
          'password_reset': { label: 'Password Reset', variant: 'default' },
          'portfolio_invitation': { label: 'Portfolio Invite', variant: 'secondary' },
          'newsletter_welcome': { label: 'Newsletter Welcome', variant: 'default' },
        };
        
        const type = typeMap[slug] || { label: slug, variant: 'neutral' as const };
        
        return (
          <Badge variant={type.variant} className="text-xs">
            {type.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.getValue('status')),
    },
    {
      accessorKey: 'body',
      header: 'Preview',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate text-muted-foreground text-sm">
          {(row.getValue('body') as string).replace(/<[^>]*>/g, '').substring(0, 100)}...
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const toEmail = row.original.to_email;
        const userId = row.original.user_id;
        const { data: userEmail } = useUserEmail(!toEmail ? userId : null);
        const displayEmail = toEmail || userEmail;
        
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewEmail(row.original)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Preview
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Subject:</label>
                  <p className="text-sm text-muted-foreground">{row.original.subject}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Recipient:</label>
                  <p className="text-sm text-muted-foreground">
                    {displayEmail || 'Loading...'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status:</label>
                  <div className="mt-1">{getStatusBadge(row.original.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Created:</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(row.original.created_at), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </div>
                {row.original.sent_at && (
                  <div>
                    <label className="text-sm font-medium">Sent At:</label>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(row.original.sent_at), 'MMM dd, yyyy HH:mm:ss')}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Email Category:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={getEmailTypeBadgeVariant(row.original.email_type)}>
                      <span className="flex items-center gap-1">
                        {getEmailTypeIcon(row.original.email_type)}
                        {getEmailTypeLabel(row.original.email_type)}
                      </span>
                    </Badge>
                  </div>
                </div>
                {row.original.auth_metadata && (
                  <div>
                    <label className="text-sm font-medium">Auth Details:</label>
                    <pre className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded">
                      {JSON.stringify(row.original.auth_metadata, null, 2)}
                    </pre>
                  </div>
                )}
                {row.original.template_slug && (
                  <div>
                    <label className="text-sm font-medium">Template Type:</label>
                    <div className="mt-1">
                      {(() => {
                        const slug = row.original.template_slug;
                        const typeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'occupied' | 'neutral' }> = {
                          'maintenance_request_update': { label: 'Maintenance', variant: 'warning' },
                          'lease_renewal_reminder': { label: 'Lease Renewal', variant: 'occupied' },
                          'housing_contract_available': { label: 'Contract', variant: 'success' },
                          'asset_reminder_immediate': { label: 'Asset Reminder', variant: 'warning' },
                          'asset_digest_weekly': { label: 'Digest', variant: 'secondary' },
                          'welcome_new_user': { label: 'Welcome', variant: 'success' },
                          'account_invitation': { label: 'Account Invite', variant: 'secondary' },
                          'account_invitation_resend': { label: 'Account Invite (Resend)', variant: 'secondary' },
                          'payment_confirmation': { label: 'Payment', variant: 'success' },
                          'payment_notification': { label: 'Payment Alert', variant: 'success' },
                          'tenant_property_match': { label: 'Property Match', variant: 'default' },
                          'system_admin_invitation': { label: 'Admin Invitation', variant: 'secondary' },
                          'password_reset': { label: 'Password Reset', variant: 'default' },
                          'portfolio_invitation': { label: 'Portfolio Invite', variant: 'secondary' },
                          'newsletter_welcome': { label: 'Newsletter Welcome', variant: 'default' },
                        };
                        const type = typeMap[slug!] || { label: slug!, variant: 'neutral' as const };
                        return <Badge variant={type.variant}>{type.label}</Badge>;
                      })()}
                    </div>
                  </div>
                )}
                {row.original.link && (
                  <div>
                    <label className="text-sm font-medium">Link:</label>
                    <p className="text-sm text-blue-600 break-all">{row.original.link}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Body:</label>
                  <ScrollArea className="h-60 w-full border rounded-md p-4 bg-muted/50">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(row.original.body) }}
                    />
                  </ScrollArea>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      },
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Queue
          </div>
          <Badge variant="outline">{emails.length} emails</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Email Type" />
            </SelectTrigger>
          <SelectContent>
              <SelectItem value="all-types">All Types</SelectItem>
              <SelectItem value="maintenance_request_update">Maintenance</SelectItem>
              <SelectItem value="lease_renewal_reminder">Lease Renewal</SelectItem>
              <SelectItem value="housing_contract_available">Contract</SelectItem>
              <SelectItem value="asset_reminder_immediate">Asset Reminder</SelectItem>
              <SelectItem value="asset_digest_weekly">Digest</SelectItem>
              <SelectItem value="welcome_new_user">Welcome</SelectItem>
              <SelectItem value="account_invitation">Account Invite</SelectItem>
              <SelectItem value="account_invitation_resend">Account Invite (Resend)</SelectItem>
              <SelectItem value="payment_confirmation">Payment</SelectItem>
              <SelectItem value="payment_notification">Payment Alert</SelectItem>
              <SelectItem value="tenant_property_match">Property Match</SelectItem>
              <SelectItem value="system_admin_invitation">Admin Invitation</SelectItem>
              <SelectItem value="password_reset">Password Reset</SelectItem>
              <SelectItem value="portfolio_invitation">Portfolio Invite</SelectItem>
              <SelectItem value="newsletter_welcome">Newsletter Welcome</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={emails}
        />
      </CardContent>
    </Card>
  );
};

export default EmailQueueTable;