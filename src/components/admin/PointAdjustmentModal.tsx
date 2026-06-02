
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, AlertCircle } from 'lucide-react';
import { AdminUser } from '@/hooks/useAdminUsersDirectory';
import { useAdminPointsManagement } from '@/hooks/useAdminPointsManagement';
import { toast } from 'sonner';

interface PointAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  currentPoints?: number;
}

const PointAdjustmentModal = ({ 
  isOpen, 
  onClose, 
  user, 
  currentPoints = 0,
}: PointAdjustmentModalProps) => {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add');
  const [pointsAmount, setPointsAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const { adjustUserPoints, isAdjusting } = useAdminPointsManagement();

  const handleSubmit = async () => {
    if (!user || !pointsAmount || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    const points = parseInt(pointsAmount);
    if (isNaN(points) || points <= 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    try {
      await adjustUserPoints.mutateAsync({
        userId: user.id,
        pointsChange: points,
        reason,
        notes,
        adjustmentType,
      });
      toast.success(`Points ${adjustmentType === 'add' ? 'added' : adjustmentType === 'subtract' ? 'subtracted' : 'set'} successfully`);

      onClose();
      resetForm();
    } catch (error) {
      toast.error('Failed to adjust points. Please try again.');
    }
  };

  const resetForm = () => {
    setAdjustmentType('add');
    setPointsAmount('');
    setReason('');
    setNotes('');
  };

  const getNewBalance = () => {
    const points = parseInt(pointsAmount) || 0;
    if (adjustmentType === 'add') return currentPoints + points;
    if (adjustmentType === 'subtract') return Math.max(0, currentPoints - points);
    if (adjustmentType === 'set') return points;
    return currentPoints;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Adjust User Points
          </DialogTitle>
        </DialogHeader>

        {user && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <div className="font-medium">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">Current Points: {currentPoints}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Adjustment Form */}
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Adjust user points by adding, subtracting, or setting the balance.
              </div>

              <div>
                <Label htmlFor="adjustment-type">Adjustment Type</Label>
                <Select value={adjustmentType} onValueChange={(value: 'add' | 'subtract' | 'set') => setAdjustmentType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Points</SelectItem>
                    <SelectItem value="subtract">Subtract Points</SelectItem>
                    <SelectItem value="set">Set Points Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="points-amount">Points Amount</Label>
                <Input
                  id="points-amount"
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder="Enter points amount"
                  min="1"
                />
              </div>

              <div>
                <Label htmlFor="reason">Reason *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason for adjustment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="correction">Balance Correction</SelectItem>
                    <SelectItem value="bonus">Performance Bonus</SelectItem>
                    <SelectItem value="penalty">Penalty/Deduction</SelectItem>
                    <SelectItem value="migration">Data Migration</SelectItem>
                    <SelectItem value="manual">Manual Adjustment</SelectItem>
                    <SelectItem value="compensation">Compensation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes for this adjustment"
                  rows={3}
                />
              </div>

              {/* Preview */}
              {pointsAmount && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-800">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Preview</span>
                  </div>
                  <div className="mt-2 text-sm text-blue-700">
                    Current Balance: {currentPoints} → New Balance: {getNewBalance()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!user || !pointsAmount || !reason || isAdjusting}
          >
            {isAdjusting ? 'Processing...' : 'Confirm Adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PointAdjustmentModal;
