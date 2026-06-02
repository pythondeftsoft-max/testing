import React, { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetSelectionDialog } from '@/components/analytics/WidgetSelectionDialog';
import { MockDataSection } from '@/utils/mockFinancialReports';

// Legacy WidgetType for backward compatibility
export interface WidgetType {
  id: string;
  name: string;
  description: string;
  category: MockDataSection;
  icon: React.ComponentType<{ className?: string }>;
}

interface GenerateMoreWidgetsButtonProps {
  category: MockDataSection | MockDataSection[];
  onApplySelection: (selectedWidgets: string[]) => void;
  currentVisibleWidgets: string[];
  className?: string;
}

export const GenerateMoreWidgetsButton: React.FC<GenerateMoreWidgetsButtonProps> = ({
  category,
  onApplySelection,
  currentVisibleWidgets,
  className = '',
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className={`text-primary hover:bg-primary/10 border-primary/20 ${className}`}
      >
        <Settings2 className="h-4 w-4 mr-1" />
        Manage Widgets
      </Button>
      
      <WidgetSelectionDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        category={category}
        onApplySelection={onApplySelection}
        currentVisibleWidgets={currentVisibleWidgets}
      />
    </>
  );
};