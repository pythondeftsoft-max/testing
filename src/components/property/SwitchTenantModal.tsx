import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SwitchTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { newTenantEmail: string; reason: string }) => void;
  propertyAddress: string;
  currentTenantInfo?: {
    tenant_name: string;
    tenant_email: string;
  };
  isLoading?: boolean;
}

export const SwitchTenantModal: React.FC<SwitchTenantModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  propertyAddress,
  currentTenantInfo,
  isLoading = false
}) => {
  const [newTenantEmail, setNewTenantEmail] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantEmail.trim()) return;

    onSubmit({
      newTenantEmail: newTenantEmail.trim(),
      reason: reason.trim() || 'Admin tenant switch'
    });
  };

  const handleClose = () => {
    setNewTenantEmail('');
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Switch Tenant</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Property</Label>
            <p className="text-sm">{propertyAddress}</p>
          </div>

          {currentTenantInfo && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Current Tenant</Label>
              <p className="text-sm">{currentTenantInfo.tenant_name}</p>
              <p className="text-xs text-muted-foreground">{currentTenantInfo.tenant_email}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="newTenantEmail">New Tenant Email *</Label>
              <Input
                id="newTenantEmail"
                type="email"
                value={newTenantEmail}
                onChange={(e) => setNewTenantEmail(e.target.value)}
                placeholder="Enter new tenant's email address"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                The new tenant must already have an account in the system
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Reason for Switch</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional: Explain why the tenant is being switched"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newTenantEmail.trim() || isLoading}
                className="flex-1"
              >
                {isLoading ? "Switching..." : "Switch Tenant"}
              </Button>
            </div>
          </form>

          <div className="text-xs text-muted-foreground bg-amber-50 p-3 rounded border border-amber-200">
            <strong>Warning:</strong> This will immediately cancel the current tenant's application 
            and approve the new tenant. This action cannot be undone.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};