import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedAdminActions } from '@/hooks/useEnhancedAdminActions';
import { RotateCcw, Building2, Clock, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface RestorePropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeletedProperty {
  id: string;
  original_property_id: string;
  property_data: any;
  deleted_at: string;
  deleted_by: string;
  deleted_by_name?: string;
}

export const RestorePropertiesModal: React.FC<RestorePropertiesModalProps> = ({
  isOpen,
  onClose
}) => {
  const { toast } = useToast();
  const { restoreProperty, isLoading } = useEnhancedAdminActions();
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  // Fetch deleted properties
  const { data: deletedProperties = [], isLoading: fetchLoading, refetch } = useQuery({
    queryKey: ['deleted-properties'],
    queryFn: async (): Promise<DeletedProperty[]> => {
      const { data, error } = await supabase
        .from('deleted_properties')
        .select(`
          id,
          original_property_id,
          property_data,
          deleted_at,
          deleted_by,
          restored_at
        `)
        .is('restored_at', null)
        .order('deleted_at', { ascending: false });
      
      if (error) throw error;
      
      // Enrich with user names
      const userIds = [...new Set(data.map(p => p.deleted_by).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);
        
        return data.map(property => ({
          ...property,
          deleted_by_name: users?.find(u => u.id === property.deleted_by)
            ? `${users.find(u => u.id === property.deleted_by)?.first_name} ${users.find(u => u.id === property.deleted_by)?.last_name}`
            : 'Unknown User'
        }));
      }
      
      return data;
    },
    enabled: isOpen
  });

  const handlePropertySelect = (propertyId: string) => {
    if (selectedProperties.includes(propertyId)) {
      setSelectedProperties(prev => prev.filter(id => id !== propertyId));
    } else {
      setSelectedProperties(prev => [...prev, propertyId]);
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedProperties.length === 0) return;

    try {
      for (const recordId of selectedProperties) {
        const deletedProperty = deletedProperties.find(p => p.id === recordId);
        if (deletedProperty) {
          await restoreProperty.mutateAsync({
            propertyId: deletedProperty.original_property_id,
            reason: 'Batch restore from admin panel'
          });
        }
      }

      toast({
        title: "Properties Restored",
        description: `Successfully restored ${selectedProperties.length} properties.`
      });

      setSelectedProperties([]);
      refetch();
    } catch (error: any) {
      console.error('Restore failed:', error);
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore properties. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatPropertyAddress = (propertyData: any) => {
    return propertyData?.address || propertyData?.street_1 || 'Unknown Address';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Restore Deleted Properties
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {deletedProperties.length} deleted properties available for restoration
            </p>
            {selectedProperties.length > 0 && (
              <Badge variant="secondary">
                {selectedProperties.length} selected
              </Badge>
            )}
          </div>

          {/* Properties List */}
          <ScrollArea className="h-96">
            {fetchLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : deletedProperties.length > 0 ? (
              <div className="space-y-3">
                {deletedProperties.map((property) => (
                  <Card key={property.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedProperties.includes(property.id)}
                          onCheckedChange={() => handlePropertySelect(property.id)}
                        />
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              <span className="font-medium">
                                {formatPropertyAddress(property.property_data)}
                              </span>
                            </div>
                            <Badge variant="outline">
                              {property.property_data?.property_type || 'Unknown Type'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Deleted: {formatDate(property.deleted_at)}
                            </div>
                            {property.deleted_by_name && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                By: {property.deleted_by_name}
                              </div>
                            )}
                          </div>
                          
                          {property.property_data?.monthly_rent && (
                            <div className="text-sm">
                              <span className="font-medium">
                                ${property.property_data.monthly_rent.toLocaleString()}/month
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No deleted properties found</p>
              </div>
            )}
          </ScrollArea>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {selectedProperties.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Restore {selectedProperties.length} Properties
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Restoration</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to restore {selectedProperties.length} deleted properties. 
                      They will become visible and accessible again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestoreSelected} disabled={isLoading}>
                      Restore Properties
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};