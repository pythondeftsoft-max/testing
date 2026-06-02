
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolioPoints } from '@/hooks/usePortfolioPoints';
import { Award } from 'lucide-react';

interface AwardPointsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
}

const AwardPointsDialog = ({ isOpen, onClose, portfolioId }: AwardPointsDialogProps) => {
  const { awardPoints } = usePortfolioPoints(portfolioId);
  const [formData, setFormData] = useState({
    source_event_type: '',
    points_awarded: '',
    notes: '',
  });

  const eventTypes = [
    { value: 'rent_payment', label: 'Rent Payment' },
    { value: 'lease_renewal', label: 'Lease Renewal' },
    { value: 'maintenance_completion', label: 'Maintenance Completion' },
    { value: 'tenant_referral', label: 'Tenant Referral' },
    { value: 'property_improvement', label: 'Property Improvement' },
    { value: 'occupancy_milestone', label: 'Occupancy Milestone' },
    { value: 'manual_adjustment', label: 'Manual Adjustment' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.source_event_type || !formData.points_awarded) {
      return;
    }

    try {
      await awardPoints.mutateAsync({
        portfolio_id: portfolioId,
        source_event_type: formData.source_event_type,
        points_awarded: parseFloat(formData.points_awarded),
        notes: formData.notes || undefined,
      });

      setFormData({
        source_event_type: '',
        points_awarded: '',
        notes: '',
      });
      onClose();
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      source_event_type: '',
      points_awarded: '',
      notes: '',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Award Portfolio Points
          </DialogTitle>
          <DialogDescription>
            Manually award points to this portfolio for specific achievements or events.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-type">Event Type</Label>
            <Select
              value={formData.source_event_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, source_event_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">Points to Award</Label>
            <Input
              id="points"
              type="number"
              min="1"
              step="0.01"
              value={formData.points_awarded}
              onChange={(e) => setFormData(prev => ({ ...prev, points_awarded: e.target.value }))}
              placeholder="Enter points amount"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes about this point award..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={awardPoints.isPending || !formData.source_event_type || !formData.points_awarded}
            >
              {awardPoints.isPending ? 'Awarding...' : 'Award Points'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AwardPointsDialog;
