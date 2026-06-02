import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ClientPortfolio } from '@/hooks/useClientProperties';

interface EditClientModalProps {
  client: ClientPortfolio | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditClientModal: React.FC<EditClientModalProps> = ({
  client,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  useEffect(() => {
    if (client) {
      setClientName(client.client_name);
      setClientEmail(client.client_email || '');
      setClientPhone(client.client_phone || '');
      setClientNotes(client.client_notes || '');
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }

    if (!client) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('portfolios')
        .update({
          client_name: clientName,
          client_email: clientEmail || null,
          client_phone: clientPhone || null,
          client_notes: clientNotes || null,
        })
        .eq('id', client.id)
        .select()
        .maybeSingle();

      if (!data && !error) {
        throw new Error('Update failed — no rows were modified. You may not have permission.');
      }

      if (error) throw error;

      toast.success('Client details updated successfully');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Failed to update client details');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Client Details</DialogTitle>
          <DialogDescription>
            Update client information and internal notes
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
            <Label htmlFor="clientEmail">Client Email</Label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientPhone">Client Phone</Label>
            <Input
              id="clientPhone"
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(555) 123-4567"
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
                  Updating...
                </>
              ) : (
                'Update Client'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
