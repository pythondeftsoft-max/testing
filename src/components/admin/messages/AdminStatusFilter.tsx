import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText } from 'lucide-react';

interface AdminStatusFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const AdminStatusFilter: React.FC<AdminStatusFilterProps> = ({ value, onChange }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <FileText className="w-4 h-4 mr-2" />
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Status</SelectItem>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="under_review">Under Review</SelectItem>
        <SelectItem value="approved">Approved</SelectItem>
        <SelectItem value="rejected">Rejected</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default AdminStatusFilter;
