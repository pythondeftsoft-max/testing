import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ClientPortfolio } from '@/hooks/useClientProperties';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, Building2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DeleteClientDialogProps {
  client: ClientPortfolio | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const DeleteClientDialog: React.FC<DeleteClientDialogProps> = ({
  client,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!client) return;
    setIsDeleting(true);

    try {
      // Step 1: Delete all properties (cascades to all property data)
      const { error: propsError } = await supabase
        .from('properties')
        .delete()
        .eq('portfolio_id', client.id);

      if (propsError) throw propsError;

      // Step 2: Delete the portfolio
      const { error: portfolioError } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', client.id);

      if (portfolioError) throw portfolioError;

      // Step 3: Verify the portfolio was actually deleted (RLS can silently fail)
      const { count, error: verifyError } = await supabase
        .from('portfolios')
        .select('id', { count: 'exact', head: true })
        .eq('id', client.id);

      if (verifyError) throw verifyError;

      if (count !== null && count > 0) {
        throw new Error('Delete operation failed - you may not have permission to delete this client');
      }

      toast.success(`Client "${client.client_name}" and all associated data deleted`);
      onSuccess();
      // Removed redundant onOpenChange(false) - onSuccess already closes via setDeleteDialogOpen(false)
    } catch (error) {
      console.error('Error deleting client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete client. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // Keep reference to client data for smooth unmount animation
  // This prevents UI freeze when client becomes null before modal closes
  const [displayClient, setDisplayClient] = React.useState<ClientPortfolio | null>(null);
  
  React.useEffect(() => {
    if (client) {
      setDisplayClient(client);
    }
  }, [client]);

  // Clear display client after modal fully closes
  React.useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => setDisplayClient(null), 200);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const clientToShow = client || displayClient;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent 
        className="max-w-2xl"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          // Ensure pointer-events is reset when dialog closes
          document.body.style.pointerEvents = 'auto';
        }}
      >
        {clientToShow ? (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <AlertDialogTitle>Delete Client & All Data?</AlertDialogTitle>
              </div>
              <AlertDialogDescription asChild>
                <div className="space-y-4 text-left">
                  <p className="text-base">
                    You are about to permanently delete the following:
                  </p>

                  {/* Client Info */}
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="font-semibold text-foreground">CLIENT</div>
                    <div className="text-sm">
                      <div className="font-medium text-foreground">{clientToShow.client_name}</div>
                      <div className="text-muted-foreground mt-1">
                        {clientToShow.client_email && <div>Email: {clientToShow.client_email}</div>}
                        {clientToShow.client_phone && <div>Phone: {clientToShow.client_phone}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Properties Info */}
                  {clientToShow.properties.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          PROPERTIES ({clientToShow.properties.length})
                        </div>
                        <Badge variant="destructive">Will be deleted</Badge>
                      </div>
                      <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                        {clientToShow.properties.map((property) => (
                          <div key={property.id} className="text-muted-foreground">
                            • {property.address}, {property.city}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cascading Deletions Warning */}
                  <div className="p-4 bg-destructive/10 border-2 border-destructive/20 rounded-lg space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <div className="font-semibold text-destructive">
                          CASCADING DELETIONS
                        </div>
                        <p className="text-sm text-foreground">
                          All data for {clientToShow.properties.length === 1 ? 'this property' : 'these properties'} will be permanently deleted:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                          <li>Tenant applications ({clientToShow.application_count} total)</li>
                          <li>Rent payments & payment history</li>
                          <li>Maintenance requests</li>
                          <li>Lease agreements</li>
                          <li>Property documents & photos</li>
                          <li>Property performance data</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Final Warning */}
                  <div className="flex items-center gap-2 p-3 bg-destructive/5 rounded-md">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                    <p className="text-sm font-semibold text-destructive">
                      This action cannot be undone!
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Delete Everything'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <AlertDialogHeader>
            <AlertDialogTitle>Loading...</AlertDialogTitle>
          </AlertDialogHeader>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};
