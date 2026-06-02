import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';

interface AdminMessageSortProps {
  value: string;
  onChange: (value: string) => void;
}

const AdminMessageSort: React.FC<AdminMessageSortProps> = ({ value, onChange }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <ArrowUpDown className="w-4 h-4 mr-2" />
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="recent">Most Recent</SelectItem>
        <SelectItem value="oldest">Oldest First</SelectItem>
        <SelectItem value="messages">Most Messages</SelectItem>
        <SelectItem value="flagged">Most Flagged</SelectItem>
        <SelectItem value="unread">Most Unread</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default AdminMessageSort;
