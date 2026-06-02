import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface AdminTimeRangeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const AdminTimeRangeFilter: React.FC<AdminTimeRangeFilterProps> = ({ value, onChange }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <Calendar className="w-4 h-4 mr-2" />
        <SelectValue placeholder="Time Range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Time</SelectItem>
        <SelectItem value="24h">Last 24 hours</SelectItem>
        <SelectItem value="7d">Last 7 days</SelectItem>
        <SelectItem value="30d">Last 30 days</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default AdminTimeRangeFilter;
