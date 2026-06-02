import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Building, Plus, Trash2 } from 'lucide-react';
import { useAutopay } from '@/hooks/useAutopay';
import { AddPaymentMethodModal } from '@/components/AddPaymentMethodModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PaymentMethodsManager() {
  const [showAddModal, setShowAddModal] = useState(false);
  const { 
    paymentMethods, 
    loading, 
    deletePaymentMethod,
    refreshData 
  } = useAutopay();

  const handlePaymentMethodAdded = () => {
    refreshData();
    setShowAddModal(false);
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    await deletePaymentMethod(paymentMethodId);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Manage your saved payment methods for autopay
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Payment Method
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Payment Methods</h3>
              <p className="text-muted-foreground mb-4">
                Add a payment method to set up autopay for your rent
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Payment Method
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <Card key={method.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {method.type === 'card' ? (
                          <CreditCard className="h-5 w-5 text-primary" />
                        ) : (
                          <Building className="h-5 w-5 text-primary" />
                        )}
                        <div>
                          <p className="font-medium">
                            {method.type === 'card' ? 'Card' : 'Bank Account'} 
                            ending in {method.last_four}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {method.brand}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {method.is_default && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this payment method? This action cannot be undone.
                                Any active autopay schedules using this method will be paused.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePaymentMethod(method.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddPaymentMethodModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handlePaymentMethodAdded}
      />
    </>
  );
}