import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileText, Download, Loader2, ChevronDown, Info } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ViewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  unitId?: string | null;
  propertyAddress: string;
}

export const ViewContractModal = ({
  isOpen,
  onClose,
  propertyId,
  unitId,
  propertyAddress
}: ViewContractModalProps) => {
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    if (isOpen) {
      fetchContract();
    }
  }, [isOpen, propertyId, unitId]);
  
  const fetchContract = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('property_listing_contracts')
        .select(`
          *,
          signer:profiles!signed_by(first_name, last_name, email),
          listing_request:property_tenant_requests!listing_request_id(
            listing_event_type,
            previous_listing_id,
            created_at,
            delisted_at,
            status
          )
        `)
        .eq('property_id', propertyId)
        .order('signed_at', { ascending: false });
      
      if (unitId) {
        query = query.eq('unit_id', unitId);
      } else {
        query = query.is('unit_id', null);
      }
      
      const { data, error } = await query.limit(1).single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No contract found
          setContract(null);
        } else {
          throw error;
        }
      } else {
        setContract(data);
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
      toast({
        title: "Error",
        description: "Failed to load contract",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (!contract) return;
    
    const blob = new Blob([contract.contract_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Housing_Agreement_${propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(contract.signed_at), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Housing Services Agreement
          </DialogTitle>
          <DialogDescription>
            Signed contract for: {propertyAddress}
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : contract ? (
          <div className="flex flex-col h-[calc(80vh-200px)] gap-4">
            {/* Collapsible Contract Metadata */}
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                <ChevronDown className="h-4 w-4 transition-transform duration-200 ui-expanded:rotate-180" />
                <span>Contract Details</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Signed By</Label>
                    <p className="font-medium text-sm">{contract.signer_name}</p>
                    <p className="text-xs text-muted-foreground">{contract.signer?.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Signature Date</Label>
                    <p className="font-medium text-sm">
                      {format(new Date(contract.signed_at), 'MMM dd, yyyy hh:mm a')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Listing Event</Label>
                    <p className="font-medium text-sm capitalize">
                      {contract.listing_request?.listing_event_type?.replace('_', ' ') || 'Initial Listing'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Contract Status</Label>
                    <p className="font-medium text-sm capitalize">{contract.contract_status || 'active'}</p>
                    {contract.contract_status === 'inactive' && contract.listing_request?.delisted_at && (
                      <p className="text-xs text-muted-foreground">
                        Delisted: {format(new Date(contract.listing_request.delisted_at), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Digital Signature</Label>
                    <p className="font-medium text-sm font-serif italic">{contract.digital_signature}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Listing Date</Label>
                    <p className="font-medium text-sm">
                      {format(new Date(contract.listing_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {/* Contract Text - Main Focus */}
            <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                <h3 className="font-medium">Contract Terms</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
              <ScrollArea className="flex-1 p-6">
                <div className="text-sm leading-7 whitespace-pre-wrap">
                  {contract.contract_text}
                </div>
              </ScrollArea>
            </div>
            
            {/* Collapsible Audit Info */}
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-3 w-3" />
                <span>Audit Information</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded mt-2 space-y-1">
                  <p>IP Address: {contract.ip_address || 'N/A'}</p>
                  <p className="truncate">User Agent: {contract.user_agent || 'N/A'}</p>
                  <p>Contract Version: {contract.contract_version}</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No contract found for this listing</p>
            <p className="text-sm text-muted-foreground mt-2">
              This may be a legacy listing created before contract tracking was implemented.
            </p>
          </div>
        )}
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};