import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Flag } from 'lucide-react';

interface AdminFlaggedFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const AdminFlaggedFilter: React.FC<AdminFlaggedFilterProps> = ({ value, onChange }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <Flag className="w-4 h-4 mr-2" />
        <SelectValue placeholder="Flagged" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Messages</SelectItem>
        <SelectItem value="clean">Clean Only</SelectItem>
        <SelectItem value="flagged">Flagged Only</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default AdminFlaggedFilter;
