import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileText, User, Home, ChevronDown, ChevronUp, DollarSign, CheckCircle, XCircle } from 'lucide-react';

interface RFTAInboxTabProps {
  rftaPackets: any[];
  getStatusBadge: (status: string) => React.ReactNode;
  onRespond?: (packetId: string, action: 'accepted' | 'declined') => void;
}

export const RFTAInboxTab = ({ rftaPackets, getStatusBadge, onRespond }: RFTAInboxTabProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (rftaPackets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No RFTA Requests</h3>
          <p className="text-muted-foreground">No Request for Tenancy Approval packets have been sent to you yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Badge variant="outline">{rftaPackets.length} Total</Badge>
        <Badge variant="secondary">{rftaPackets.filter(p => p.status === 'submitted' || p.status === 'pending').length} Awaiting Review</Badge>
      </div>

      {rftaPackets.map((packet: any) => {
        const isExpanded = expandedId === packet.id;
        const tenantData = packet.tenant_data as Record<string, any> | null;
        const landlordData = packet.landlord_data as Record<string, any> | null;
        const packetData = packet.packet_data as Record<string, any> | null;

        const tenantName = tenantData?.name || tenantData?.full_name || 'Tenant';
        const proposedRent = landlordData?.proposed_rent || packetData?.proposed_rent || packetData?.contract_rent;
        const leaseStart = packetData?.lease_start || packetData?.lease_begin_date;
        const leaseEnd = packetData?.lease_end || packetData?.lease_end_date;
        const canRespond = packet.status === 'submitted' || packet.status === 'pending';

        return (
          <Collapsible key={packet.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : packet.id)}>
            <Card>
              <CardContent className="py-4">
                <CollapsibleTrigger className="w-full text-left">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <p className="font-medium">{tenantName}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-6 text-sm text-muted-foreground">
                        <Home className="w-3.5 h-3.5" />
                        <span>{packet.property_address || `Property #${packet.property_id?.slice(0, 8) || '—'}`}</span>
                        {packet.unit_number && <span>— Unit {packet.unit_number}</span>}
                      </div>
                      <div className="flex items-center gap-4 ml-6 text-sm text-muted-foreground">
                        {proposedRent && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            ${Number(proposedRent).toLocaleString()}/mo
                          </span>
                        )}
                        <span>
                          Submitted: {packet.submitted_at ? new Date(packet.submitted_at).toLocaleDateString() : 'Pending'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(packet.status)}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-4 pt-4 border-t border-border space-y-3 ml-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      {leaseStart && (
                        <div>
                          <p className="text-muted-foreground text-xs">Lease Start</p>
                          <p className="font-medium">{new Date(leaseStart).toLocaleDateString()}</p>
                        </div>
                      )}
                      {leaseEnd && (
                        <div>
                          <p className="text-muted-foreground text-xs">Lease End</p>
                          <p className="font-medium">{new Date(leaseEnd).toLocaleDateString()}</p>
                        </div>
                      )}
                      {proposedRent && (
                        <div>
                          <p className="text-muted-foreground text-xs">Proposed Rent</p>
                          <p className="font-medium">${Number(proposedRent).toLocaleString()}</p>
                        </div>
                      )}
                      {packet.reviewed_at && (
                        <div>
                          <p className="text-muted-foreground text-xs">Reviewed</p>
                          <p className="font-medium">{new Date(packet.reviewed_at).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    {packet.decision_notes && (
                      <p className="text-sm text-muted-foreground p-2 bg-muted rounded">{packet.decision_notes}</p>
                    )}

                    {canRespond && onRespond && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={() => onRespond(packet.id, 'accepted')}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onRespond(packet.id, 'declined')}>
                          <XCircle className="w-3 h-3 mr-1" /> Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};
