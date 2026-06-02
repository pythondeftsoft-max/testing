import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Table } from 'lucide-react';

interface ViewToggleProps {
  view: 'card' | 'table';
  onViewChange: (view: 'card' | 'table') => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ view, onViewChange }) => {
  return (
    <div className="flex gap-1 bg-muted p-1 rounded-lg">
      <Button
        variant={view === 'card' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('card')}
        className="gap-2"
      >
        <LayoutGrid className="h-4 w-4" />
        Cards
      </Button>
      <Button
        variant={view === 'table' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('table')}
        className="gap-2"
      >
        <Table className="h-4 w-4" />
        Table
      </Button>
    </div>
  );
};
