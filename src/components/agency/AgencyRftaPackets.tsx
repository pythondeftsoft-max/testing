import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import CreateRftaDialog from './CreateRftaDialog';
import HudAffordabilityCalculator from './HudAffordabilityCalculator';
import RentReasonableness from './RentReasonableness';
import HudFormButton from './hud-pdfs/HudFormButton';

interface RftaPacket {
  id: string;
  tenant_id: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  decision_notes: string | null;
  created_at: string;
  share_token?: string | null;
  property_id?: string | null;
  unit_id?: string | null;
}

interface AgencyRftaPacketsProps {
  packets: RftaPacket[];
  loading: boolean;
  canManage: boolean;
  agencyId: string;
  staffId?: string;
  onUpdateStatus: (id: string, status: string) => void;
  onRefresh: () => void;
}

const statusColor = (s: string): "default" | "warning" | "success" | "destructive" | "secondary" => {
  switch (s) {
    case 'draft': return 'secondary';
    case 'submitted': return 'warning';
    case 'under_review': return 'default';
    case 'approved': return 'success';
    case 'denied': return 'destructive';
    default: return 'secondary';
  }
};

const AgencyRftaPackets: React.FC<AgencyRftaPacketsProps> = ({ packets, loading, canManage, agencyId, staffId, onUpdateStatus, onRefresh }) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const copyShareLink = (token: string, id: string) => {
    const link = `${window.location.origin}/rfta/submit/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success('Link copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> RFTA Packets ({packets.length})
            </CardTitle>
            {canManage && (
              <div className="flex gap-2">
                <HudAffordabilityCalculator />
                <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
                  <Plus className="h-3 w-3" /> New RFTA
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Packet ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Reviewed</TableHead>
                    <TableHead>Notes</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packets.length ? packets.map(p => (
                    <React.Fragment key={p.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      >
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-1">
                            {expandedId === p.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {p.id.slice(0, 8)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColor(p.status)}>
                            {p.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : '—'}</TableCell>
                        <TableCell className="text-sm">{p.reviewed_at ? new Date(p.reviewed_at).toLocaleDateString() : '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.decision_notes || '—'}</TableCell>
                        {canManage && (
                          <TableCell onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <HudFormButton formNumber="52517" entityId={p.id} agencyName="Housing Authority" variant="ghost" />
                              {p.share_token && (
                                <Button size="sm" variant="ghost" onClick={() => copyShareLink(p.share_token!, p.id)}>
                                  {copiedId === p.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              )}
                              {p.status === 'submitted' && (
                                <Button size="sm" variant="outline" onClick={() => onUpdateStatus(p.id, 'under_review')}>
                                  Review
                                </Button>
                              )}
                              {p.status === 'under_review' && (
                                <>
                                  <Button size="sm" variant="default" onClick={() => onUpdateStatus(p.id, 'approved')}>
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => onUpdateStatus(p.id, 'denied')}>
                                    Deny
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      {expandedId === p.id && (
                        <TableRow>
                          <TableCell colSpan={canManage ? 6 : 5} className="p-0">
                            <div className="p-4 bg-muted/20 border-t">
                              <RentReasonableness
                                agencyId={agencyId}
                                rftaId={p.id}
                                proposedRent={0}
                                staffId={staffId || ''}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={canManage ? 6 : 5} className="text-center py-8 text-muted-foreground">
                        No RFTA packets found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateRftaDialog open={createOpen} onOpenChange={setCreateOpen} agencyId={agencyId} onCreated={onRefresh} />
    </>
  );
};

export default AgencyRftaPackets;
