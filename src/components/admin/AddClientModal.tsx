import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AddClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  adminUserId: string;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  adminUserId,
}) => {
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }

    if (!clientEmail.trim()) {
      toast.error('Please enter a client email');
      return;
    }

    if (!clientPhone.trim()) {
      toast.error('Please enter a client phone number');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('portfolios')
        .insert({
          manager_id: adminUserId,
          client_name: clientName,
          client_email: clientEmail || null,
          client_phone: clientPhone || null,
          client_notes: clientNotes || null,
        });

      if (error) throw error;

      toast.success('Client added successfully');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setClientNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Client</DialogTitle>
          <DialogDescription>
            Create a new client portfolio. Contact information is required for managing their property listings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">
              Client Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientEmail">
              Client Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientPhone">
              Client Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="clientPhone"
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(555) 123-4567"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientNotes">Internal Notes</Label>
            <Textarea
              id="clientNotes"
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="Add internal notes about this client..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Client'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
