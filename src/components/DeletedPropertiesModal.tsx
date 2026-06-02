import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { RotateCcw, Trash2, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DeletedPropertiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  portfolioId?: string;
  onPropertiesRestored?: () => void;
}

interface DeletedProperty {
  id: string;
  address: string;
  deleted_at: string;
  portfolio_id: string | null;
  property_type: string;
  monthly_rent: number;
  status: string;
}

export function DeletedPropertiesModal({ 
  open, 
  onOpenChange, 
  userId, 
  portfolioId,
  onPropertiesRestored 
}: DeletedPropertiesModalProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [showRestoreAllDialog, setShowRestoreAllDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch deleted properties
  const { data: deletedProperties = [], isLoading, refetch } = useQuery({
    queryKey: ['deleted-properties', userId, portfolioId],
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select('id, address, deleted_at, portfolio_id, property_type, monthly_rent, status')
        .not('deleted_at', 'is', null)
        .eq('owner_id', userId)
        .order('deleted_at', { ascending: false });

      // Filter by portfolio if not viewing "everything"
      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DeletedProperty[];
    },
    enabled: open && !!userId,
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Force refetch when component mounts
  });

  // Refetch deleted properties whenever modal opens
  useEffect(() => {
    if (open && userId) {
      console.log('Trash modal opened - refetching deleted properties');
      refetch();
    }
  }, [open, userId, refetch]);

  const handleRestore = async (propertyId: string, address: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ deleted_at: null })
        .eq('id', propertyId)
        .eq('owner_id', userId);

      if (error) throw error;

      toast({
        title: "Property Restored",
        description: `${address} has been successfully restored.`,
      });

      refetch();
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
      onPropertiesRestored?.();
    } catch (error) {
      console.error('Error restoring property:', error);
      toast({
        title: "Error",
        description: "Failed to restore property. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePermanentDelete = async (propertyId: string, address: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId)
        .eq('owner_id', userId);

      if (error) throw error;

      toast({
        title: "Property Permanently Deleted",
        description: `${address} and all related data have been permanently removed.`,
      });

      refetch();
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
      setConfirmDeleteId(null);
      setSelectedAddress("");
    } catch (error) {
      console.error('Error permanently deleting property:', error);
      toast({
        title: "Error",
        description: "Failed to delete property permanently. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openDeleteConfirmation = (propertyId: string, address: string) => {
    setConfirmDeleteId(propertyId);
    setSelectedAddress(address);
  };

  const handleRestoreAll = async () => {
    setIsBulkProcessing(true);
    try {
      const propertyIds = deletedProperties.map(p => p.id);
      
      const { error } = await supabase
        .from('properties')
        .update({ deleted_at: null })
        .in('id', propertyIds)
        .eq('owner_id', userId);

      if (error) throw error;

      toast({
        title: "All Properties Restored",
        description: `Successfully restored ${propertyIds.length} ${propertyIds.length === 1 ? 'property' : 'properties'}.`,
      });

      refetch();
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
      onPropertiesRestored?.();
      setShowRestoreAllDialog(false);
    } catch (error) {
      console.error('Error restoring all properties:', error);
      toast({
        title: "Error",
        description: "Failed to restore all properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsBulkProcessing(true);
    try {
      const propertyIds = deletedProperties.map(p => p.id);
      const results = {
        succeeded: [] as string[],
        failed: [] as Array<{ id: string; address: string; error: string }>
      };

      // Delete properties one by one to capture individual errors
      for (const property of deletedProperties) {
        try {
          const { error } = await supabase
            .from('properties')
            .delete()
            .eq('id', property.id)
            .eq('owner_id', userId);

          if (error) throw error;
          results.succeeded.push(property.id);
        } catch (error: any) {
          results.failed.push({
            id: property.id,
            address: property.address,
            error: error.message || 'Unknown error'
          });
        }
      }

      // Show results
      if (results.succeeded.length > 0) {
        toast({
          title: "Properties Deleted",
          description: `Successfully deleted ${results.succeeded.length} of ${propertyIds.length} properties.`,
        });
      }

      if (results.failed.length > 0) {
        console.error('Failed deletions:', results.failed);
        toast({
          title: "Some Deletions Failed",
          description: `${results.failed.length} properties could not be deleted. Check console for details.`,
          variant: "destructive",
        });
      }

      // Refresh list regardless
      refetch();
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
      
      // Only close dialog if all succeeded
      if (results.failed.length === 0) {
        setShowDeleteAllDialog(false);
      }
    } catch (error) {
      console.error('Error deleting properties:', error);
      toast({
        title: "Error",
        description: "Failed to delete properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Deleted Properties</DialogTitle>
            <DialogDescription>
              Restore or permanently delete properties from your trash
            </DialogDescription>
          </DialogHeader>

          {deletedProperties.length > 0 && (
            <div className="flex gap-2 pb-4 border-b">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRestoreAllDialog(true)}
                className="bg-success/10 border-success/20 hover:bg-success/20 text-success hover:text-success"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Restore All ({deletedProperties.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteAllDialog(true)}
                className="border-destructive/20 hover:bg-destructive/10 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete All ({deletedProperties.length})
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : deletedProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Deleted Properties</h3>
                <p className="text-sm text-muted-foreground">
                  Your trash is empty. Deleted properties will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Showing {deletedProperties.length} deleted {deletedProperties.length === 1 ? 'property' : 'properties'}
                </p>
                {deletedProperties.map((property) => (
                  <div
                    key={property.id}
                    className="flex items-start justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium mb-1 truncate">{property.address}</h4>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {property.property_type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          ${property.monthly_rent?.toLocaleString()}/mo
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Deleted {formatDistanceToNow(new Date(property.deleted_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(property.id, property.address)}
                        className="bg-success/10 border-success/20 hover:bg-success/20 text-success hover:text-success"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDeleteConfirmation(property.id, property.address)}
                        className="border-destructive/20 hover:bg-destructive/10 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Property?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will permanently delete <strong>{selectedAddress}</strong> and all related data including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Units and unit details</li>
                <li>Lease agreements</li>
                <li>Rent payments</li>
                <li>Maintenance requests</li>
                <li>Applications</li>
                <li>Documents and photos</li>
              </ul>
              <p className="font-semibold text-destructive">
                This action CANNOT be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && handlePermanentDelete(confirmDeleteId, selectedAddress)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRestoreAllDialog} onOpenChange={setShowRestoreAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore All Properties?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to restore <strong>{deletedProperties.length} {deletedProperties.length === 1 ? 'property' : 'properties'}</strong>
                {portfolioId && portfolioId !== 'everything' 
                  ? ' from this portfolio' 
                  : ' from all portfolios'}.
              </p>
              <p>
                {portfolioId && portfolioId !== 'everything' 
                  ? 'These properties will be restored to this portfolio and reappear in your properties list.'
                  : 'These properties will be restored to their respective portfolios and reappear in your properties list.'}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreAll}
              disabled={isBulkProcessing}
              className="bg-success text-white hover:bg-success/90"
            >
              {isBulkProcessing ? 'Restoring...' : `Restore All (${deletedProperties.length})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete All Properties?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to <strong className="text-destructive">permanently delete {deletedProperties.length} {deletedProperties.length === 1 ? 'property' : 'properties'}</strong>
                {portfolioId && portfolioId !== 'everything' 
                  ? ' from this portfolio' 
                  : ' from all portfolios'}.
              </p>
              <p>
                This will remove all related data including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All units and unit details</li>
                <li>All lease agreements</li>
                <li>All rent payments</li>
                <li>All maintenance requests</li>
                <li>All applications</li>
                <li>All documents and photos</li>
              </ul>
              <p className="font-bold text-destructive">
                This action CANNOT be undone. All {deletedProperties.length} {deletedProperties.length === 1 ? 'property' : 'properties'} and their data will be permanently removed from the database.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isBulkProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkProcessing ? 'Deleting...' : `Delete All Permanently (${deletedProperties.length})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
