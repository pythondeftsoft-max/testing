import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SavedReportConfig } from '@/hooks/useSavedReports';

interface SaveCustomReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  reportConfig: SavedReportConfig;
  onSaveSuccess?: () => void;
}

export const SaveCustomReportDialog: React.FC<SaveCustomReportDialogProps> = ({
  open,
  onOpenChange,
  userId,
  reportConfig,
  onSaveSuccess,
}) => {
  const [reportName, setReportName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!reportName.trim()) {
      toast.error('Please enter a report name');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from('custom_reports').insert({
        name: reportName.trim(),
        description: description.trim() || null,
        config: reportConfig as any,
        user_id: userId,
      });

      if (error) throw error;

      toast.success('Report saved successfully');
      setReportName('');
      setDescription('');
      onOpenChange(false);
      onSaveSuccess?.();
    } catch (error) {
      console.error('Error saving custom report:', error);
      toast.error('Failed to save report. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Custom Report</DialogTitle>
          <DialogDescription>
            Save this report configuration to easily run it again in the future.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="report-name">Report Name *</Label>
            <Input
              id="report-name"
              placeholder="e.g., Monthly Income Statement Q1 2025"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add notes about this report configuration..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
