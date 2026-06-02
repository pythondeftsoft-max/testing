import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare } from 'lucide-react';

interface AdminVolumeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const AdminVolumeFilter: React.FC<AdminVolumeFilterProps> = ({ value, onChange }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <MessageSquare className="w-4 h-4 mr-2" />
        <SelectValue placeholder="Volume" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Volume</SelectItem>
        <SelectItem value="high">High (&gt;10)</SelectItem>
        <SelectItem value="medium">Medium (5-10)</SelectItem>
        <SelectItem value="low">Low (&lt;5)</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default AdminVolumeFilter;
