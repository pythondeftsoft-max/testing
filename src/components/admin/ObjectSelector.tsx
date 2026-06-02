
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ObjectSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  objects: Array<{
    name: string;
    display_name: string;
    category?: string;
  }>;
  placeholder?: string;
  disabled?: boolean;
}

export const ObjectSelector: React.FC<ObjectSelectorProps> = ({
  value,
  onValueChange,
  objects,
  placeholder = "Select object...",
  disabled = false
}) => {
  console.log('ObjectSelector rendered:', { value, objects: objects?.length, disabled });

  // Filter out invalid objects and group by category
  const validObjects = objects?.filter(obj => obj?.name && obj.name.trim() !== '') || [];
  
  const groupedObjects = validObjects.reduce((acc, obj) => {
    const category = obj.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(obj);
    return acc;
  }, {} as Record<string, typeof validObjects>);

  console.log('ObjectSelector grouped objects:', groupedObjects);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">All Objects</SelectItem>
        {Object.entries(groupedObjects).map(([category, categoryObjects]) => (
          <React.Fragment key={category}>
            {categoryObjects.map((obj) => (
              <SelectItem key={obj.name} value={obj.name}>
                {obj.display_name || obj.name}
              </SelectItem>
            ))}
          </React.Fragment>
        ))}
      </SelectContent>
    </Select>
  );
};
